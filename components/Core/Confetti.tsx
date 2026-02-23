/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../Theme.tsx';

interface ConfettiProps {
  trigger: number;
}

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  color: string;
  tilt: number;
  tiltAngle: number;
  tiltAngleIncrement: number;
  life: number;      // Remaining life in frames
  maxLife: number;   // Total life for fade calculations
}

const Confetti: React.FC<ConfettiProps> = ({ trigger }) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const isAnimatingRef = useRef(false);

  // Theme-aware colors
  const getColors = () => [
    theme.Color.Signal.Content[1],
    theme.Color.Focus.Content[1], 
    theme.Color.Warning.Content[1], 
    theme.Color.Success.Content[1],
    theme.Color.Error.Content[1],
  ];

  // Initialize Canvas Size
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    // Initial setup
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Animation Loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter active particles (alive and on screen)
    // We create a new array to preserve integrity during iteration
    const nextParticles: Particle[] = [];

    particlesRef.current.forEach((p) => {
      // Physics Updates
      p.tiltAngle += p.tiltAngleIncrement;
      p.y += p.vy;
      p.x += Math.sin(p.tiltAngle) * 2; // Wobble
      p.tilt = Math.sin(p.tiltAngle) * 15;
      p.life--; // Decrease life

      // Bounds & Life Check
      // Only keep particles that have life left and haven't fallen too far below screen
      if (p.life > 0 && p.y < canvas.height + 50) {
         
         // Draw
         ctx.beginPath();
         ctx.lineWidth = p.w;
         ctx.strokeStyle = p.color;
         
         // Fade out logic: Start fading when life is < 50 frames
         const alpha = Math.min(1, p.life / 50);
         ctx.globalAlpha = alpha;
         
         ctx.moveTo(p.x + p.tilt + (p.w / 2), p.y);
         ctx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.h));
         ctx.stroke();
         
         ctx.globalAlpha = 1.0; // Reset opacity
         
         nextParticles.push(p);
      }
    });

    particlesRef.current = nextParticles;

    if (particlesRef.current.length > 0) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      isAnimatingRef.current = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Trigger Logic: Add new particles without resetting
  useEffect(() => {
    if (trigger === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Configuration
    const particleCount = 100;
    const colors = getColors();

    // Add new batch of particles to the existing array
    for (let i = 0; i < particleCount; i++) {
      const life = 250 + Math.random() * 150; // Random life between 250-400 frames
      
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -100 - 50, // Start slightly above viewport
        w: 10 + Math.random() * 10,
        h: 5 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 2, // Horizontal drift
        vy: 3 + Math.random() * 4,     // Fall speed
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10,
        tiltAngle: 0,
        tiltAngleIncrement: 0.05 + Math.random() * 0.05,
        life: life,
        maxLife: life
      });
    }

    // Start loop if it's not already running
    if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        animate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]); // Only run when trigger increments

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none', // Click-through
        zIndex: 9999, // Overlay everything
      }}
    />,
    document.body
  );
};

export default Confetti;