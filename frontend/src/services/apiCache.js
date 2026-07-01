import api from './api';

const CACHE_SCHEMA_VERSION = 1;
const CACHE_STORAGE_KEY = `app-treino:api-cache:v${CACHE_SCHEMA_VERSION}`;
const CACHE_EVENT_NAME = 'app-treino:api-cache';
const CACHE_FRESH_MS = 5 * 60 * 1000;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 30;

const responseCache = new Map();
const pendingRequests = new Map();
let cacheHydrated = false;
let cacheEpoch = 0;
let persistTimer;

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

function parseStoredJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getSessionCacheScope() {
  const storage = getStorage();
  if (!storage) return 'anonymous';

  const user = parseStoredJson(storage.getItem('app-treino:user'));
  if (user?.id) return `user:${user.id}`;
  if (user?.email) return `email:${user.email}`;

  const token = storage.getItem('app-treino:token');
  return token ? `token:${token.slice(-16)}` : 'anonymous';
}

function normalizeCacheValue(value) {
  if (Array.isArray(value)) return value.map(normalizeCacheValue);
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.keys(value).sort().reduce((normalized, key) => {
      if (value[key] !== undefined) normalized[key] = normalizeCacheValue(value[key]);
      return normalized;
    }, {});
  }
  return value;
}

function buildCacheKey(url, config = {}) {
  return [
    getSessionCacheScope(),
    'GET',
    url,
    JSON.stringify(normalizeCacheValue(config.params || null)),
  ].join('::');
}

function cloneData(data) {
  if (data === null || data === undefined) return data;
  if (typeof structuredClone === 'function') return structuredClone(data);
  return JSON.parse(JSON.stringify(data));
}

function normalizeResponse(response) {
  return {
    data: cloneData(response.data),
    status: response.status,
    statusText: response.statusText,
    headers: response?.headers ? { ...response.headers } : {},
  };
}

function cloneResponse(response, cacheMeta = {}) {
  return {
    ...response,
    data: cloneData(response.data),
    headers: response?.headers ? { ...response.headers } : response?.headers,
    cache: {
      ...(response.cache || {}),
      ...cacheMeta,
    },
  };
}

function notifyCacheListeners(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CACHE_EVENT_NAME, { detail }));
}

function hydrateCache() {
  if (cacheHydrated) return;
  cacheHydrated = true;

  const stored = parseStoredJson(getStorage()?.getItem(CACHE_STORAGE_KEY));
  const entries = Array.isArray(stored?.entries) ? stored.entries : [];
  const now = Date.now();

  entries.forEach(([key, entry]) => {
    if (entry?.response && entry.expiresAt > now) responseCache.set(key, entry);
  });
}

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (!entry || entry.expiresAt <= now) responseCache.delete(key);
  }

  if (responseCache.size <= MAX_CACHE_ENTRIES) return;

  const oldestKeys = [...responseCache.entries()]
    .sort((left, right) => (left[1].fetchedAt || 0) - (right[1].fetchedAt || 0))
    .map(([key]) => key);

  while (responseCache.size > MAX_CACHE_ENTRIES && oldestKeys.length) {
    responseCache.delete(oldestKeys.shift());
  }
}

function persistCacheNow() {
  const storage = getStorage();
  if (!storage) return;

  pruneCache();
  try {
    storage.setItem(CACHE_STORAGE_KEY, JSON.stringify({
      version: CACHE_SCHEMA_VERSION,
      entries: [...responseCache.entries()],
    }));
  } catch {
    storage.removeItem(CACHE_STORAGE_KEY);
  }
}

function scheduleCachePersist() {
  if (typeof window === 'undefined') return;
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = undefined;
    persistCacheNow();
  }, 200);
}

function getCacheEntry(cacheKey) {
  hydrateCache();
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(cacheKey);
    scheduleCachePersist();
    return null;
  }
  return entry;
}

function storeCacheEntry(cacheKey, url, response, options = {}, epoch = cacheEpoch) {
  if (epoch !== cacheEpoch) return null;

  const now = Date.now();
  const freshMs = Number(options.freshMs ?? options.ttl ?? CACHE_FRESH_MS);
  const maxAgeMs = Math.max(Number(options.maxAgeMs ?? CACHE_MAX_AGE_MS), freshMs);
  const entry = {
    response: normalizeResponse(response),
    fetchedAt: now,
    freshUntil: now + freshMs,
    expiresAt: now + maxAgeMs,
  };

  responseCache.set(cacheKey, entry);
  pruneCache();
  scheduleCachePersist();
  notifyCacheListeners({ type: 'set', key: cacheKey, url });
  return entry;
}

function requestAndCache(url, config, cacheKey, options = {}, requestOptions = {}) {
  const pendingRequest = pendingRequests.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const requestEpoch = cacheEpoch;
  let requestPromise;
  requestPromise = api.get(url, config)
    .then((response) => {
      const entry = storeCacheEntry(cacheKey, url, response, options, requestEpoch);
      return entry?.response || normalizeResponse(response);
    })
    .catch((error) => {
      if (requestOptions.suppressErrors) return null;
      throw error;
    })
    .finally(() => {
      if (pendingRequests.get(cacheKey) === requestPromise) pendingRequests.delete(cacheKey);
    });

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export async function cachedGet(url, config = {}, options = {}) {
  const cacheKey = buildCacheKey(url, config);
  const cachedEntry = getCacheEntry(cacheKey);
  const force = Boolean(options.force);
  const allowStale = options.allowStale !== false;

  if (!force && cachedEntry) {
    const stale = cachedEntry.freshUntil <= Date.now();
    if (!stale || allowStale) {
      if (stale && options.revalidate !== false) {
        requestAndCache(url, config, cacheKey, options, { suppressErrors: true });
      }
      return cloneResponse(cachedEntry.response, {
        hit: true,
        stale,
        key: cacheKey,
      });
    }
  }

  const response = await requestAndCache(url, config, cacheKey, options);
  return cloneResponse(response, {
    hit: false,
    stale: false,
    key: cacheKey,
  });
}

function getCachedResponse(url, config = {}, options = {}) {
  const cacheKey = buildCacheKey(url, config);
  const entry = getCacheEntry(cacheKey);
  if (!entry) return null;

  const stale = entry.freshUntil <= Date.now();
  if (stale && options.allowStale === false) return null;
  return cloneResponse(entry.response, {
    hit: true,
    stale,
    key: cacheKey,
  });
}

function clearRequestCache() {
  hydrateCache();
  responseCache.clear();
  pendingRequests.clear();
  cacheEpoch += 1;
  getStorage()?.removeItem(CACHE_STORAGE_KEY);
  notifyCacheListeners({ type: 'clear' });
}

export async function runMutation(request) {
  const response = await request();
  clearRequestCache();
  return response;
}

export const apiCache = {
  clear: clearRequestCache,
  eventName: CACHE_EVENT_NAME,
  getArray(url, config = {}, options = {}) {
    const data = getCachedResponse(url, config, options)?.data;
    return Array.isArray(data) ? data : [];
  },
  getData(url, config = {}, options = {}) {
    return getCachedResponse(url, config, options)?.data;
  },
  getResponse: getCachedResponse,
  has(url, config = {}, options = {}) {
    return Boolean(getCachedResponse(url, config, options));
  },
  subscribe(listener) {
    if (typeof window === 'undefined') return () => {};
    const handler = (event) => listener(event.detail);
    window.addEventListener(CACHE_EVENT_NAME, handler);
    return () => window.removeEventListener(CACHE_EVENT_NAME, handler);
  },
};
