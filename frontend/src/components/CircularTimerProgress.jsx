export default function CircularTimerProgress({
  progress = 0,
  size = 264,
  stroke = 16,
  finished = false,
  children,
}) {
  const clamped = Math.max(0, Math.min(1, Number(progress) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div className="circular-timer" style={{ width: size, height: size }}>
      <svg className="circular-timer-svg" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="circular-timer-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className={`circular-timer-progress ${finished ? 'finished' : ''}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="circular-timer-content">{children}</div>
    </div>
  );
}
