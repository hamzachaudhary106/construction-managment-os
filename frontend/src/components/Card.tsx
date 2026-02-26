import './Card.css';

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </div>
  );
}

export function StatCard({ title, value, variant = 'neutral' }: { title: string; value: string | number; variant?: 'positive' | 'negative' | 'neutral' }) {
  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>
      <div className={`card-value ${variant}`}>{value}</div>
    </div>
  );
}
