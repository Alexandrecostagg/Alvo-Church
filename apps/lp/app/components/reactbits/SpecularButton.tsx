'use client';

import { useRef } from 'react';

interface SpecularButtonProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export default function SpecularButton({
  children,
  className = '',
  href,
  onClick,
  variant = 'primary',
}: SpecularButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    target.style.setProperty('--x', `${x}px`);
    target.style.setProperty('--y', `${y}px`);
  };

  const baseClasses = `
    relative overflow-hidden px-8 py-4 rounded-xl font-semibold text-white
    transition-all duration-300 transform hover:scale-105 hover:shadow-2xl
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
  `;

  const variantClasses = variant === 'primary'
    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
    : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500';

  return href ? (
    <a
      ref={linkRef}
      href={href}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={{
        '--x': '50%',
        '--y': '50%',
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div
          className="absolute w-32 h-32 bg-white/20 rounded-full blur-2xl"
          style={{
            left: 'var(--x)',
            top: 'var(--y)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
      
      <span className="relative z-10">{children}</span>
    </a>
  ) : (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={{
        '--x': '50%',
        '--y': '50%',
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div
          className="absolute w-32 h-32 bg-white/20 rounded-full blur-2xl"
          style={{
            left: 'var(--x)',
            top: 'var(--y)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
      
      <span className="relative z-10">{children}</span>
    </button>
  );
}
