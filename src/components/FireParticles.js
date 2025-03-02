import React, { useEffect, useRef } from 'react';

const FireParticles = ({ width, height, intensity = 1, isBackground = false, type = "default" }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const particles = [];
    let animationFrame;
    
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
    
    canvas.width = width || (canvas.parentElement ? canvas.parentElement.clientWidth : 300);
    canvas.height = height || (canvas.parentElement ? canvas.parentElement.clientHeight : 200);
    
    ctx.globalCompositeOperation = isBackground ? 'soft-light' : 'screen';
    
    function createParticles() {
      // Reduce the number of particles to prevent overwhelming the UI
      const particlesPerFrame = isBackground ? 0.5 : 1;
      
      // Only create particles some of the time
      if (Math.random() > particlesPerFrame) return;
      
      const baseY = isBackground ? height : height;
      const spread = isBackground ? width : width / 4;
      
      const x = isBackground ? Math.random() * width : width/2 + (Math.random() - 0.5) * spread;
      const particle = new Particle(x, baseY);
      particles.push(particle);
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
        
        // Reduce the intensity for better visual balance
        const reducedIntensity = isBackground ? intensity * 0.5 : intensity * 0.7;
        const alpha = (1 - p.life / p.maxLife) * reducedIntensity * (isBackground ? 0.2 : 0.7);
        
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.size
        );
        
        // Customize colors based on type
        if (type === "xburn") {
          gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(255, 50, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(255, 30, 0, 0)`);
        } else if (type === "xen") {
          gradient.addColorStop(0, `rgba(0, 150, 255, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(0, 100, 200, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(0, 50, 150, 0)`);
        } else if (type === "supply") {
          gradient.addColorStop(0, `rgba(255, 220, 0, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(255, 180, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(255, 150, 0, 0)`);
        } else if (type === "pool") {
          gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(200, 0, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(150, 0, 0, 0)`);
        } else if (type === "global") {
          gradient.addColorStop(0, `rgba(128, 0, 255, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(100, 0, 200, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(80, 0, 150, 0)`);
        } else {
          // Default "fire" style
          gradient.addColorStop(0, `rgba(255, 80, 0, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(255, 40, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(255, 20, 0, 0)`);
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      animationFrame = requestAnimationFrame(updateParticles);
    }
    
    updateParticles();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      particles.length = 0;
    };
  }, [width, height, intensity, isBackground, type]);

  return (
    <canvas
      ref={canvasRef}
      className="fire-particles"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: isBackground ? 0.2 : 0.15,
        mixBlendMode: isBackground ? 'soft-light' : 'screen',
        zIndex: 0,
        overflow: 'hidden'
      }}
    />
  );
};

export default FireParticles; 