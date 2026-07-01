import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { useTheme } from '../contexts/theme-context';
import Icon from './Icon';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

export default function ProfileDrawer({ open, onClose }) {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="profile-drawer-layer">
      <button className="profile-drawer-backdrop" type="button" aria-label="Fechar menu" onClick={onClose} />
      <aside className="profile-drawer" aria-label="Menu da conta">
        <header className="drawer-header">
          <img className="brand-logo drawer-logo" src="/korvix-logo.svg" alt="" />
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar menu">
            <Icon>close</Icon>
          </button>
        </header>

        <section className="drawer-user">
          <span className="drawer-avatar">{initials(user?.name)}</span>
          <div>
            <strong>{user?.name || 'Usuário'}</strong>
            <small>{user?.email}</small>
          </div>
        </section>

        <nav className="drawer-menu">
          <Link to="/profile" onClick={onClose}>
            <span className="drawer-item-icon"><Icon>person</Icon></span>
            <span><strong>Meu perfil</strong><small>Nome, e-mail e senha</small></span>
            <Icon>chevron_right</Icon>
          </Link>

          <button type="button" onClick={toggleTheme}>
            <span className="drawer-item-icon"><Icon>{dark ? 'light_mode' : 'dark_mode'}</Icon></span>
            <span><strong>{dark ? 'Modo claro' : 'Modo escuro'}</strong><small>Alterar aparência do app</small></span>
            <span className={`toggle-switch ${dark ? 'active' : ''}`} aria-hidden="true"><i /></span>
          </button>
        </nav>

        <button className="drawer-logout" type="button" onClick={handleLogout}>
          <Icon>logout</Icon>
          Sair da conta
        </button>
      </aside>
    </div>
  );
}
