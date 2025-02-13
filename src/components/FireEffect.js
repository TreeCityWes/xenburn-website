import React, { useEffect, useRef } from 'react';

export function FireEffect({ width = 50, height = 50, scale = 10, intensity = 1 }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let fireData = Array(height).fill(null).map(() => Array(width).fill(0));
    
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    function updateFire() {
      // Create more dynamic base fire
      for (let i = 0; i < width; i++) {
        const randIntensity = Math.random() * 0.2 + 0.8; // Random between 0.8 and 1
        fireData[height - 1][i] = 255 * intensity * randIntensity;
      }
    
      // Improved fire spread algorithm
      for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width; x++) {
          const decay = Math.random() * 0.8;
          const left = fireData[y + 1][x - 1] || 0;
          const center = fireData[y + 1][x];
          const right = fireData[y + 1][x + 1] || 0;
          
          fireData[y][x] = (
            (left + center * 2 + right) / 4  // Weight center pixel more
          ) * (1 - decay * 0.05);  // Gradual decay upwards
        }
      }
    }
    
    function renderFire() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const value = fireData[y][x];
          const alpha = Math.min((value / 255) * 0.9, 0.9); // Cap opacity
          
          // Color palette more like real fire
          const r = Math.min(255, value * 1.5);
          const g = Math.min(255, value * 0.6);
          const b = Math.min(255, value * 0.1);
          
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    
    function animate() {
      updateFire();
      renderFire();
      requestAnimationFrame(animate);
    }
    
    animate();
  }, [width, height, scale, intensity]);
  
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
        opacity: 0.7,
        mixBlendMode: 'screen',
        filter: 'blur(1px)' // Slight blur for smoother appearance
      }}
    />
  );
} 