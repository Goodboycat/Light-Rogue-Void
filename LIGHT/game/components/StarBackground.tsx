
import React, { useEffect, useRef } from 'react';

interface StarBackgroundProps {
  unlockedCount: number;
  totalCount: number;
  performanceMode?: 'LOW' | 'MEDIUM' | 'HIGH';
  /** (3B step 5) chapter palette accent; null = plain white stars. Eased in over ~2 s. */
  tint?: string | null;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const StarBackground: React.FC<StarBackgroundProps> = ({ unlockedCount, totalCount, performanceMode = 'MEDIUM', tint = null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Float32Array | null>(null);
  const currentMaxRef = useRef(0);
  // Tint target + eased current colour (white by default); refs so the render loop doesn't restart.
  const tintTargetRef = useRef<[number, number, number]>([255, 255, 255]);
  const tintCurRef = useRef<[number, number, number]>([255, 255, 255]);
  useEffect(() => { tintTargetRef.current = tint ? hexToRgb(tint) : [255, 255, 255]; }, [tint]);

  const getStarCount = (mode: string) => {
      switch(mode) {
          case 'LOW': return 60;
          case 'HIGH': return 350;
          case 'MEDIUM': 
          default: return 150;
      }
  };

  useEffect(() => {
    // Re-initialize Stars Data when performance mode changes
    const count = getStarCount(performanceMode);
    
    // Only regenerate if count changed
    if (currentMaxRef.current !== count) {
        currentMaxRef.current = count;
        const data = new Float32Array(count * 6);
        // Structure per star: 
        // 0: angle
        // 1: radius
        // 2: speed (rotation)
        // 3: baseSize
        // 4: growthPotential (0 if non-growing, >0 if growing)
        // 5: phase (twinkle)

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 1000; // Distribute initially to fill screen
            
            data[i * 6 + 0] = angle;
            data[i * 6 + 1] = radius;
            data[i * 6 + 2] = 0.0005 + Math.random() * 0.0005; // Constant slow rotation speed
            
            // SIZE LOGIC UPDATE:
            // Player base radius is 10. Half size is 5.
            // We want max size (base + max_growth) < 5.
            
            // Base size: 0.5 to 1.5
            data[i * 6 + 3] = Math.random() * 1.0 + 0.5; 
            
            // Growth potential:
            // 20% chance to be a star that grows significantly with player power.
            // Max additional growth: ~3.0. Total max ~4.5 < 5.0.
            const isGrower = Math.random() < 0.2;
            data[i * 6 + 4] = isGrower ? (Math.random() * 2.0 + 1.0) : 0; 
            
            data[i * 6 + 5] = Math.random() * Math.PI * 2;
        }
        starsRef.current = data;
    }
  }, [performanceMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let animId: number;

    const render = () => {
      if (!starsRef.current) return;
      const stars = starsRef.current;
      const maxStars = currentMaxRef.current;

      // Clear background
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#020617'; 
      ctx.fillRect(0, 0, width, height);

      // Progress factor (0 to 1)
      const safeTotal = Math.max(1, totalCount);
      const progress = Math.min(1, unlockedCount / safeTotal);

      // Star Appearance: glowing, tinted toward the chapter accent (eased ~2 s at 60 fps)
      const tc = tintCurRef.current, tt = tintTargetRef.current;
      for (let k = 0; k < 3; k++) tc[k] += (tt[k] - tc[k]) * 0.025;
      const starColor = `rgb(${tc[0] | 0},${tc[1] | 0},${tc[2] | 0})`;
      ctx.fillStyle = starColor;
      ctx.shadowBlur = performanceMode === 'LOW' ? 0 : 4; // Disable shadow on LOW for extra perf
      ctx.shadowColor = starColor;
      
      const cx = width / 2;
      const cy = height / 2;
      
      // Determine max radius to respawn stars that spiral too far out
      const maxRadius = Math.max(width, height) * 0.7;

      // Draw exactly 'unlockedCount' stars (or 0 if none) - scaled by ratio if needed, 
      // but simpler: we draw up to min(unlockedCount, MAX_STARS) is logically inconsistent 
      // if MAX_STARS changes.
      // Logic: unlockedCount represents power. We want the sky to fill up.
      // We map unlockedCount (0 -> TotalNodes) to visible stars (0 -> maxStars).
      
      const starRatio = unlockedCount / safeTotal;
      const visibleStars = Math.floor(starRatio * maxStars);
      const drawCount = Math.max(10, visibleStars); // Always show a few stars

      for (let i = 0; i < drawCount; i++) {
          const idx = i * 6;
          
          let angle = stars[idx + 0];
          let radius = stars[idx + 1];
          const speed = stars[idx + 2];
          const baseSize = stars[idx + 3];
          const growth = stars[idx + 4];

          // --- SPIRAL MOTION (OUTWARD) ---
          // Rotate
          angle += speed;
          // Spiral Outward
          radius += 0.3; 

          // Respawn at center if too far out
          if (radius > maxRadius) {
              radius = Math.random() * 50; // Respawn near center
              angle = Math.random() * Math.PI * 2; // New angle
          }

          // Save state
          stars[idx + 0] = angle;
          stars[idx + 1] = radius;

          // --- VISUALS ---
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          // Size Logic:
          // Base size + (GrowthPotential * Progress)
          const currentSize = baseSize + (growth * progress);
          
          ctx.beginPath();
          ctx.arc(cx + x, cy + y, currentSize, 0, Math.PI*2);
          ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    
    const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
    };
  }, [unlockedCount, totalCount, performanceMode]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

export default StarBackground;
