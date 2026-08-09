import './CountUp.css';

interface CountUpProps {
  end: number;
  prefix?: string;
  suffix?: string;
}

export default function CountUp({ end, prefix = '', suffix = '' }: CountUpProps) {
  return (
    <span className="lp-count-up">
      {prefix}
      {end}
      {suffix}
    </span>
  );
}
