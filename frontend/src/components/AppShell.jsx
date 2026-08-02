import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { useTheme } from '../contexts/theme-context';
import { apiCache, friendService } from '../services';
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
  const { dark, toggleTheme } = useTheme();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const isHome = path === '/';
  const isWorkouts = path.startsWith('/workouts');
  const isHistory = path === '/history';
  const isAgenda = path === '/agenda';
  const isFriends = path === '/friends';
  const isProfile = path === '/profile';
  const isMainTab = isHome || path === '/workouts';

  // Sem esse contador ninguém descobre que recebeu um pedido de amizade. A
  // resposta fica em cache, então não vira uma requisição por tela aberta —
  // e responder a um pedido limpa o cache, o que dispara a recontagem aqui.
  useEffect(() => {
    if (hideNav) return undefined;
    let active = true;

    const count = () => {
      friendService.requests()
        .then(({ data }) => {
          if (active) setPendingRequests(data?.received?.length || 0);
        })
        .catch(() => {});
    };

    const unsubscribe = apiCache.subscribe((detail) => {
      if (detail.type === 'clear') count();
    });
    count();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [hideNav, path]);

  return (
    <div className={`app-frame ${hideNav ? 'without-nav' : ''}`}>
      {!hideNav && (
        <aside className="side-nav" aria-label="Navegação lateral">
          <div className="side-nav-brand">
            <img className="brand-logo side-nav-logo" src="/korvix-logo.svg" alt="" />
            <span>KorVix Gym</span>
          </div>
          <nav className="side-nav-links">
            <Link className={isHome ? 'active' : ''} to="/">
              <Icon filled={isHome}>calendar_month</Icon>
              <span>Início</span>
            </Link>
            <Link className={isWorkouts ? 'active' : ''} to="/workouts">
              <Icon filled={isWorkouts}>view_agenda</Icon>
              <span>Meus treinos</span>
            </Link>
            <Link className={isAgenda ? 'active' : ''} to="/agenda">
              <Icon filled={isAgenda}>event</Icon>
              <span>Agenda</span>
            </Link>
            <Link className={isFriends ? 'active' : ''} to="/friends">
              <Icon filled={isFriends}>groups</Icon>
              <span>Amigos</span>
              {pendingRequests > 0 && <span className="nav-badge">{pendingRequests}</span>}
            </Link>
            <Link className={isHistory ? 'active' : ''} to="/history">
              <Icon filled={isHistory}>history</Icon>
              <span>Histórico</span>
            </Link>
            <Link className={isProfile ? 'active' : ''} to="/profile">
              <Icon filled={isProfile}>person</Icon>
              <span>Meu perfil</span>
            </Link>
          </nav>
          <button className="side-nav-theme" type="button" onClick={toggleTheme}>
            <Icon>{dark ? 'light_mode' : 'dark_mode'}</Icon>
            <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
          </button>
        </aside>
      )}
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
          <Link className={isFriends ? 'active' : ''} to="/friends">
            <Icon filled={isFriends}>groups</Icon>
            <span>Amigos</span>
            {pendingRequests > 0 && <span className="nav-badge">{pendingRequests}</span>}
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
