import './SpecularButton.css';

interface SpecularButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export default function SpecularButton({ children, href, onClick, className = '' }: SpecularButtonProps) {
  const element = href ? 'a' : 'button';

  return (
    element === 'a' ? (
      <a
        href={href}
        onClick={onClick}
        className={`lp-specular-btn ${className}`}
      >
        {children}
      </a>
    ) : (
      <button
        onClick={onClick}
        className={`lp-specular-btn ${className}`}
      >
        {children}
      </button>
    )
  );
}
