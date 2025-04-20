import React, { useEffect, useRef } from 'react';
// import './FireParticles.css'; // Removed unused CSS import

const FireParticles = ({ width, height, intensity = 1, isBackground = false, type = "xburn" }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const particles = [];
    
    // Parse dimensions to ensure they're valid numbers
    const canvasWidth = typeof width === 'string' ? 
      (width.includes('%') ? canvas.parentElement.clientWidth : parseInt(width, 10)) : 
      (width || 300);
    
    const canvasHeight = typeof height === 'string' ? 
      (height.includes('%') ? canvas.parentElement.clientHeight : parseInt(height, 10)) : 
      (height || 150);
    
    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
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
        this.ys *= 0.99;
        this.life++;
        this.size *= 0.97;
      }
    }
    
    ctx.globalCompositeOperation = isBackground ? 'soft-light' : 'screen';
    
    function createParticles() {
      const particlesPerFrame = isBackground ? 1 : 2;
      const baseY = isBackground ? canvasHeight : canvasHeight;
      const spread = isBackground ? canvasWidth : canvasWidth / 4;
      
      for (let i = 0; i < particlesPerFrame; i++) {
        const x = isBackground ? Math.random() * canvasWidth : canvasWidth/2 + (Math.random() - 0.5) * spread;
        const particle = new Particle(x, baseY);
        particles.push(particle);
      }
    }
    
    function updateParticles() {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      createParticles();
      
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        
        if (p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        
        const alpha = (1 - p.life / p.maxLife) * intensity * (isBackground ? 0.3 : 1);
        
        // Ensure coordinates are valid numbers
        const safeX = isFinite(p.x) ? p.x : 0;
        const safeY = isFinite(p.y) ? p.y : 0;
        const safeSize = isFinite(p.size) ? p.size : 1;
        
        try {
          const gradient = ctx.createRadialGradient(
            safeX, safeY, 0,
            safeX, safeY, safeSize
          );
          
          if (type === "xburn") {
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
          ctx.arc(safeX, safeY, safeSize, 0, Math.PI * 2);
          ctx.fill();
        } catch (error) {
          console.log('Skipping particle due to invalid dimensions');
        }
      }
      
      requestAnimationFrame(updateParticles);
    }
    
    let animationFrame = requestAnimationFrame(updateParticles);
    
    return () => {
      cancelAnimationFrame(animationFrame);
      particles.length = 0;
    };
  }, [width, height, intensity, isBackground, type]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        bottom: 0,
        left: isBackground ? 0 : '50%', // Center horizontally if not background
        transform: isBackground ? 'none' : 'translateX(-50%)', // Apply transform for centering
        width: width || '100%',
        height: height || '100%',
        pointerEvents: 'none',
        opacity: isBackground ? 0.6 : 0.5,
        mixBlendMode: isBackground ? 'soft-light' : 'screen',
        borderRadius: 'inherit',
      }}
    />
  );
};

export default FireParticles; 