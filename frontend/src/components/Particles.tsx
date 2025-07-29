'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

export default function Particles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Create initial particles
    const initialParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      color: ['#08C6AB', '#5AFFE7', '#726EFF'][Math.floor(Math.random() * 3)],
    }));

    setParticles(initialParticles);

    // Animation loop
    const animateParticles = () => {
      setParticles(prevParticles =>
        prevParticles.map(particle => {
          let newX = particle.x + particle.speedX;
          let newY = particle.y + particle.speedY;

          // Bounce off edges
          if (newX <= 0 || newX >= 100) particle.speedX *= -1;
          if (newY <= 0 || newY >= 100) particle.speedY *= -1;

          // Keep within bounds
          newX = Math.max(0, Math.min(100, newX));
          newY = Math.max(0, Math.min(100, newY));

          return {
            ...particle,
            x: newX,
            y: newY,
          };
        })
      );
    };

    const interval = setInterval(animateParticles, 50);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-tech-mesh opacity-40" />
      
      {/* Floating particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}40`,
            animationDelay: `${particle.id * 0.1}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Geometric shapes */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-tropical-teal rounded-full animate-pulse opacity-60" />
      <div className="absolute top-40 right-20 w-1 h-1 bg-electric-indigo rounded-full animate-bounce-subtle opacity-40" />
      <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-aqua-mint rounded-full animate-float opacity-50" />
      <div className="absolute top-1/3 right-10 w-2 h-2 bg-tropical-teal rounded-full animate-pulse opacity-30" />
      <div className="absolute bottom-20 right-1/3 w-1 h-1 bg-electric-indigo rounded-full animate-bounce-subtle opacity-60" />
      
      {/* Larger accent shapes */}
      <div 
        className="absolute top-1/4 left-1/3 w-6 h-6 border border-tropical-teal rounded-full animate-rotate-slow opacity-20"
        style={{ animationDuration: '20s' }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-8 h-8 border border-electric-indigo opacity-15"
        style={{ 
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          animation: 'float 4s ease-in-out infinite reverse'
        }}
      />
    </div>
  );
}

// Minimal particles version for performance-sensitive pages
export function ParticlesMinimal() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0 bg-tech-mesh opacity-20" />
      
      {/* Static decorative elements */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-tropical-teal rounded-full animate-pulse opacity-40" />
      <div className="absolute top-40 right-20 w-1 h-1 bg-electric-indigo rounded-full animate-pulse opacity-30" />
      <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-aqua-mint rounded-full animate-pulse opacity-50" />
      <div className="absolute top-1/3 right-10 w-1 h-1 bg-tropical-teal rounded-full animate-pulse opacity-25" />
    </div>
  );
} 