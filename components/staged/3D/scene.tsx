/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Sky, useEnvironment } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Copy, Sliders } from 'phosphor-react';
import { AnimatedCheckIcon, Button } from '../../Core';
import { ErrorBoundary } from 'react-error-boundary';
import { EffectComposer, SMAA } from '@react-three/postprocessing';
import { SMAAPreset } from 'postprocessing';
import { FluidDistortion, DISTORTION_FRAG } from './FluidDistortion';
import { Effect } from 'postprocessing';
import { useShaderStore } from '../../../services/shaderStore';
import ShaderControls from '../../Package/ShaderControls';

class DistortionEffectImpl extends Effect {
  constructor(
    fluidTexture: THREE.Texture,
    refractStrength: number,
    dispersionScale: number,
    blurRadius: number,
    jitterStrength: number,
    aspect: number
  ) {
    super('DistortionEffect', DISTORTION_FRAG, {
      uniforms: new Map<string, THREE.Uniform<any>>([
        ['tFluid', new THREE.Uniform(fluidTexture)],
        ['uRefractStrength', new THREE.Uniform(refractStrength)],
        ['uDispersionScale', new THREE.Uniform(dispersionScale)],
        ['uBlurRadius', new THREE.Uniform(blurRadius)],
        ['uJitterStrength', new THREE.Uniform(jitterStrength)],
        ['uAspect', new THREE.Uniform(aspect)],
      ])
    });
  }
}

interface DistortionEffectProps {
  fluidTexture: THREE.Texture;
  refractStrength: number;
  dispersionScale: number;
  blurRadius: number;
  jitterStrength: number;
}

const DistortionEffect = React.forwardRef(({
  fluidTexture,
  refractStrength,
  dispersionScale,
  blurRadius,
  jitterStrength,
}: DistortionEffectProps, ref) => {
  const { size } = useThree();
  const aspect = size.width / Math.max(size.height, 1);

  const effect = useMemo(
    () => new DistortionEffectImpl(fluidTexture, refractStrength, dispersionScale, blurRadius, jitterStrength, aspect),
    []
  );

  useEffect(() => {
    if (effect) {
      if (fluidTexture) {
        const uFluid = effect.uniforms.get('tFluid');
        if (uFluid) uFluid.value = fluidTexture;
      }
      const uRefract = effect.uniforms.get('uRefractStrength');
      if (uRefract) uRefract.value = refractStrength;
      const uDispersion = effect.uniforms.get('uDispersionScale');
      if (uDispersion) uDispersion.value = dispersionScale;
      const uBlur = effect.uniforms.get('uBlurRadius');
      if (uBlur) uBlur.value = blurRadius;
      const uJitter = effect.uniforms.get('uJitterStrength');
      if (uJitter) uJitter.value = jitterStrength;
      const uAsp = effect.uniforms.get('uAspect');
      if (uAsp) uAsp.value = aspect;
    }
  }, [effect, fluidTexture, refractStrength, dispersionScale, blurRadius, jitterStrength, aspect]);

  return <primitive ref={ref} object={effect} />;
});

// Preload the environment map preset to fetch the HDR cubemap asset early
useEnvironment.preload({ preset: 'city' });

gsap.registerPlugin(useGSAP);
import { usePhysicsStore } from '../../../services/physicsStore';
import { JellyBox } from './WiggleCube';
import AnimatedCounter from '../../Core/sub-components/AnimatedCounter';
import { playSound } from '../../../services/soundService';

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
    playSound('grab', 0.8);
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
    playSound('letgo', 0.6);
    if (e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }
    
    // UI: Clear velocities on release to prevent physical explosions
    rigidBodyRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rigidBodyRef.current?.setAngvel({ x: 0, y: 0, z: 0 }, true);
  };
  const timer = useRef<THREE.Timer | null>(null);

  useFrame((state) => {
    if (!timer.current) timer.current = new THREE.Timer();
    timer.current.update();
    const delta = timer.current.getDelta();
    
    // Track pointer position NDC
    pointerPos.current.set(state.pointer.x, state.pointer.y, 0);

    if (isDragging && rigidBodyRef.current) {
      const dt = Math.min(delta, 0.03);
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
      <meshStandardMaterial 
        color="#08080c" 
        roughness={0.2} 
        metalness={0.4}
      />
    </mesh>
  </RigidBody>
);

const RotatingBox = ({ color = '#4f46e5', speed = 1, scale = 2, onDragStart, onDragEnd }: { color?: string; speed?: number; scale?: number; onDragStart?: () => void; onDragEnd?: () => void }) => {
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
    playSound('grab', 0.8);
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
    playSound('letgo', 0.6);
    e.target.releasePointerCapture(e.pointerId);
  };

  const timer = useRef<THREE.Timer | null>(null);

  useFrame((state) => {
    if (!timer.current) timer.current = new THREE.Timer();
    timer.current.update();
    const delta = timer.current.getDelta();

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
          size={scale} 
          isDragging={isDragging}
          localHitPoint={localHitPoint.current}
          localDragOffset={localDragOffset.current}
        />
      </group>
    </RigidBody>
  );
};

import { useTheme } from '../../../Theme';

// Progressive Environment Loader: waits for initial frames and idle state before mounting Environment
const ProgressiveEnvironment: React.FC<{ background?: boolean }> = ({ background = true }) => {
  const [shouldMount, setShouldMount] = useState(false);
  const frameCountRef = useRef(0);

  useFrame(() => {
    if (frameCountRef.current < 2) {
      frameCountRef.current++;
      if (frameCountRef.current === 2) {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            setShouldMount(true);
          }, { timeout: 1000 });
        } else {
          setTimeout(() => {
            setShouldMount(true);
          }, 200);
        }
      }
    }
  });

  return shouldMount ? (
    <Environment 
      preset="city" 
      background={background} 
      resolution={128} 
    />
  ) : null;
};

interface Scene3DProps {
  showSky?: boolean;
  cubeSpeed?: number;
  cubeColor?: string;
  cubeScale?: number;
  ambientIntensity?: number;
  showFps?: boolean;
}

const Scene3D: React.FC<Scene3DProps> = ({ 
  showSky = true,
  cubeSpeed = 1,
  cubeColor = '#4f46e5',
  cubeScale = 2,
  ambientIntensity = 0.25,
  showFps = true,
}) => {
  const { theme, themeName } = useTheme();
  const { cubes, addCube } = usePhysicsStore();
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [fps, setFps] = useState(0);

  const [showDialog, setShowDialog] = useState(false);
  const humanExplanation = 'This is the "Viewport Slot" extension. Use this when you need a fresh, isolated project component in the viewport. To use: Copy these instructions and provide them to the agent when you are ready to generate a new component for the viewport.';
  const agentInstructions = 'Agent Instructions:\n1. Render this component into the /components/staged/ directory.\n2. In /components/Section/Stage.tsx, update the imports to include only the new component.\n3. Remove all other files in /components/staged/ and all references to them in Stage.tsx or other files.\n4. Synchronize controls, code, and console outputs to this new component.';

  const fallbackCopy = (text: string): boolean => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    }
  };

  const handleCopy = () => {
    const text = agentInstructions;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .catch((err) => {
          console.warn('Clipboard write failed, trying fallback:', err);
          fallbackCopy(text);
        });
    } else {
      fallbackCopy(text);
    }
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
    const timer = new THREE.Timer();
    let frameCount = 0;
    let lastTime = 0;
    let requestId: number;

    const loop = (timestamp: number) => {
      timer.update(timestamp);
      frameCount++;
      const now = timer.getElapsed();
      
      // Update FPS every second
      if (now >= lastTime + 1) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      requestId = requestAnimationFrame(loop);
    };

    requestId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestId);
  }, []);

  const [showShaderPanel, setShowShaderPanel] = useState(false);
  const shaderParams = useShaderStore((state) => state.params);

  const spawnCube = () => {
    // Use the active cubeColor prop for newly spawned cubes
    addCube({
      id: Math.random().toString(36),
      color: cubeColor,
      position: [(Math.random() - 0.5) * 4, 10, (Math.random() - 0.5) * 4],
    });
    playSound('spawn', 0.85);
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative', overflow: 'hidden', background: '#050505' }}>
      <div style={overlayStyle}>
        <motion.button 
          style={buttonStyle} 
          onClick={spawnCube}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.25)' }}
          whileTap={{ scale: 0.95 }}
        >
          Spawn Jelly Cube
        </motion.button>
      </div>

      {/* Top Right Action Buttons */}
      <div style={{ position: 'absolute', top: theme.space['Space.M'], right: theme.space['Space.M'], display: 'flex', gap: theme.space['Space.S'], zIndex: 50 }}>
        {/* Shader Controls Trigger */}
        <motion.button
          onClick={() => setShowShaderPanel((prev) => !prev)}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.25)' }}
          whileTap={{ scale: 0.95 }}
          title="Toggle Shader Optics Sliders"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: showShaderPanel ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
          }}
        >
          <Sliders size={20} />
        </motion.button>

        {/* Info Trigger */}
        <motion.button
          onClick={() => setShowDialog(true)}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.25)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            transition: 'border-color 0.3s ease, background-color 0.3s ease',
          }}
        >
          <Info size={20} />
        </motion.button>
      </div>

      {/* Floating Shader Panel Overlay */}
      <AnimatePresence>
        {showShaderPanel && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'absolute',
              top: '70px',
              right: theme.space['Space.M'],
              width: '320px',
              maxHeight: 'calc(100% - 90px)',
              overflowY: 'auto',
              backgroundColor: themeName === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: theme.radius['Radius.L'],
              padding: theme.space['Space.M'],
              zIndex: 60,
              boxShadow: themeName === 'dark' ? '0 20px 40px rgba(0, 0, 0, 0.5)' : '0 20px 40px rgba(0, 0, 0, 0.08)',
              color: theme.Color.Base.Content[1],
              ...theme.border.getBorder1px(themeName === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.space['Space.M'], borderBottom: `1px solid ${theme.Color.Base.Surface[3]}`, paddingBottom: theme.space['Space.S'] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} style={{ color: theme.Color.Base.Content[2] }} />
                <span style={{ ...theme.Type.Expressive.Headline.S, fontSize: '14px', color: theme.Color.Base.Content[1] }}>
                  Shader Optics Controls
                </span>
              </div>
              <button
                onClick={() => setShowShaderPanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.Color.Base.Content[2],
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <ShaderControls />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog Overlay */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
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
                  ...theme.border.getBorder1px(theme.Color.Base.Content['3']),
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
                    color: theme.Color.Base.Content['2'],
                  }}
                >
                  <X size={20} />
                </button>

                <h2 style={{ ...theme.Type.Expressive.Headline.M, color: theme.Color.Base.Content['1'], marginBottom: theme.space['Space.M'] }}>
                  Viewport Slot
                </h2>
                
                <div style={{ marginBottom: theme.space['Space.L'] }}>
                  <p style={{ ...theme.Type.Readable.Body.M, color: theme.Color.Base.Content['1'], lineHeight: 1.5, marginBottom: theme.space['Space.S'] }}>
                    {humanExplanation}
                  </p>
                </div>

                <div style={{ 
                  backgroundColor: theme.Color.Base.Surface['2'], 
                  padding: theme.space['Space.M'], 
                  borderRadius: theme.radius['Radius.M'], 
                  border: `1px dashed ${theme.Color.Base.Content['3']}` 
                }}>
                  <p style={{ ...theme.Type.Readable.Body.S, color: theme.Color.Base.Content['2'], lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {agentInstructions}
                  </p>
                </div>

                <Button
                  onClick={handleCopy}
                  variant="primary"
                  size="M"
                  enableSuccess={true}
                  icon={<Copy size={18} />}
                  style={{ marginTop: theme.space['Space.M'] }}
                >
                  Copy Instructions
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <ErrorBoundary fallback={<div style={{ color: 'white', padding: '20px' }}>3D Scene Error. Please check console.</div>}>
        <Canvas 
          shadows={{ type: THREE.PCFShadowMap }} 
          dpr={[0.75, 1.25]}
          gl={{ 
            antialias: false,
            powerPreference: 'high-performance',
            alpha: true
          }}
        >
          <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={50} />
          <OrbitControls 
            makeDefault 
            enabled={controlsEnabled}
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2.1} 
          />
          
          <ambientLight intensity={ambientIntensity} />
          <spotLight position={[5, 10, 5]} angle={0.3} penumbra={1} intensity={1200} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} />
          <pointLight position={[-6, 4, -6]} intensity={350} color="#00e5ff" />
          <pointLight position={[6, 3, 6]} intensity={250} color="#ff00a0" />
          <gridHelper args={[20, 20, '#444455', '#161622']} position={[0, -1.49, 0]} />
          
          <Physics gravity={[0, -9.81, 0]}>
            <RotatingBox 
              speed={cubeSpeed}
              color={cubeColor}
              scale={cubeScale}
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
          
          {/* Environment provides both lighting and the requested City-scape background */}
          <ProgressiveEnvironment background={showSky} />

          <FluidDistortion
            radius={shaderParams.radius}
            strength={shaderParams.strength}
            dissipation={shaderParams.dissipation}
            curlStrength={shaderParams.curlStrength}
            curlFreq={shaderParams.curlFreq}
          >
            {(texture) => (
              <EffectComposer>
                <DistortionEffect
                  fluidTexture={texture}
                  refractStrength={shaderParams.refractStrength}
                  dispersionScale={shaderParams.dispersionScale}
                  blurRadius={shaderParams.blurRadius}
                  jitterStrength={shaderParams.jitterStrength}
                />
                <SMAA preset={SMAAPreset.MEDIUM} />
              </EffectComposer>
            )}
          </FluidDistortion>
        </Canvas>
      </ErrorBoundary>
      
      {showFps && (
        <div style={fpsStyle}>
          <span style={{ opacity: 0.6 }}>FPS</span>
          <AnimatedCounter value={fps} useFormatting={false} />
        </div>
      )}
    </div>
  );
};

export default Scene3D;
