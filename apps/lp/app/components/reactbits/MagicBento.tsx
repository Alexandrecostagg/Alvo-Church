'use client';

interface MagicBentoProps {
  items: Array<{
    title: string;
    description: string;
    icon?: string;
    color?: string;
  }>;
  className?: string;
}

export default function MagicBento({ items, className = '' }: MagicBentoProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className="group relative p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
          style={{
            background: item.color || undefined,
          }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            {item.icon && (
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </div>
            )}
            
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-200 transition-colors">
              {item.title}
            </h3>
            
            <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
              {item.description}
            </p>
          </div>

          <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      ))}
    </div>
  );
}
