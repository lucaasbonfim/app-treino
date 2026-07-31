import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { errorMessage } from '../services/api';
import Icon from '../components/Icon';

export default function Register() {
  const location = useLocation();
  // Quem chegou aqui pelo botão do Google já tem nome e e-mail; só falta a senha.
  const googlePrefill = location.state?.googlePrefill;
  const [form, setForm] = useState({
    name: googlePrefill?.name || '',
    email: googlePrefill?.email || '',
    password: '',
    confirmPassword: '',
  });
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, confirmRegisterCode } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (event) => setForm((current) => ({
    ...current,
    [field]: event.target.value,
  }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!codeSent && form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      if (!codeSent) {
        const data = await register(form.name, form.email, form.password);
        setCodeSent(true);
        setMessage(data?.message || 'Enviamos um código de confirmação para o seu e-mail.');
      } else {
        await confirmRegisterCode(form.email, code);
        navigate('/login', {
          replace: true,
          state: { email: form.email },
        });
      }
    } catch (requestError) {
      setError(errorMessage(requestError, 'Não foi possível continuar o cadastro.'));
    } finally {
      setLoading(false);
    }
  };

  const resetVerification = () => {
    setCodeSent(false);
    setCode('');
    setMessage('');
    setError('');
  };

  return (
    <main className="auth-page compact">
      <section className="auth-hero register-hero">
        <Link className="auth-back" to="/login"><Icon>arrow_back</Icon> Voltar</Link>
        <div className="auth-brand">
          <img className="brand-logo brand-logo-auth" src="/korvix-logo.svg" alt="KorVix Gym" />
          <div>
            <h1>KorVix Gym</h1>
            <p>{codeSent ? 'Confirme seu e-mail' : 'Comece em poucos passos'}</p>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <span className="eyebrow">{codeSent ? 'Código enviado' : 'Nova conta'}</span>
          <h2>{codeSent ? 'Confirme seu e-mail' : 'Crie seu acesso'}</h2>
          <p>
            {codeSent
              ? `Digite o código de 6 dígitos enviado para ${form.email}.`
              : 'Antes de criar a conta, enviaremos um código para confirmar seu e-mail.'}
          </p>
        </div>

        {googlePrefill && !codeSent && (
          <p className="success-banner">
            Ainda não há conta com {googlePrefill.email}. Escolha uma senha para criar a sua.
          </p>
        )}

        <form className="form-stack" onSubmit={submit}>
          <label className="field">
            <span>Nome</span>
            <input
              required
              maxLength={100}
              autoComplete="name"
              readOnly={codeSent}
              value={form.name}
              onChange={set('name')}
              placeholder="Como quer ser chamado?"
            />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              readOnly={codeSent}
              value={form.email}
              onChange={set('email')}
              placeholder="seu@email.com"
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              required
              minLength={6}
              maxLength={72}
              autoComplete="new-password"
              readOnly={codeSent}
              value={form.password}
              onChange={set('password')}
              placeholder="Mínimo de 6 caracteres"
            />
          </label>

          {!codeSent && (
            <label className="field">
              <span>Confirmar senha</span>
              <input
                type="password"
                required
                minLength={6}
                maxLength={72}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                placeholder="Digite a senha novamente"
              />
            </label>
          )}

          {codeSent && (
            <label className="field">
              <span>Código de confirmação</span>
              <input
                className="verification-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={6}
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
              />
            </label>
          )}

          {message && <p className="success-banner">{message}</p>}
          {error && <p className="error-banner">{error}</p>}

          <button className="button button-primary button-large" type="submit" disabled={loading}>
            {loading
              ? (codeSent ? 'Confirmando...' : 'Enviando código...')
              : (codeSent ? 'Confirmar código e criar conta' : 'Enviar código por e-mail')}
          </button>

          {codeSent && (
            <button className="button button-muted button-large" type="button" onClick={resetVerification}>
              Alterar dados e reenviar
            </button>
          )}
        </form>

        <p className="auth-link">Já tem conta? <Link to="/login">Entrar</Link></p>
      </section>
    </main>
  );
}
