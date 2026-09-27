import { UserRole } from "@/types";

const STAFF_PIN = "1234";
const OWNER_PIN = "8888";
const AUTH_STORAGE_KEY = "tabletapp_auth_session";

export type AuthState = {
  authenticatedRole: "none" | "kitchen" | "owner";
  unlockedAt: number | null;
};

export function getAuthState(): AuthState {
  if (typeof window === "undefined") {
    return { authenticatedRole: "none", unlockedAt: null };
  }
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { authenticatedRole: "none", unlockedAt: null };
    const parsed = JSON.parse(raw);
    // Auto-expire after 8 hours of inactivity
    if (Date.now() - (parsed.unlockedAt || 0) > 8 * 60 * 60 * 1000) {
      clearAuthSession();
      return { authenticatedRole: "none", unlockedAt: null };
    }
    return parsed;
  } catch {
    return { authenticatedRole: "none", unlockedAt: null };
  }
}

export function verifyPin(pin: string, requestedRole: "kitchen" | "owner"): { success: boolean; error?: string } {
  const cleanPin = pin.trim();
  if (requestedRole === "kitchen") {
    // Owner PIN also unlocks kitchen
    if (cleanPin === STAFF_PIN || cleanPin === OWNER_PIN) {
      const state: AuthState = {
        authenticatedRole: "kitchen",
        unlockedAt: Date.now(),
      };
      saveAuthSession(state);
      return { success: true };
    }
    return { success: false, error: "Invalid Staff PIN. (Default: 1234)" };
  }

  if (requestedRole === "owner") {
    if (cleanPin === OWNER_PIN) {
      const state: AuthState = {
        authenticatedRole: "owner",
        unlockedAt: Date.now(),
      };
      saveAuthSession(state);
      return { success: true };
    }
    return { success: false, error: "Invalid Manager PIN. (Default: 8888)" };
  }

  return { success: false, error: "Access Denied" };
}

export function saveAuthSession(state: AuthState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function canAccessRole(role: UserRole, currentAuth: AuthState): boolean {
  if (role === "guest") return true;
  if (role === "kitchen") {
    return currentAuth.authenticatedRole === "kitchen" || currentAuth.authenticatedRole === "owner";
  }
  if (role === "owner") {
    return currentAuth.authenticatedRole === "owner";
  }
  return false;
}
