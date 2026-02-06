import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

interface WebGLBackgroundProps {
  mouseX: number;
  mouseY: number;
  color?: string;
}

export function WebGLBackground({ mouseX, mouseY, color: _color = '#22d3ee' }: WebGLBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    const colors = ['#22d3ee', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
    for (let i = 0; i < 100; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
        life: Math.random() * 100,
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(3, 3, 8, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, i) => {
        // Mouse attraction
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) {
          const force = (200 - dist) / 200 * 0.02;
          particle.vx += dx * force * 0.01;
          particle.vy += dy * force * 0.01;
        }

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life += 0.5;

        // Boundary check
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha * (0.5 + Math.sin(particle.life * 0.05) * 0.5);
        ctx.fill();

        // Draw connections
        particlesRef.current.slice(i + 1).forEach((other) => {
          const d = Math.sqrt(
            Math.pow(particle.x - other.x, 2) + Math.pow(particle.y - other.y, 2)
          );
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = particle.color;
            ctx.globalAlpha = (1 - d / 100) * 0.15;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [mouseX, mouseY]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}

// Mouse follower glow effect
export function MouseGlow({ x, y, color = '#22d3ee' }: { x: number; y: number; color?: string }) {
  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      animate={{
        x: x - 150,
        y: y - 150,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 50,
      }}
      style={{
        width: 300,
        height: 300,
        background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
        filter: 'blur(20px)',
      }}
    />
  );
}

// Grid overlay with perspective
export function PerspectiveGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center top',
          opacity: 0.5,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(3,3,8,0.9) 100%)',
        }}
      />
    </div>
  );
}

// Floating orbs
export function FloatingOrbs() {
  const orbs = [
    { x: '10%', y: '20%', size: 300, color: '#22d3ee', delay: 0 },
    { x: '80%', y: '60%', size: 400, color: '#8b5cf6', delay: 2 },
    { x: '50%', y: '80%', size: 250, color: '#ec4899', delay: 4 },
    { x: '20%', y: '70%', size: 200, color: '#10b981', delay: 1 },
    { x: '70%', y: '30%', size: 350, color: '#f59e0b', delay: 3 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color}15 0%, transparent 70%)`,
            filter: 'blur(60px)',
          }}
          animate={{
            x: [0, 30, -30, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 20,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
