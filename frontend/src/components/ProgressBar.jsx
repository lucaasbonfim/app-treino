export default function ProgressBar({ percent = 0, className = '' }) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className={`progress-bar ${className}`} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${clamped}%` }} />
    </div>
  );
}
