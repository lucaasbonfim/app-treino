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

// O "G" oficial. Fica sobre um círculo branco porque as cores da marca não
// podem ser alteradas nem perder contraste sobre o fundo escuro.
function GoogleLogo() {
  return (
    <span className="google-signin-logo">
      <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" focusable="false">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    </span>
  );
}

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
  const googleWrapperRef = useRef(null);

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

  // O botão do Google fica invisível por cima do nosso: assim o visual é o do
  // app em qualquer estado (a variante "Continuar como Fulano", de quem já
  // entrou antes, é sempre clara e ignora o theme), e o clique continua indo
  // para o iframe do Google — o fluxo de ID token segue igual.
  useEffect(() => {
    const slot = googleButtonRef.current;
    const wrapper = googleWrapperRef.current;
    if (!googleClientId || !slot || !wrapper) return undefined;

    let cancelled = false;
    let observer = null;
    let drawnWidth = 0;

    // Só a área do botão dentro do iframe recebe clique, então ele precisa ter
    // exatamente a largura do botão que desenhamos embaixo.
    const draw = (identity) => {
      if (cancelled || !slot.isConnected) return;
      const width = Math.min(400, Math.round(wrapper.getBoundingClientRect().width));
      if (!width || width === drawnWidth) return;
      drawnWidth = width;
      slot.innerHTML = '';
      identity.renderButton(slot, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        locale: 'pt-BR',
        width,
      });
    };

    loadGoogleIdentity()
      .then(() => {
        if (cancelled) return;
        const identity = initializeGoogleIdentity(googleClientId, handleGoogleCredential);
        draw(identity);
        observer = new ResizeObserver(() => draw(identity));
        observer.observe(wrapper);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o login com Google.');
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
      clearGoogleCredentialHandler(handleGoogleCredential);
      slot.innerHTML = '';
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
            <div className="google-signin-button" ref={googleWrapperRef}>
              <span className="google-signin-face" aria-hidden="true">
                <GoogleLogo />
                Continuar com o Google
              </span>
              <div className="google-signin-slot" ref={googleButtonRef} />
            </div>
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
