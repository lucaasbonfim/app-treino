import Icon from './Icon';

export function LoadingView() {
  return (
    <div className="status-card">
      <span className="spinner" />
      <p>Carregando...</p>
    </div>
  );
}

export function EmptyView({ title, text }) {
  return (
    <div className="status-card empty-card">
      <div className="empty-icon"><Icon>fitness_center</Icon></div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
