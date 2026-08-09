import './MagicBento.css';

interface MagicBentoProps {
  items: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export default function MagicBento({ items }: MagicBentoProps) {
  return (
    <div className="lp-bento-grid">
      {items.map((item, index) => (
        <div key={index} className="lp-bento-card">
          <div className="lp-bento-icon">{item.icon}</div>
          <h3 className="lp-bento-title">{item.title}</h3>
          <p className="lp-bento-desc">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
