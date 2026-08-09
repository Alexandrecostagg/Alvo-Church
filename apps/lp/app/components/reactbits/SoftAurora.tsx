'use client';

import { useRef, useEffect } from 'react';

interface SoftAuroraProps {
  speed?: number;
  scale?: number;
  brightness?: number;
  color1?: string;
  color2?: string;
  noiseFrequency?: number;
  noiseAmplitude?: number;
  bandHeight?: number;
  bandSpread?: number;
  octaveDecay?: number;
  layerOffset?: number;
  colorSpeed?: number;
  enableMouseInteraction?: boolean;
  mouseInfluence?: number;
  className?: string;
}

export default function SoftAurora({
  speed = 0.6,
  scale = 1.5,
  brightness = 1,
  color1 = '#f7f7f7',
  color2 = '#e100ff',
  noiseFrequency = 2.5,
  noiseAmplitude = 1,
  bandHeight = 0.5,
  bandSpread = 1,
  octaveDecay = 0.1,
  layerOffset = 0,
  colorSpeed = 1,
  enableMouseInteraction = true,
  mouseInfluence = 0.25,
  className = '',
}: SoftAuroraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

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

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    if (enableMouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    let time = 0;

    const draw = () => {
      time += speed * 0.01;
      
      ctx.fillStyle = color1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, color2);
      gradient.addColorStop(1, color1);

      ctx.globalAlpha = brightness * 0.3;
      ctx.fillStyle = gradient;

      for (let i = 0; i < 5; i++) {
        const y = canvas.height * (0.2 + i * bandHeight * bandSpread) + 
                  Math.sin(time + i + layerOffset) * 50 * scale;
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        
        for (let x = 0; x <= canvas.width; x += 10) {
          const noise = Math.sin(x * noiseFrequency * 0.01 + time + i) * 
                       noiseAmplitude * scale * 20;
          const mouseEffect = enableMouseInteraction ? 
            Math.sin((mouseRef.current.x - x / canvas.width) * Math.PI) * 
            mouseInfluence * 30 : 0;
          
          ctx.lineTo(x, y + noise + mouseEffect);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (enableMouseInteraction) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [speed, scale, brightness, color1, color2, noiseFrequency, noiseAmplitude, 
      bandHeight, bandSpread, octaveDecay, layerOffset, colorSpeed, enableMouseInteraction, 
      mouseInfluence]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
