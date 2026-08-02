import { useState } from 'react';
import AppShell from '../components/AppShell';
import Icon from '../components/Icon';
import { useAuth } from '../contexts/auth-context';
import { useTheme } from '../contexts/theme-context';
import { authService } from '../services';
import { errorMessage } from '../services/api';

function initials(name) {
  return String(name || '').trim().split(/\s+/).filter(Boolean)
    .slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { dark, toggleTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState('');
  const [nameError, setNameError] = useState('');

  const [username, setUsername] = useState(user?.username || '');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const [emailStep, setEmailStep] = useState('closed');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const saveName = async (event) => {
    event.preventDefault();
    setNameSaving(true);
    setNameMessage('');
    setNameError('');
    try {
      const { data } = await authService.updateName({ name });
      updateUser(data.user);
      setName(data.user.name);
      setNameMessage(data.message);
    } catch (requestError) {
      setNameError(errorMessage(requestError, 'Não foi possível atualizar o nome.'));
    } finally {
      setNameSaving(false);
    }
  };

  const saveUsername = async (event) => {
    event.preventDefault();
    setUsernameSaving(true);
    setUsernameMessage('');
    setUsernameError('');
    try {
      const { data } = await authService.updateUsername({ username });
      updateUser(data.user);
      setUsername(data.user.username);
      setUsernameMessage(data.message);
    } catch (requestError) {
      setUsernameError(errorMessage(requestError, 'Não foi possível atualizar o nome de usuário.'));
    } finally {
      setUsernameSaving(false);
    }
  };

  const requestEmailCode = async (event) => {
    event.preventDefault();
    setEmailSaving(true);
    setEmailError('');
    setEmailMessage('');
    try {
      const { data } = await authService.requestEmailChange({
        newEmail,
        password: emailPassword,
      });
      setEmailStep('code');
      setEmailMessage(data.message);
    } catch (requestError) {
      setEmailError(errorMessage(requestError, 'Não foi possível enviar o código.'));
    } finally {
      setEmailSaving(false);
    }
  };

  const confirmEmail = async (event) => {
    event.preventDefault();
    setEmailSaving(true);
    setEmailError('');
    try {
      const { data } = await authService.confirmEmailChange({
        newEmail,
        code: emailCode,
      });
      updateUser(data.user);
      setEmailStep('closed');
      setNewEmail('');
      setEmailPassword('');
      setEmailCode('');
      setEmailMessage(data.message);
    } catch (requestError) {
      setEmailError(errorMessage(requestError, 'Não foi possível confirmar o novo e-mail.'));
    } finally {
      setEmailSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (passwords.next !== passwords.confirm) {
      setPasswordError('As novas senhas não coincidem.');
      return;
    }

    setPasswordSaving(true);
    try {
      const { data } = await authService.changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswordMessage(data.message);
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordOpen(false);
    } catch (requestError) {
      setPasswordError(errorMessage(requestError, 'Não foi possível alterar a senha.'));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <AppShell title="Meu perfil" subtitle="Conta e preferências" back>
      <section className="profile-hero">
        <span className="profile-avatar">{initials(user?.name)}</span>
        <div>
          <h2>{user?.name}</h2>
          {user?.username && <p className="profile-username">@{user.username}</p>}
          <p>{user?.email}</p>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-title">
          <span className="profile-section-icon"><Icon>{dark ? 'light_mode' : 'dark_mode'}</Icon></span>
          <div><h2>Aparência</h2><p>Escolha como deseja visualizar o aplicativo.</p></div>
        </div>
        <button className="theme-setting" type="button" onClick={toggleTheme}>
          <span><strong>Modo escuro</strong><small>{dark ? 'Ativado' : 'Desativado'}</small></span>
          <span className={`toggle-switch ${dark ? 'active' : ''}`} aria-hidden="true"><i /></span>
        </button>
      </section>

      <section className="profile-section">
        <div className="profile-section-title">
          <span className="profile-section-icon"><Icon>badge</Icon></span>
          <div><h2>Dados pessoais</h2><p>Atualize as informações vinculadas à conta.</p></div>
        </div>

        <form className="form-stack profile-form-block" onSubmit={saveName}>
          <label className="field">
            <span>Nome</span>
            <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          {nameMessage && <p className="success-banner">{nameMessage}</p>}
          {nameError && <p className="error-banner">{nameError}</p>}
          <button className="button button-primary" type="submit" disabled={nameSaving || name.trim() === user?.name}>
            {nameSaving ? 'Salvando...' : 'Salvar nome'}
          </button>
        </form>

        <div className="profile-divider" />

        <form className="form-stack profile-form-block" onSubmit={saveUsername}>
          <label className="field">
            <span>Nome de usuário</span>
            <div className="username-field">
              <span aria-hidden="true">@</span>
              <input
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          </label>
          <p className="field-hint">É por esse @ que seus amigos te encontram.</p>
          {usernameMessage && <p className="success-banner">{usernameMessage}</p>}
          {usernameError && <p className="error-banner">{usernameError}</p>}
          <button
            className="button button-primary"
            type="submit"
            disabled={usernameSaving || username.trim() === user?.username}
          >
            {usernameSaving ? 'Salvando...' : 'Salvar @'}
          </button>
        </form>

        <div className="profile-divider" />

        <div className="profile-data-row">
          <div><span>E-mail</span><strong>{user?.email}</strong></div>
          {emailStep === 'closed' && (
            <button type="button" onClick={() => {
              setEmailStep('request');
              setEmailMessage('');
              setEmailError('');
            }}>Alterar</button>
          )}
        </div>

        {emailStep === 'request' && (
          <form className="form-stack profile-form-block" onSubmit={requestEmailCode}>
            <label className="field"><span>Novo e-mail</span><input type="email" required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="novo@email.com" /></label>
            <label className="field"><span>Senha atual</span><input type="password" required value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} placeholder="Confirme sua identidade" /></label>
            {emailError && <p className="error-banner">{emailError}</p>}
            <div className="form-actions">
              <button className="button button-muted" type="button" onClick={() => setEmailStep('closed')}>Cancelar</button>
              <button className="button button-primary" type="submit" disabled={emailSaving}>{emailSaving ? 'Enviando...' : 'Enviar código'}</button>
            </div>
          </form>
        )}

        {emailStep === 'code' && (
          <form className="form-stack profile-form-block" onSubmit={confirmEmail}>
            {emailMessage && <p className="success-banner">{emailMessage}</p>}
            <label className="field"><span>Código enviado para {newEmail}</span><input className="verification-code-input" type="text" inputMode="numeric" required minLength={6} maxLength={6} value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" /></label>
            {emailError && <p className="error-banner">{emailError}</p>}
            <div className="form-actions">
              <button className="button button-muted" type="button" onClick={() => setEmailStep('request')}>Voltar</button>
              <button className="button button-primary" type="submit" disabled={emailSaving}>{emailSaving ? 'Confirmando...' : 'Confirmar'}</button>
            </div>
          </form>
        )}

        {emailStep === 'closed' && emailMessage && <p className="success-banner profile-message">{emailMessage}</p>}
      </section>

      <section className="profile-section">
        <button className="profile-expand-button" type="button" onClick={() => {
          setPasswordOpen((current) => !current);
          setPasswordError('');
          setPasswordMessage('');
        }}>
          <span className="profile-section-icon"><Icon>lock</Icon></span>
          <span><strong>Alterar senha</strong><small>Use sua senha atual para criar uma nova</small></span>
          <Icon>{passwordOpen ? 'expand_less' : 'expand_more'}</Icon>
        </button>

        {passwordOpen && (
          <form className="form-stack profile-form-block password-form" onSubmit={changePassword}>
            <label className="field"><span>Senha atual</span><input type="password" required value={passwords.current} onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))} /></label>
            <label className="field"><span>Nova senha</span><input type="password" required minLength={6} maxLength={72} value={passwords.next} onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))} /></label>
            <label className="field"><span>Confirmar nova senha</span><input type="password" required minLength={6} maxLength={72} value={passwords.confirm} onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))} /></label>
            {passwordError && <p className="error-banner">{passwordError}</p>}
            <button className="button button-primary" type="submit" disabled={passwordSaving}>{passwordSaving ? 'Alterando...' : 'Alterar senha'}</button>
          </form>
        )}
        {!passwordOpen && passwordMessage && <p className="success-banner profile-message">{passwordMessage}</p>}
      </section>
    </AppShell>
  );
}
