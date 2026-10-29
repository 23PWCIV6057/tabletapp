import { UserRole } from "@/types";

const AUTH_STORAGE_KEY = "tabletapp_auth_session";

export type AuthState = {
  authenticatedRole: "none" | "kitchen" | "owner";
  unlockedAt: number | null;
  sessionToken?: string;
};

export function getAuthState(): AuthState {
  if (typeof window === "undefined") {
    return { authenticatedRole: "none", unlockedAt: null };
  }
  try {
    const raw =
      sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
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

export async function verifyPinServer(
  pin: string,
  requestedRole: "kitchen" | "owner",
  restaurant?: string
): Promise<{ success: boolean; role?: "kitchen" | "owner"; error?: string }> {
  try {
    const res = await fetch("/api/auth/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pin.trim(), requestedRole, restaurant }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const state: AuthState = {
        authenticatedRole: data.role || requestedRole,
        unlockedAt: data.unlockedAt || Date.now(),
        sessionToken: data.sessionToken,
      };
      saveAuthSession(state);
      return { success: true, role: state.authenticatedRole as "kitchen" | "owner" };
    }
    return { success: false, error: data.error || "Incorrect PIN" };
  } catch {
    return { success: false, error: "Network error verifying PIN." };
  }
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
    return (
      currentAuth.authenticatedRole === "kitchen" ||
      currentAuth.authenticatedRole === "owner"
    );
  }
  if (role === "owner") {
    return currentAuth.authenticatedRole === "owner";
  }
  return false;
}
