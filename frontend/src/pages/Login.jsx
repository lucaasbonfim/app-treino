import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { errorMessage } from '../services/api';
import Icon from '../components/Icon';

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
