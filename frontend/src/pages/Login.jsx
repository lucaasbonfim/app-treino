import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { errorMessage } from '../services/api';
import {
  clearGoogleCredentialHandler,
  decodeGoogleCredential,
  initializeGoogleIdentity,
  loadGoogleIdentity,
} from '../services/googleIdentity';
import Icon from '../components/Icon';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/workouts', { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError, 'E-mail ou senha inválidos.'));
    } finally {
      setLoading(false);
    }
  };

  // 404 = e-mail do Google ainda sem conta aqui. Em vez de barrar, leva pro
  // cadastro já com nome e e-mail preenchidos.
  const handleGoogleCredential = useCallback(async (response) => {
    if (!response?.credential) return;
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(response.credential);
      navigate('/workouts', { replace: true });
    } catch (requestError) {
      const profile = decodeGoogleCredential(response.credential);
      if (requestError.response?.status === 404 && profile.email) {
        navigate('/register', {
          state: {
            googlePrefill: { name: profile.name || '', email: profile.email },
          },
        });
        return;
      }
      setError(errorMessage(requestError, 'Não foi possível entrar com Google.'));
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    const button = googleButtonRef.current;
    if (!googleClientId || !button) return undefined;

    let cancelled = false;
    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !button.isConnected) return;
        const identity = initializeGoogleIdentity(googleClientId, handleGoogleCredential);
        button.innerHTML = '';
        identity.renderButton(button, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'pt-BR',
          width: 280,
        });
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o login com Google.');
      });

    return () => {
      cancelled = true;
      clearGoogleCredentialHandler(handleGoogleCredential);
      button.innerHTML = '';
    };
  }, [handleGoogleCredential]);

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-brand">
          <img className="brand-logo brand-logo-auth" src="/korvix-logo.svg" alt="KorVix Gym" />
          <div>
            <h1>KorVix Gym</h1>
            <p>Sua rotina, do seu jeito</p>
          </div>
        </div>
        <h2>Monte um treino simples de seguir.</h2>
        <div className="hero-pills">
          <span>Por dia</span>
          <span>Por grupo</span>
          <span>Por exercício</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <span className="eyebrow">Bem-vindo</span>
          <h2>Entre na sua conta</h2>
          <p>Acesse sua divisão de treinos e continue de onde parou.</p>
        </div>

        {googleClientId && (
          <div className="google-signin">
            <div className="google-signin-button" ref={googleButtonRef} />
            {googleLoading && <p className="google-signin-status">Validando login com Google...</p>}
            <div className="google-signin-divider"><span>ou com e-mail e senha</span></div>
          </div>
        )}

        <form className="form-stack" onSubmit={submit}>
          <label className="field field-icon">
            <span>E-mail</span>
            <div>
              <Icon>mail</Icon>
              <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" />
            </div>
          </label>
          <label className="field field-icon">
            <span>Senha</span>
            <div>
              <Icon>lock</Icon>
              <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                <Icon>{showPassword ? 'visibility_off' : 'visibility'}</Icon>
              </button>
            </div>
          </label>
          {error && <p className="error-banner">{error}</p>}
          <button className="button button-primary button-large" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
            {!loading && <Icon>arrow_forward</Icon>}
          </button>
        </form>
        <p className="auth-link">Ainda não tem conta? <Link to="/register">Criar conta</Link></p>
      </section>
    </main>
  );
}
