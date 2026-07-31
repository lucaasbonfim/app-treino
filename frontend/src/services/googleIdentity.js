// Carrega e inicializa o Google Identity Services sob demanda: o script só entra
// na página quando a tela de login precisa dele.
const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;
let initializedClientId = null;
let credentialHandler = null;

function getGoogleIdentity() {
  return window.google?.accounts?.id || null;
}

export function loadGoogleIdentity() {
  const loaded = getGoogleIdentity();
  if (loaded) return Promise.resolve(loaded);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const handleLoad = () => {
      const identity = getGoogleIdentity();
      if (identity) {
        resolve(identity);
        return;
      }
      reject(new Error('Google Identity Services não ficou disponível após o carregamento.'));
    };
    const handleError = () => {
      scriptPromise = null;
      reject(new Error('Não foi possível carregar o Google Identity Services.'));
    };

    const existing = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.onload = handleLoad;
    script.onerror = handleError;
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// O GIS só aceita um initialize por página, então guardamos o handler atual
// num ponteiro que a tela troca a cada montagem.
export function initializeGoogleIdentity(clientId, onCredential) {
  const identity = getGoogleIdentity();
  if (!identity) throw new Error('Google Identity Services ainda não foi carregado.');

  if (initializedClientId && initializedClientId !== clientId) {
    throw new Error('O Google Identity Services já foi inicializado com outro Client ID.');
  }

  credentialHandler = onCredential;

  if (!initializedClientId) {
    identity.initialize({
      client_id: clientId,
      callback: (response) => credentialHandler?.(response),
    });
    initializedClientId = clientId;
  }

  return identity;
}

export function clearGoogleCredentialHandler(handler) {
  if (credentialHandler === handler) credentialHandler = null;
}

// O ID token é um JWT; o payload traz nome e e-mail que usamos para pré-preencher
// o cadastro. Não serve como prova de nada — quem valida é o backend.
export function decodeGoogleCredential(credential) {
  try {
    const payload = String(credential).split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}
