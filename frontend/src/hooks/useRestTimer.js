import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'korvix-gym:rest-timer';

function initialTimer(sessionId) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || String(stored.sessionId) !== String(sessionId)) return null;

    if (stored.status === 'running' && stored.endAt) {
      const remaining = Math.max(0, Math.ceil((stored.endAt - Date.now()) / 1000));
      return {
        ...stored,
        remaining,
        status: remaining > 0 ? 'running' : 'finished',
      };
    }
    return stored;
  } catch {
    return null;
  }
}

function completionAlert() {
  try {
    navigator.vibrate?.([180, 80, 180]);
  } catch {
    // Vibração não é suportada em todos os dispositivos.
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.45);
    oscillator.addEventListener('ended', () => context.close().catch(() => {}));
  } catch {
    // Navegadores podem bloquear áudio fora de uma interação do usuário.
  }
}

export default function useRestTimer(sessionId) {
  const [timer, setTimer] = useState(() => initialTimer(sessionId));
  const notifiedRef = useRef(false);

  useEffect(() => {
    try {
      if (timer) localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // O timer continua em memória quando o armazenamento está indisponível.
    }
  }, [timer]);

  useEffect(() => {
    if (timer?.status !== 'running') return undefined;
    const interval = window.setInterval(() => {
      setTimer((current) => {
        if (!current || current.status !== 'running') return current;
        const remaining = Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000));
        if (remaining === current.remaining) return current;
        return {
          ...current,
          remaining,
          status: remaining > 0 ? 'running' : 'finished',
          endAt: remaining > 0 ? current.endAt : null,
        };
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [timer?.status]);

  useEffect(() => {
    if (timer?.status === 'finished' && !notifiedRef.current) {
      notifiedRef.current = true;
      completionAlert();
    }
  }, [timer?.status]);

  const start = useCallback((payload, seconds) => {
    const duration = Number(seconds) || 60;
    notifiedRef.current = false;
    setTimer({
      sessionId,
      exerciseId: payload.exerciseId ?? null,
      exerciseName: payload.exerciseName ?? '',
      setNumber: payload.setNumber ?? null,
      duration,
      remaining: duration,
      status: 'running',
      endAt: Date.now() + duration * 1000,
    });
  }, [sessionId]);

  const pause = useCallback(() => {
    setTimer((current) => {
      if (!current || current.status !== 'running') return current;
      const remaining = Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000));
      return { ...current, remaining, status: 'paused', endAt: null };
    });
  }, []);

  const resume = useCallback(() => {
    setTimer((current) => {
      if (!current || current.status !== 'paused') return current;
      return {
        ...current,
        status: 'running',
        endAt: Date.now() + current.remaining * 1000,
      };
    });
  }, []);

  const restart = useCallback(() => {
    notifiedRef.current = false;
    setTimer((current) => current ? {
      ...current,
      remaining: current.duration,
      status: 'running',
      endAt: Date.now() + current.duration * 1000,
    } : null);
  }, []);

  const skip = useCallback(() => {
    notifiedRef.current = false;
    setTimer(null);
  }, []);

  return { timer, start, pause, resume, restart, skip };
}
