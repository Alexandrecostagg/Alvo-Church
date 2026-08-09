'use client';

import { useRef, useEffect } from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 5,
  className = '',
}: ShinyTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (disabled) return;

    const canvas = canvasRef.current;
    const textElement = textRef.current;
    if (!canvas || !textElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = textElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    let startTime = Date.now();

    const draw = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      const angle = elapsed * speed;
      
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,1)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      
      const x = (angle % 2) - 1;
      gradient.addColorStop(Math.max(0, x), 'rgba(255,255,255,0)');
      gradient.addColorStop(Math.min(1, x + 0.2), 'rgba(255,255,255,1)');
      gradient.addColorStop(Math.min(1, x + 0.4), 'rgba(255,255,255,0)');
      
      ctx.fillStyle = gradient;
      ctx.font = getComputedStyle(textElement).font;
      ctx.fillText(text, 0, canvas.height - 10);
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [disabled, speed, text]);

  return (
    <div className={`relative inline-block ${className}`}>
      <span ref={textRef} className="relative z-10">
        {text}
      </span>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-20 mix-blend-overlay"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
