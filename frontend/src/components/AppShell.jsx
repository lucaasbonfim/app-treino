import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import Icon from './Icon';
import ProfileDrawer from './ProfileDrawer';

export default function AppShell({
  children,
  title,
  subtitle,
  back = false,
  action = null,
  hideNav = false,
}) {
  const { user } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const isHome = path === '/';
  const isWorkouts = path.startsWith('/workouts');
  const isMainTab = isHome || path === '/workouts';

  return (
    <div className={`app-frame ${hideNav ? 'without-nav' : ''}`}>
      <header className="app-header">
        <div className="header-inner">
          {back ? (
            <button className="icon-button" type="button" onClick={() => navigate(-1)} aria-label="Voltar">
              <Icon>arrow_back</Icon>
            </button>
          ) : (
            <img className="brand-logo brand-logo-header" src="/korvix-logo.svg" alt="KorVix Gym" />
          )}
          <div className="header-copy">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action || (
            isMainTab && (
              <button className="avatar-button" type="button" onClick={() => setProfileMenuOpen(true)} aria-label="Abrir menu da conta">
                <span>{user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}</span>
                <Icon>menu</Icon>
              </button>
            )
          )}
        </div>
      </header>

      <main className="app-content">{children}</main>

      {!hideNav && <nav className="bottom-nav" aria-label="Navegação principal">
        <div className="bottom-nav-inner">
          <Link className={isHome ? 'active' : ''} to="/">
            <Icon filled={isHome}>calendar_month</Icon>
            <span>Início</span>
          </Link>
          <Link className={isWorkouts ? 'active' : ''} to="/workouts">
            <Icon filled={isWorkouts}>view_agenda</Icon>
            <span>Meus treinos</span>
          </Link>
          <Link className={path === '/history' ? 'active' : ''} to="/history">
            <Icon filled={path === '/history'}>history</Icon>
            <span>Histórico</span>
          </Link>
        </div>
      </nav>}
      <ProfileDrawer open={profileMenuOpen} onClose={() => setProfileMenuOpen(false)} />
    </div>
  );
}
