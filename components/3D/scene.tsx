/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Sky } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Copy, Check } from 'phosphor-react';

gsap.registerPlugin(useGSAP);
import { usePhysicsStore } from '../../services/physicsStore';
import { JellyBox } from './WiggleCube';
import FluidDistortionEffect from './FluidDistortionEffect';
import AnimatedCounter from '../Core/AnimatedCounter';
import { playSound } from '../../services/soundService';

const PhysicsCube = ({ color, position, id, onDragStart, onDragEnd }: { color: string; position: [number, number, number]; id: string; onDragStart?: () => void; onDragEnd?: () => void }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const jellyRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pointerPos = useRef(new THREE.Vector3());
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());

  const worldHitStart = useRef(new THREE.Vector3());
  const localHitPoint = useRef(new THREE.Vector3());
  const localDragOffset = useRef(new THREE.Vector3());

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    onDragStart?.();
    e.target.setPointerCapture(e.pointerId);

    // Save world coordinates of pickup hit point
    worldHitStart.current.copy(e.point);

    // Compute local-space intersection
    if (groupRef.current) {
      const localHit = groupRef.current.worldToLocal(e.point.clone());
      localHitPoint.current.copy(localHit);
    }
    localDragOffset.current.set(0, 0, 0);

    const camera = e.camera;
    const planeNormal = new THREE.Vector3().subVectors(camera.position, e.point).normalize();
    dragPlane.current.setFromNormalAndCoplanarPoint(planeNormal, e.point);
    
    const currentPos = rigidBodyRef.current?.translation();
    if (currentPos) {
      dragOffset.current.set(currentPos.x - e.point.x, currentPos.y - e.point.y, currentPos.z - e.point.z);
    }

    // Interactive pointerdown click-based ripple deformation
    const clickNormal = e.face ? e.face.normal.clone() : new THREE.Vector3(0, 1, 0);
    if (groupRef.current && e.face) {
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(groupRef.current.matrixWorld);
      clickNormal.applyMatrix3(normalMatrix).normalize();
    }
    jellyRef.current?.triggerImpact(e.point, clickNormal, 1.2);
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    setIsDragging(false);
    onDragEnd?.();
    if (e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }
    
    // UI: Clear velocities on release to prevent physical explosions
    rigidBodyRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rigidBodyRef.current?.setAngvel({ x: 0, y: 0, z: 0 }, true);
  };

  useFrame((state) => {
    // Track pointer position NDC
    pointerPos.current.set(state.pointer.x, state.pointer.y, 0);

    if (isDragging && rigidBodyRef.current) {
      const intersection = new THREE.Vector3();
      if (state.raycaster.ray.intersectPlane(dragPlane.current, intersection)) {
        const targetPos = intersection.clone().add(dragOffset.current);
        
        // PHYSICAL CLAMPING: Prevent the cube from going below the floor surface
        const floorY = -1.5;
        const halfSize = 0.5;
        targetPos.y = Math.max(targetPos.y, floorY + halfSize);
        
        rigidBodyRef.current.setNextKinematicTranslation(targetPos);

        // Compute local-space cursor drag offset
        const worldDragVec = intersection.clone().sub(worldHitStart.current);
        if (groupRef.current) {
          const rotMatrix = new THREE.Matrix4().extractRotation(groupRef.current.matrixWorld);
          const invRotMatrix = rotMatrix.invert();
          const localDrag = worldDragVec.clone().applyMatrix4(invRotMatrix);
          localDragOffset.current.copy(localDrag);
        }
      }
    }
  });

  // Use a ref for the initial position to avoid jumping on re-renders when type changes
  const initialPos = useMemo(() => position, []);

  return (
      <RigidBody 
        ref={rigidBodyRef} 
        position={initialPos} 
        type={isDragging ? "kinematicPosition" : "dynamic"}
        colliders="cuboid" 
        restitution={0.7}
        friction={0.5}
        ccd={true}
        canSleep={!isDragging}
        name={`cube-${id}`}
        onCollisionEnter={({ manifold, flipped }) => {
          if (!manifold) return;
          const numContacts = manifold.numSolverContacts();
          if (numContacts > 0) {
            const pt = manifold.solverContactPoint(0);
            const norm = manifold.normal();
            
            const worldPoint = new THREE.Vector3(pt.x, pt.y, pt.z);
            const worldNormal = new THREE.Vector3(norm.x, norm.y, norm.z);
            if (flipped) {
              worldNormal.negate();
            }

            // Calculate impact intensity based on linear velocity
            const linvel = rigidBodyRef.current?.linvel() || { x: 0, y: 0, z: 0 };
            const speed = Math.sqrt(linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z);
            
            // Scaled impact intensity (clamped between 0.2 and 1.5)
            const intensity = Math.min(Math.max(speed * 0.12, 0.2), 1.5);

            // Trigger physical deform ripple in shader
            jellyRef.current?.triggerImpact(worldPoint, worldNormal, intensity);

            // Play collision sound
            playSound('impact', intensity);
          }
        }}
      >
        <group
          ref={groupRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <JellyBox 
            ref={jellyRef}
            rigidBody={rigidBodyRef}
            pointerPos={pointerPos.current}
            color={color} 
            isDragging={isDragging}
            localHitPoint={localHitPoint.current}
            localDragOffset={localDragOffset.current}
          />
        </group>
      </RigidBody>
  );
};

const Floor = () => (
  <RigidBody type="fixed" position={[0, -2, 0]}>
    <mesh receiveShadow>
      <boxGeometry args={[20, 1, 20]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
    </mesh>
  </RigidBody>
);

const RotatingBox = ({ color = '#4f46e5', speed = 1, onDragStart, onDragEnd }: { color?: string; speed?: number; onDragStart?: () => void; onDragEnd?: () => void }) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const jellyRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pointerPos = useRef(new THREE.Vector3());
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());
  const currentTranslation = useRef(new THREE.Vector3(0, 1, 0));

  const worldHitStart = useRef(new THREE.Vector3());
  const localHitPoint = useRef(new THREE.Vector3());
  const localDragOffset = useRef(new THREE.Vector3());

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    onDragStart?.();
    e.target.setPointerCapture(e.pointerId);

    // Save world coordinates of pickup hit point
    worldHitStart.current.copy(e.point);

    // Compute local-space intersection
    if (groupRef.current) {
      const localHit = groupRef.current.worldToLocal(e.point.clone());
      localHitPoint.current.copy(localHit);
    }
    localDragOffset.current.set(0, 0, 0);

    const camera = e.camera;
    const planeNormal = new THREE.Vector3().subVectors(camera.position, e.point).normalize();
    dragPlane.current.setFromNormalAndCoplanarPoint(planeNormal, e.point);
    
    const currentPos = rigidBodyRef.current?.translation();
    if (currentPos) {
      dragOffset.current.set(currentPos.x - e.point.x, currentPos.y - e.point.y, currentPos.z - e.point.z);
    }

    // Interactive pointerdown click-based ripple deformation
    const clickNormal = e.face ? e.face.normal.clone() : new THREE.Vector3(0, 1, 0);
    if (groupRef.current && e.face) {
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(groupRef.current.matrixWorld);
      clickNormal.applyMatrix3(normalMatrix).normalize();
    }
    jellyRef.current?.triggerImpact(e.point, clickNormal, 1.2);
  };

  const handlePointerUp = (e: any) => {
    setIsDragging(false);
    onDragEnd?.();
    e.target.releasePointerCapture(e.pointerId);
  };

  useFrame((state, delta) => {
    // Track pointer position in world space
    pointerPos.current.set(state.pointer.x, state.pointer.y, 0);

    if (rigidBodyRef.current) {
      // LOGIC: Stable rotation accumulation to avoid physical feedback jitter
      rotationRef.current.x += delta * speed * (isDragging ? 2 : 0.8);
      rotationRef.current.y += delta * speed * (isDragging ? 2 : 1);
      rotationRef.current.z += delta * speed * 0.2;
      
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          rotationRef.current.x,
          rotationRef.current.y,
          rotationRef.current.z
        )
      );

      // Translation logic
      if (isDragging) {
        const intersection = new THREE.Vector3();
        if (state.raycaster.ray.intersectPlane(dragPlane.current, intersection)) {
          const targetPos = intersection.clone().add(dragOffset.current);
          
          // PHYSICAL CLAMPING: size=2, halfSize=1. Floor at -1.5
          const floorY = -1.5;
          const halfSize = 1.0; 
          targetPos.y = Math.max(targetPos.y, floorY + halfSize);
          
          currentTranslation.current.copy(targetPos);

          // Compute local-space cursor drag offset
          const worldDragVec = intersection.clone().sub(worldHitStart.current);
          if (groupRef.current) {
            const rotMatrix = new THREE.Matrix4().extractRotation(groupRef.current.matrixWorld);
            const invRotMatrix = rotMatrix.invert();
            const localDrag = worldDragVec.clone().applyMatrix4(invRotMatrix);
            localDragOffset.current.copy(localDrag);
          }
        }
      } else {
        // Return to resting position smoothly
        currentTranslation.current.lerp(new THREE.Vector3(0, 1, 0), 0.1);
      }
      
      // SYNC: Smooth kinematic updates
      rigidBodyRef.current.setNextKinematicTranslation(currentTranslation.current);
      rigidBodyRef.current.setNextKinematicRotation(quat);
    }
  });

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      type="kinematicPosition" 
      position={[0, 1, 0]} 
      colliders="cuboid"
      ccd={true}
      onCollisionEnter={({ manifold, flipped, other }) => {
        if (!manifold) return;
        const numContacts = manifold.numSolverContacts();
        if (numContacts > 0) {
          const pt = manifold.solverContactPoint(0);
          const norm = manifold.normal();
          
          const worldPoint = new THREE.Vector3(pt.x, pt.y, pt.z);
          const worldNormal = new THREE.Vector3(norm.x, norm.y, norm.z);
          if (flipped) {
            worldNormal.negate();
          }

          // Get velocity of the other body colliding with the rotating box
          let otherSpeed = 3.0; // fallback default
          if (other && other.rigidBody) {
            const otherVel = other.rigidBody.linvel();
            otherSpeed = Math.sqrt(otherVel.x * otherVel.x + otherVel.y * otherVel.y + otherVel.z * otherVel.z);
          }
          
          // Scaled impact intensity (clamped between 0.25 and 1.6)
          const intensity = Math.min(Math.max(otherSpeed * 0.12, 0.25), 1.6);

          // Trigger physical deform ripple in shader
          jellyRef.current?.triggerImpact(worldPoint, worldNormal, intensity);

          // Play collision sound
          playSound('impact', intensity);
        }
      }}
    >
      <group
        ref={groupRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <JellyBox 
          ref={jellyRef}
          rigidBody={rigidBodyRef}
          pointerPos={pointerPos.current}
          color={color} 
          size={2} 
          isDragging={isDragging}
          localHitPoint={localHitPoint.current}
          localDragOffset={localDragOffset.current}
        />
      </group>
    </RigidBody>
  );
};

import { useTheme } from '../../Theme';

const Scene3D: React.FC<{ showSky?: boolean }> = ({ showSky = true }) => {
  const { theme } = useTheme();
  const { cubes, addCube } = usePhysicsStore();
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [fps, setFps] = useState(0);

  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const humanExplanation = 'This is the "Viewport Slot" extension. Use this when you need a fresh, isolated project component in the viewport. To use: Copy these instructions and provide them to the agent when you are ready to generate a new component for the viewport.';
  const agentInstructions = 'Agent Instructions:\n1. Render this component into the /components/staged/ directory.\n2. In /components/Section/Stage.tsx, update the imports to include only the new component.\n3. Remove all other files in /components/staged/ and all references to them in Stage.tsx or other files.\n4. Synchronize controls, code, and console outputs to this new component.';

  const handleCopy = () => {
    navigator.clipboard.writeText(agentInstructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // STYLE: Derived from theme
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: theme.space['Space.L'],
    left: theme.space['Space.L'],
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.S'],
    pointerEvents: 'none',
    zIndex: 10,
  };

  const fpsStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: theme.space['Space.L'],
    right: theme.space['Space.L'],
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#ffffff',
    padding: `${theme.space['Space.XS']} ${theme.space['Space.M']}`,
    borderRadius: '12px',
    ...theme.Type.Readable.Body.M,
    fontSize: '12px',
    pointerEvents: 'none',
    zIndex: 100,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: theme.space['Space.2XS'],
  };

  const buttonStyle: React.CSSProperties = {
    padding: `12px 20px`,
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '14px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    ...theme.Type.Readable.Body.M,
    cursor: 'pointer',
    pointerEvents: 'auto',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let requestId: number;

    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      requestId = requestAnimationFrame(loop);
    };

    requestId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestId);
  }, []);

  const spawnCube = () => {
    const randomColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    addCube({
      id: Math.random().toString(36),
      color: randomColor,
      position: [(Math.random() - 0.5) * 4, 10, (Math.random() - 0.5) * 4],
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative', overflow: 'hidden', background: '#050505' }}>
      <div style={overlayStyle}>
        <button style={buttonStyle} onClick={spawnCube}>
          Spawn Jelly Cube
        </button>
      </div>

      {/* Info Trigger */}
      <button
        onClick={() => setShowDialog(true)}
        style={{
          position: 'absolute',
          top: theme.space['Space.M'],
          right: theme.space['Space.M'],
          width: theme.space['Space.3XL'],
          height: theme.space['Space.3XL'],
          borderRadius: theme.radius['Radius.Full'],
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          color: '#ffffff',
          boxShadow: 'none',
        }}
      >
        <Info size={20} />
      </button>

      {/* Dialog Overlay */}
      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: theme.space['Space.L'],
            }}
            onClick={() => setShowDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{
                backgroundColor: theme.Color.Base.Surface[1],
                borderRadius: theme.radius['Radius.L'],
                padding: theme.space['Space.L'],
                maxWidth: theme.space['Space.Panel.Width'],
                width: '100%',
                position: 'relative',
                boxShadow: theme.effects['Effect.Shadow.Drop.3'],
                ...theme.border.getBorder1px(theme.Color.Base.Content[3]),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  position: 'absolute',
                  top: theme.space['Space.M'],
                  right: theme.space['Space.M'],
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.Color.Base.Content[2],
                }}
              >
                <X size={20} />
              </button>

              <h2 style={{ ...theme.Type.Expressive.Headline.M, color: theme.Color.Base.Content[1], marginBottom: theme.space['Space.M'] }}>
                Viewport Slot
              </h2>
              
              <div style={{ marginBottom: theme.space['Space.L'] }}>
                <p style={{ ...theme.Type.Readable.Body.M, color: theme.Color.Base.Content[1], lineHeight: 1.5, marginBottom: theme.space['Space.S'] }}>
                  {humanExplanation}
                </p>
              </div>

              <div style={{ 
                backgroundColor: theme.Color.Base.Surface[2], 
                padding: theme.space['Space.M'], 
                borderRadius: theme.radius['Radius.M'], 
                border: `1px dashed ${theme.Color.Base.Content[3]}` 
              }}>
                <p style={{ ...theme.Type.Readable.Body.S, color: theme.Color.Base.Content[2], lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {agentInstructions}
                </p>
              </div>

              <button
                onClick={handleCopy}
                style={{
                  width: '100%',
                  padding: theme.space['Space.M'],
                  borderRadius: theme.radius['Radius.M'],
                  backgroundColor: theme.Color.Active.Surface[1],
                  color: theme.Color.Active.Content[1],
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.space['Space.S'],
                  cursor: 'pointer',
                  ...theme.Type.Readable.Body.M,
                  fontWeight: 600,
                }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy Instructions'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Canvas 
        shadows={{ type: THREE.PCFShadowMap }} 
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          powerPreference: 'high-performance'
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={50} />
        <OrbitControls 
          makeDefault 
          enabled={controlsEnabled}
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2.1} 
        />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 10, 5]} angle={0.3} penumbra={1} intensity={1200} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        
        <Physics gravity={[0, -9.81, 0]}>
          <RotatingBox 
            onDragStart={() => setControlsEnabled(false)} 
            onDragEnd={() => setControlsEnabled(true)} 
          />
          {cubes.map((cube) => (
            <PhysicsCube 
              key={cube.id} 
              {...cube} 
              onDragStart={() => setControlsEnabled(false)} 
              onDragEnd={() => setControlsEnabled(true)} 
            />
          ))}
          <Floor />
        </Physics>
        
        {showSky && <Sky sunPosition={[1, 0.2, 1]} />}
        <Environment preset="city" />
        <FluidDistortionEffect />
      </Canvas>
      
      <div style={fpsStyle}>
        <span style={{ opacity: 0.6 }}>FPS</span>
        <AnimatedCounter value={fps} useFormatting={false} />
      </div>
    </div>
  );
};

export default Scene3D;
