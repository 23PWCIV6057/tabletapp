import { TableOccupancyStatus, TableSession } from "@/types";

export type TableEntry = {
  tableNumber: number;
  token: string;
  name: string;
};

const TABLE_STORAGE_KEY = "tabletapp_table_tokens_v1";
const TABLE_SESSIONS_STORAGE_KEY = "tabletapp_table_sessions_v1";

// Default deterministic tokens for Tables 1 through 16
const DEFAULT_TABLES: TableEntry[] = [
  { tableNumber: 1, token: "tok_t1_8f2a9c", name: "Table 1 (Window)" },
  { tableNumber: 2, token: "tok_t2_4b7e1d", name: "Table 2 (Window)" },
  { tableNumber: 3, token: "tok_t3_9c1a5f", name: "Table 3 (Main Hall)" },
  { tableNumber: 4, token: "tok_t4_3d8e2b", name: "Table 4 (Booth)" },
  { tableNumber: 5, token: "tok_t5_7e4a1c", name: "Table 5 (Booth)" },
  { tableNumber: 6, token: "tok_t6_2f9d8a", name: "Table 6 (Patio)" },
  { tableNumber: 7, token: "tok_t7_6a3b9e", name: "Table 7 (Patio)" },
  { tableNumber: 8, token: "tok_t8_1c7f4d", name: "Table 8 (Center)" },
  { tableNumber: 9, token: "tok_t9_5e2d8b", name: "Table 9 (Center)" },
  { tableNumber: 10, token: "tok_t10_4f9a3c", name: "Table 10 (Bar High-Top)" },
  { tableNumber: 11, token: "tok_t11_8d1e7b", name: "Table 11 (Bar High-Top)" },
  { tableNumber: 12, token: "tok_t12_3a6c9f", name: "Table 12 (Balcony)" },
  { tableNumber: 13, token: "tok_t13_7b4e2a", name: "Table 13 (Balcony)" },
  { tableNumber: 14, token: "tok_t14_2c8f5d", name: "Table 14 (Private Dining)" },
  { tableNumber: 15, token: "tok_t15_6e1a9b", name: "Table 15 (Private Dining)" },
  { tableNumber: 16, token: "tok_t16_9d3b7e", name: "Table 16 (Outdoor Terrace)" },
];

export function getStoredTables(): TableEntry[] {
  if (typeof window === "undefined") return DEFAULT_TABLES;
  try {
    const raw = localStorage.getItem(TABLE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(DEFAULT_TABLES));
      return DEFAULT_TABLES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TABLES;
  }
}

export function saveStoredTables(tables: TableEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(tables));
  } catch {
    // Ignore
  }
}

export function getTableByToken(token: string): TableEntry | null {
  const clean = token.trim();
  const tables = getStoredTables();
  return tables.find((t) => t.token === clean) || null;
}

export function getTokenForTable(tableNumber: number): string {
  const tables = getStoredTables();
  const found = tables.find((t) => t.tableNumber === tableNumber);
  return found ? found.token : `tok_t${tableNumber}_gen${Math.random().toString(36).substring(2, 8)}`;
}

export function rotateTokenForTable(tableNumber: number): string {
  const tables = getStoredTables();
  const rand = Math.random().toString(36).substring(2, 8);
  const newToken = `tok_t${tableNumber}_${rand}`;

  const updated = tables.map((t) =>
    t.tableNumber === tableNumber ? { ...t, token: newToken } : t
  );

  saveStoredTables(updated);
  return newToken;
}

// Active guest table session persistence
const GUEST_SESSION_KEY = "tabletapp_active_guest_session";

export type GuestSession = {
  tableNumber: number;
  token: string;
  activatedAt: number;
};

export function getActiveGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GUEST_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveGuestSession(session: GuestSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore
  }
}

export function clearActiveGuestSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    // Ignore
  }
}

// Table Floor Lifecycle Management (Tables 1 - 16)
export function getInitialTableSessions(): Record<number, TableSession> {
  const map: Record<number, TableSession> = {};
  for (let i = 1; i <= 16; i++) {
    map[i] = {
      tableNumber: i,
      status: "VACANT",
      lastActivityAt: Date.now(),
    };
  }
  // Initialize sample active tables based on initial mock orders (Tables 3, 6, 7, 8, 9)
  map[3] = { tableNumber: 3, status: "ACTIVE_ORDER", seatedAt: Date.now() - 30 * 60 * 1000, lastActivityAt: Date.now() - 2 * 60 * 1000 };
  map[6] = { tableNumber: 6, status: "BILL_REQUESTED", seatedAt: Date.now() - 45 * 60 * 1000, lastActivityAt: Date.now() - 5 * 60 * 1000 };
  map[7] = { tableNumber: 7, status: "ACTIVE_ORDER", seatedAt: Date.now() - 15 * 60 * 1000, lastActivityAt: Date.now() - 3 * 60 * 1000 };
  map[8] = { tableNumber: 8, status: "SEATED", seatedAt: Date.now() - 10 * 60 * 1000, lastActivityAt: Date.now() - 1 * 60 * 1000 };
  map[9] = { tableNumber: 9, status: "ACTIVE_ORDER", seatedAt: Date.now() - 20 * 60 * 1000, lastActivityAt: Date.now() - 2 * 60 * 1000 };
  return map;
}

export function getStoredTableSessions(): Record<number, TableSession> {
  if (typeof window === "undefined") return getInitialTableSessions();
  try {
    const raw = localStorage.getItem(TABLE_SESSIONS_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialTableSessions();
      localStorage.setItem(TABLE_SESSIONS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialTableSessions();
  }
}

export function saveStoredTableSessions(sessions: Record<number, TableSession>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TABLE_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore
  }
}

export function updateTableStatus(
  tableNumber: number,
  status: TableOccupancyStatus,
  seatedAt?: number
): TableSession {
  const sessions = getStoredTableSessions();
  const current = sessions[tableNumber] || { tableNumber, status: "VACANT" };
  const updated: TableSession = {
    ...current,
    status,
    seatedAt: seatedAt !== undefined ? seatedAt : status === "SEATED" && !current.seatedAt ? Date.now() : current.seatedAt,
    lastActivityAt: Date.now(),
  };
  sessions[tableNumber] = updated;
  saveStoredTableSessions(sessions);
  return updated;
}

export function clearTableFloorSession(tableNumber: number): TableSession {
  const sessions = getStoredTableSessions();
  const cleared: TableSession = {
    tableNumber,
    status: "VACANT",
    seatedAt: undefined,
    lastActivityAt: Date.now(),
  };
  sessions[tableNumber] = cleared;
  saveStoredTableSessions(sessions);
  return cleared;
}
