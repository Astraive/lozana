import { getItem, setItem, removeItem } from "../storage";

interface Session {
  token?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  expiresAt?: string;
}

const SESSION_KEY = "lozana:session";

/**
 * Retrieve the current session from localStorage.
 */
export function getSession(): Session | null {
  return getItem<Session>(SESSION_KEY);
}

/**
 * Store a session in localStorage.
 */
export function setSession(session: Session | null): void {
  if (session === null) {
    removeItem(SESSION_KEY);
  } else {
    setItem<Session>(SESSION_KEY, session);
  }
}
