import { Badge } from "@/components/ui/badge";
import type { SessionStatus, TableStatus } from "@/lib/cuepay/types";

const tableLabel: Record<TableStatus, string> = {
  idle: "Idle",
  busy: "Busy",
  offline: "Offline",
  maintenance: "Maintenance",
};

const sessionLabel: Record<SessionStatus, string> = {
  pending: "STK sent",
  paid: "Paid",
  released: "Released",
  failed: "Failed",
  expired: "Expired",
};

export function TableStatusBadge({ status }: { status: TableStatus }) {
  return <Badge tone={status}>{tableLabel[status]}</Badge>;
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return <Badge tone={status}>{sessionLabel[status]}</Badge>;
}
