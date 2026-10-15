import { AppUser } from '../types';

const TOKEN_KEY = 'fxtt_session_token';
const ACTIVITY_KEY = 'fxtt_last_activity';
const TIMEOUT_KEY = 'fxtt_timeout_minutes';
const USER_KEY = 'fxtt_current_user';

export function getStoredSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredTimeoutMinutes(): number {
  try {
    const val = localStorage.getItem(TIMEOUT_KEY);
    if (val) {
      const num = parseInt(val, 10);
      if ([15, 30, 60].includes(num)) return num;
    }
  } catch {}
  return 30; // default 30 minutes
}

export function setStoredTimeoutMinutes(minutes: number): void {
  try {
    localStorage.setItem(TIMEOUT_KEY, String(minutes));
  } catch {}
}

export function getStoredLastActivity(): number {
  try {
    const val = localStorage.getItem(ACTIVITY_KEY);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch {}
  return Date.now();
}

export function updateStoredLastActivity(): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {}
}

export function saveSession(token: string, user: AppUser, timeoutMinutes: number = 30): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    localStorage.setItem(TIMEOUT_KEY, String(timeoutMinutes));
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

/**
 * Check if current session is active without waiting for server response
 * Used on page reload so user does NOT get logged out quickly!
 */
export function isLocalSessionActive(): boolean {
  const token = getStoredSessionToken();
  if (!token) return false;

  const lastActivity = getStoredLastActivity();
  const timeoutMs = getStoredTimeoutMinutes() * 60 * 1000;
  const elapsed = Date.now() - lastActivity;

  return elapsed < timeoutMs;
}

/**
 * Validates session token with the server
 */
export async function verifyServerSession(): Promise<{
  valid: boolean;
  user?: AppUser;
  timeoutMinutes?: number;
}> {
  const token = getStoredSessionToken();
  if (!token) return { valid: false };

  // Check local activity timestamp first
  const lastActivity = getStoredLastActivity();
  const timeoutMs = getStoredTimeoutMinutes() * 60 * 1000;
  if (Date.now() - lastActivity > timeoutMs) {
    clearSession();
    return { valid: false };
  }

  try {
    const res = await fetch('/api/auth/session', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.valid && data.user) {
        updateStoredLastActivity();
        if (data.sessionTimeoutMinutes) {
          setStoredTimeoutMinutes(data.sessionTimeoutMinutes);
        }
        return {
          valid: true,
          user: data.user,
          timeoutMinutes: data.sessionTimeoutMinutes || 30
        };
      }
    }
  } catch (err) {
    console.warn('Network check failed, falling back to local session state:', err);
    // If network error during verification, rely on valid local session timestamp
    if (isLocalSessionActive()) {
      try {
        const cachedUser = localStorage.getItem(USER_KEY);
        if (cachedUser) {
          return { valid: true, user: JSON.parse(cachedUser), timeoutMinutes: getStoredTimeoutMinutes() };
        }
      } catch {}
    }
  }

  clearSession();
  return { valid: false };
}

/**
 * Global Inactivity Tracker
 * Tracks user activity and triggers auto-logout if no activity for configured minutes
 */
export function initSessionActivityTracker(onInactivityLogout: () => void): () => void {
  let lastTouchServerTime = 0;
  let lastActivityRecordTime = Date.now();

  const handleUserActivity = () => {
    const now = Date.now();
    // Throttle local activity updates to once every 2 seconds
    if (now - lastActivityRecordTime > 2000) {
      lastActivityRecordTime = now;
      updateStoredLastActivity();
    }

    // Ping server keep-alive at most once every 45 seconds
    if (now - lastTouchServerTime > 45000) {
      lastTouchServerTime = now;
      const token = getStoredSessionToken();
      if (token) {
        fetch('/api/auth/touch-session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
    }
  };

  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

  // Check for inactivity expiration every 5 seconds
  const intervalId = setInterval(() => {
    const token = getStoredSessionToken();
    if (!token) return;

    const lastAct = getStoredLastActivity();
    const timeoutMs = getStoredTimeoutMinutes() * 60 * 1000;
    const elapsed = Date.now() - lastAct;

    if (elapsed >= timeoutMs) {
      console.warn(`User inactive for ${(elapsed / 60000).toFixed(1)} mins. Triggering auto-logout.`);
      clearSession();
      onInactivityLogout();
    }
  }, 5000);

  return () => {
    clearInterval(intervalId);
    activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
  };
}
