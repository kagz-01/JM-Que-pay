export type TableStatus = "idle" | "busy" | "offline" | "maintenance";
export type SessionStatus = "pending" | "paid" | "released" | "failed" | "expired";
export type StaffRole = "owner" | "manager";
export type AlertSeverity = "info" | "warn" | "critical";

export type PoolTable = {
  id: string;
  locationId: string;
  locationName: string;
  locationSlug: string;
  city: string;
  area: string;
  name: string;
  code: string;
  priceKes: number;
  status: TableStatus;
  busySince: string | null;
  pendingGames: number;
  hubOnline: boolean;
  batteryPct: number;
  lastSeen: string;
  gameMinutes: number;
};

export type LocationCard = {
  id: string;
  name: string;
  slug: string;
  city: string;
  area: string;
  address: string;
  hours: string;
  gameMinutes: number;
  tableCount: number;
  busy: number;
  idle: number;
  offline: number;
  maintenance: number;
  pendingGames: number;
  todayKes: number;
};

export type PlaySession = {
  id: string;
  tableId: string;
  tableName: string;
  tableCode: string;
  locationId: string;
  locationName: string;
  amountKes: number;
  phoneMasked: string;
  checkoutId: string;
  mpesaRef: string | null;
  status: SessionStatus;
  paidAt: string | null;
  releasedAt: string | null;
  createdAt: string;
};

export type AlertRow = {
  id: string;
  locationId: string | null;
  locationName: string | null;
  tableId: string | null;
  tableName: string | null;
  kind: string;
  message: string;
  severity: AlertSeverity;
  resolved: boolean;
  createdAt: string;
};

export type StaffMe = {
  userId: string;
  orgId: string;
  orgName: string;
  tillNumber: string;
  role: StaffRole;
  locationId: string | null;
};

export type LcdLines = { line1: string; line2: string };
