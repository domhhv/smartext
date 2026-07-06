import './quantum-loader.scss';
import cn from '@/lib/utils/cn';

type QuantumLoaderProps = {
  className?: string;
  color?: string;
  size?: number;
};

export default function QuantumLoader({ className, color = 'black', size = 45 }: QuantumLoaderProps) {
  return (
    <div
      className={cn('quantum-loader-container', className)}
      style={
        {
          '--uib-color': color,
          '--uib-size': `${size}px`,
        } as React.CSSProperties
      }
    >
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
    </div>
  );
}
