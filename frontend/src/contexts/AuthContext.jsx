import { useCallback, useEffect, useMemo, useState } from 'react';
import { AUTH_EXPIRED_EVENT } from '../services/api';
import { apiCache, authService } from '../services';
import { AuthContext } from './auth-context';

const TOKEN_KEY = 'app-treino:token';
const USER_KEY = 'app-treino:user';

function initialSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    return token && user ? { token, user } : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(initialSession);

  const clearSession = useCallback(() => {
    apiCache.clear();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setSession({ token: null, user: null });
  }, []);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, clearSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, clearSession);
  }, [clearSession]);

  const saveSession = useCallback(({ token, user }) => {
    apiCache.clear();
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setSession({ token, user });
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login({ email, password });
    saveSession(data);
  }, [saveSession]);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authService.register({ name, email, password });
    return data;
  }, []);

  const confirmRegisterCode = useCallback(async (email, code) => {
    const { data } = await authService.verifyRegisterCode({ email, code });
    return data;
  }, []);

  const updateUser = useCallback((user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setSession((current) => ({ ...current, user }));
  }, []);

  const value = useMemo(() => ({
    ...session,
    login,
    register,
    confirmRegisterCode,
    updateUser,
    logout: clearSession,
  }), [clearSession, confirmRegisterCode, login, register, session, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
