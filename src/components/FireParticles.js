import React, { useEffect, useRef } from 'react';

export function FireParticles({ width, height, intensity = 1, isBackground = false }) {
  const canvasRef = useRef(null);
  
  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      if (isBackground) {
        this.xs = (Math.random() * 2 - 1) * 0.5;
        this.ys = -Math.random() * 2 - 1;
        this.maxLife = 80 + Math.random() * 40;
        this.size = 25 + Math.random() * 15;
      } else {
        this.xs = (Math.random() * 2 - 1) * 1.5;
        this.ys = -Math.random() * 4 - 2;
        this.maxLife = 40 + Math.random() * 20;
        this.size = 15 + Math.random() * 10;
      }
      this.life = 0;
    }
    
    update() {
      this.x += this.xs;
      this.y += this.ys;
      this.ys *= 0.99; // Slight deceleration
      this.life++;
      this.size *= 0.97; // Shrink over time
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const particles = [];
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.globalCompositeOperation = isBackground ? 'soft-light' : 'screen';
    
    function createParticles() {
      const particlesPerFrame = isBackground ? 1 : 2;
      const baseY = isBackground ? height : height;
      const spread = isBackground ? width : width / 4;
      
      for (let i = 0; i < particlesPerFrame; i++) {
        const x = isBackground ? Math.random() * width : width/2 + (Math.random() - 0.5) * spread;
        const particle = new Particle(x, baseY);
        particles.push(particle);
      }
    }
    
    function updateParticles() {
      ctx.clearRect(0, 0, width, height);
      
      createParticles();
      
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        
        if (p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        
        const alpha = (1 - p.life / p.maxLife) * intensity * (isBackground ? 0.3 : 1);
        
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.size
        );
        
        if (isBackground) {
          gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(255, 50, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(255, 30, 0, 0)`);
        } else {
          gradient.addColorStop(0, `rgba(255, 80, 0, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(255, 40, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(255, 20, 0, 0)`);
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      requestAnimationFrame(updateParticles);
    }
    
    updateParticles();
    
    return () => {
      particles.length = 0;
    };
  }, [width, height, intensity, isBackground]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: isBackground ? 0.4 : 0.7,
        mixBlendMode: isBackground ? 'soft-light' : 'screen',
      }}
    />
  );
} 