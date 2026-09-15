import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { broadcast } from "./events";
import { iso, maskPhone, normalizeKePhone, randomRef } from "./format";
import type {
  AlertRow,
  LocationCard,
  PlaySession,
  PoolTable,
  SessionStatus,
  StaffMe,
  TableStatus,
} from "./types";

const DEMO_ORG = "org-cuepay-demo";

type TableRow = {
  id: string;
  location_id: string;
  location_name: string;
  location_slug: string;
  city: string;
  area: string;
  name: string;
  code: string;
  price_kes: number;
  status: TableStatus;
  busy_since: unknown;
  pending_games: number;
  hub_online: boolean;
  battery_pct: number;
  last_seen: unknown;
  game_minutes: number;
};

function mapTable(r: TableRow): PoolTable {
  return {
    id: r.id,
    locationId: r.location_id,
    locationName: r.location_name,
    locationSlug: r.location_slug,
    city: r.city,
    area: r.area,
    name: r.name,
    code: r.code,
    priceKes: Number(r.price_kes),
    status: r.status,
    busySince: iso(r.busy_since),
    pendingGames: Number(r.pending_games),
    hubOnline: Boolean(r.hub_online),
    batteryPct: Number(r.battery_pct),
    lastSeen: iso(r.last_seen) ?? new Date().toISOString(),
    gameMinutes: Number(r.game_minutes),
  };
}

type SessionRow = {
  id: string;
  table_id: string;
  table_name: string;
  table_code: string;
  location_id: string;
  location_name: string;
  amount_kes: number;
  phone_masked: string;
  checkout_id: string;
  mpesa_ref: string | null;
  status: SessionStatus;
  paid_at: unknown;
  released_at: unknown;
  created_at: unknown;
};

function mapSession(r: SessionRow): PlaySession {
  return {
    id: r.id,
    tableId: r.table_id,
    tableName: r.table_name,
    tableCode: r.table_code,
    locationId: r.location_id,
    locationName: r.location_name,
    amountKes: Number(r.amount_kes),
    phoneMasked: r.phone_masked,
    checkoutId: r.checkout_id,
    mpesaRef: r.mpesa_ref,
    status: r.status,
    paidAt: iso(r.paid_at),
    releasedAt: iso(r.released_at),
    createdAt: iso(r.created_at) ?? new Date().toISOString(),
  };
}

async function tick(sql: Awaited<ReturnType<typeof getSql>>) {
  const expired = await sql<{ id: string; location_id: string }>`
    select t.id, t.location_id
    from pool_tables t
    join locations l on l.id = t.location_id
    where t.status = 'busy'
      and t.busy_since is not null
      and t.busy_since + (l.game_minutes || ' minutes')::interval < now()
  `;

  for (const row of expired) {
    // Try to pop the queue
    const paid = await sql<{ id: string }>`
      select id from play_sessions
      where table_id = ${row.id} and status = 'paid'
      order by paid_at asc
      limit 1
    `;

    if (paid.length > 0) {
      await sql`
        update play_sessions
        set status = 'released', released_at = now()
        where id = ${paid[0]!.id}
      `;
      await sql`
        update pool_tables
        set status = 'busy',
            busy_since = now() + interval '2 minutes',
            pending_games = greatest(pending_games - 1, 0)
        where id = ${row.id}
      `;
      broadcast({ type: "session:update", locationId: row.location_id, sessionId: paid[0]!.id });
    } else {
      await sql`
        update pool_tables
        set status = 'idle', busy_since = null
        where id = ${row.id}
      `;
    }
    broadcast({ type: "table:update", locationId: row.location_id, tableId: row.id });
  }

  const low = await sql<{ id: string; location_id: string; name: string; loc: string; battery_pct: number }>`
    select t.id, t.location_id, t.name, l.name as loc, t.battery_pct
    from pool_tables t
    join locations l on l.id = t.location_id
    where t.battery_pct <= 20
  `;
  for (const row of low) {
    const open = await sql<{ id: string }>`
      select id from alerts
      where table_id = ${row.id} and kind = 'low_battery' and resolved = false
      limit 1
    `;
    if (open.length === 0) {
      await sql`
        insert into alerts (id, org_id, location_id, table_id, kind, message, severity)
        values (
          ${crypto.randomUUID()},
          ${DEMO_ORG},
          ${row.location_id},
          ${row.id},
          'low_battery',
          ${`${row.loc} · ${row.name} battery at ${row.battery_pct}%. Swap the pack.`},
          'warn'
        )
      `;
    }
  }

  const offline = await sql<{ id: string; location_id: string; name: string; loc: string }>`
    select t.id, t.location_id, t.name, l.name as loc
    from pool_tables t
    join locations l on l.id = t.location_id
    where t.hub_online = false or t.status = 'offline'
  `;
  for (const row of offline) {
    const open = await sql<{ id: string }>`
      select id from alerts
      where table_id = ${row.id} and kind = 'hub_offline' and resolved = false
      limit 1
    `;
    if (open.length === 0) {
      await sql`
        insert into alerts (id, org_id, location_id, table_id, kind, message, severity)
        values (
          ${crypto.randomUUID()},
          ${DEMO_ORG},
          ${row.location_id},
          ${row.id},
          'hub_offline',
          ${`${row.loc} · ${row.name} node is offline.`},
          'critical'
        )
      `;
    }
  }
}

async function ensureStaff(userId: string): Promise<StaffMe> {
  const sql = await getSql();
  await sql`
    insert into staff (user_id, org_id, role)
    values (${userId}, ${DEMO_ORG}, 'owner')
    on conflict (user_id) do nothing
  `;
  const rows = await sql<{
    user_id: string;
    org_id: string;
    role: "owner" | "manager";
    location_id: string | null;
    org_name: string;
    till_number: string;
  }>`
    select s.user_id, s.org_id, s.role, s.location_id, o.name as org_name, o.till_number
    from staff s
    join organizations o on o.id = s.org_id
    where s.user_id = ${userId}
    limit 1
  `;
  const r = rows[0];
  if (!r) throw new Error("Could not attach staff record");
  return {
    userId: r.user_id,
    orgId: r.org_id,
    orgName: r.org_name,
    tillNumber: r.till_number,
    role: r.role,
    locationId: r.location_id,
  };
}

async function assertTableAccess(
  userId: string,
  tableId: string,
): Promise<{ staff: StaffMe; table: TableRow }> {
  const staff = await ensureStaff(userId);
  const sql = await getSql();
  const found = await sql<TableRow>`
    select t.id, t.location_id, l.name as location_name, l.slug as location_slug,
      l.city, l.area, t.name, t.code, t.price_kes, t.status, t.busy_since,
      t.pending_games, t.hub_online, t.battery_pct, t.last_seen, l.game_minutes
    from pool_tables t
    join locations l on l.id = t.location_id
    where t.id = ${tableId} and l.org_id = ${staff.orgId}
    limit 1
  `;
  const table = found[0];
  if (!table) throw new Error("Table not found");
  if (staff.role === "manager" && staff.locationId && staff.locationId !== table.location_id) {
    throw new Error("Not allowed for this location");
  }
  return { staff, table };
}

async function fetchLocations(orgId: string, locationId: string | null): Promise<LocationCard[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    name: string;
    slug: string;
    city: string;
    area: string;
    address: string;
    hours: string;
    game_minutes: number;
    table_count: number;
    busy: number;
    idle: number;
    offline: number;
    maintenance: number;
    pending_games: number;
    today_kes: number;
  }>`
    select
      l.id, l.name, l.slug, l.city, l.area, l.address, l.hours, l.game_minutes,
      count(t.id)::int as table_count,
      count(*) filter (where t.status = 'busy')::int as busy,
      count(*) filter (where t.status = 'idle')::int as idle,
      count(*) filter (where t.status = 'offline')::int as offline,
      count(*) filter (where t.status = 'maintenance')::int as maintenance,
      coalesce(sum(t.pending_games), 0)::int as pending_games,
      coalesce((
        select sum(s.amount_kes)::int
        from play_sessions s
        where s.location_id = l.id
          and s.status in ('paid', 'released')
          and s.paid_at >= date_trunc('day', now() at time zone 'Africa/Nairobi')
              at time zone 'Africa/Nairobi'
      ), 0) as today_kes
    from locations l
    left join pool_tables t on t.location_id = l.id
    where l.org_id = ${orgId}
      and (${locationId}::text is null or l.id = ${locationId})
    group by l.id
    order by
      case l.city when 'Nairobi' then 0 when 'Mombasa' then 1 else 2 end,
      l.name
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    city: r.city,
    area: r.area,
    address: r.address,
    hours: r.hours,
    gameMinutes: Number(r.game_minutes),
    tableCount: Number(r.table_count),
    busy: Number(r.busy),
    idle: Number(r.idle),
    offline: Number(r.offline),
    maintenance: Number(r.maintenance),
    pendingGames: Number(r.pending_games),
    todayKes: Number(r.today_kes),
  }));
}

async function fetchSessions(opts: {
  orgId: string;
  locationId?: string | null;
  limit?: number;
  q?: string;
}): Promise<PlaySession[]> {
  const sql = await getSql();
  const limit = opts.limit ?? 80;
  const q = opts.q?.trim() ?? "";
  const like = q ? `%${q.toLowerCase()}%` : null;
  const rows = await sql<SessionRow>`
    select s.id, s.table_id, t.name as table_name, t.code as table_code,
      s.location_id, l.name as location_name, s.amount_kes, s.phone_masked,
      s.checkout_id, s.mpesa_ref, s.status, s.paid_at, s.released_at, s.created_at
    from play_sessions s
    join pool_tables t on t.id = s.table_id
    join locations l on l.id = s.location_id
    where l.org_id = ${opts.orgId}
      and (${opts.locationId ?? null}::text is null or s.location_id = ${opts.locationId ?? null})
      and (
        ${like}::text is null
        or lower(t.name) like ${like}
        or lower(t.code) like ${like}
        or lower(l.name) like ${like}
        or lower(coalesce(s.mpesa_ref, '')) like ${like}
        or lower(s.phone_masked) like ${like}
      )
    order by s.created_at desc
    limit ${limit}
  `;
  return rows.map(mapSession);
}

async function fetchAlerts(orgId: string, locationId: string | null): Promise<AlertRow[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    location_id: string | null;
    location_name: string | null;
    table_id: string | null;
    table_name: string | null;
    kind: string;
    message: string;
    severity: AlertRow["severity"];
    resolved: boolean;
    created_at: unknown;
  }>`
    select a.id, a.location_id, l.name as location_name, a.table_id, t.name as table_name,
      a.kind, a.message, a.severity, a.resolved, a.created_at
    from alerts a
    left join locations l on l.id = a.location_id
    left join pool_tables t on t.id = a.table_id
    where a.org_id = ${orgId}
      and (${locationId}::text is null or a.location_id = ${locationId})
    order by a.resolved asc, a.created_at desc
    limit 40
  `;
  return rows.map((r) => ({
    id: r.id,
    locationId: r.location_id,
    locationName: r.location_name,
    tableId: r.table_id,
    tableName: r.table_name,
    kind: r.kind,
    message: r.message,
    severity: r.severity,
    resolved: Boolean(r.resolved),
    createdAt: iso(r.created_at) ?? new Date().toISOString(),
  }));
}

async function audit(
  sql: Awaited<ReturnType<typeof getSql>>,
  staff: StaffMe,
  action: string,
  detail: string,
  tableId: string | null,
) {
  await sql`
    insert into audit_log (id, org_id, user_id, table_id, action, detail)
    values (${crypto.randomUUID()}, ${staff.orgId}, ${staff.userId}, ${tableId}, ${action}, ${detail})
  `;
}

const tableCodeSchema = z.object({ code: z.string().min(1).max(24) });

export const listPublicLocations = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  await tick(sql);
  return fetchLocations(DEMO_ORG, null);
});

export const getPublicLocation = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await tick(sql);
    const locs = await sql<{
      id: string;
      name: string;
      slug: string;
      city: string;
      area: string;
      address: string;
      hours: string;
      game_minutes: number;
      till_number: string;
    }>`
      select l.id, l.name, l.slug, l.city, l.area, l.address, l.hours, l.game_minutes, o.till_number
      from locations l
      join organizations o on o.id = l.org_id
      where l.slug = ${data.slug}
      limit 1
    `;
    const loc = locs[0];
    if (!loc) return null;
    const tables = await sql<TableRow>`
      select t.id, t.location_id, l.name as location_name, l.slug as location_slug,
        l.city, l.area, t.name, t.code, t.price_kes, t.status, t.busy_since,
        t.pending_games, t.hub_online, t.battery_pct, t.last_seen, l.game_minutes
      from pool_tables t
      join locations l on l.id = t.location_id
      where t.location_id = ${loc.id}
      order by t.name
    `;
    return {
      id: loc.id,
      name: loc.name,
      slug: loc.slug,
      city: loc.city,
      area: loc.area,
      address: loc.address,
      hours: loc.hours,
      gameMinutes: Number(loc.game_minutes),
      tillNumber: loc.till_number,
      tables: tables.map(mapTable),
    };
  });

export const getPublicTable = createServerFn({ method: "GET" })
  .validator((data: z.infer<typeof tableCodeSchema>) => tableCodeSchema.parse(data))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await tick(sql);
    const rows = await sql<TableRow>`
      select t.id, t.location_id, l.name as location_name, l.slug as location_slug,
        l.city, l.area, t.name, t.code, t.price_kes, t.status, t.busy_since,
        t.pending_games, t.hub_online, t.battery_pct, t.last_seen, l.game_minutes
      from pool_tables t
      join locations l on l.id = t.location_id
      where t.code = ${data.code.toUpperCase()}
      limit 1
    `;
    const table = rows[0] ? mapTable(rows[0]) : null;
    if (!table) return null;
    const org = await sql<{ till_number: string }>`
      select o.till_number from locations l
      join organizations o on o.id = l.org_id
      where l.id = ${table.locationId}
      limit 1
    `;
    return { table, tillNumber: org[0]?.till_number ?? "564321" };
  });

export const initiateStk = createServerFn({ method: "POST" })
  .validator((data: { code: string; phone: string }) => data)
  .handler(async ({ data }) => {
    const phone = normalizeKePhone(data.phone);
    if (!phone) {
      return { ok: false as const, error: "Enter a valid Kenyan mobile number (07… or 01…)." };
    }
    const sql = await getSql();
    await tick(sql);
    const rows = await sql<TableRow>`
      select t.id, t.location_id, l.name as location_name, l.slug as location_slug,
        l.city, l.area, t.name, t.code, t.price_kes, t.status, t.busy_since,
        t.pending_games, t.hub_online, t.battery_pct, t.last_seen, l.game_minutes
      from pool_tables t
      join locations l on l.id = t.location_id
      where t.code = ${data.code.toUpperCase()}
      limit 1
    `;
    const table = rows[0];
    if (!table) return { ok: false as const, error: "Table not found." };
    if (table.status === "maintenance") {
      return { ok: false as const, error: "This table is in maintenance. Pick another." };
    }
    if (table.status === "offline" || !table.hub_online) {
      return { ok: false as const, error: "This table is offline. Ask staff for help." };
    }
    const id = crypto.randomUUID();
    const checkoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    await sql`
      insert into play_sessions (
        id, table_id, location_id, amount_kes, phone_masked, checkout_id, status
      ) values (
        ${id}, ${table.id}, ${table.location_id}, ${table.price_kes},
        ${maskPhone(phone)}, ${checkoutId}, 'pending'
      )
    `;
    return {
      ok: true as const,
      checkoutId,
      sessionId: id,
      amountKes: Number(table.price_kes),
      tableName: table.name,
      locationName: table.location_name,
      phoneMasked: maskPhone(phone),
    };
  });

export const confirmStk = createServerFn({ method: "POST" })
  .validator((data: { checkoutId: string; pin: string }) => data)
  .handler(async ({ data }) => {
    const pin = data.pin.replace(/\D/g, "");
    if (pin.length !== 4) {
      return { ok: false as const, error: "Enter the 4-digit M-Pesa PIN." };
    }
    if (pin === "0000") {
      const sql = await getSql();
      await sql`
        update play_sessions set status = 'failed'
        where checkout_id = ${data.checkoutId} and status = 'pending'
      `;
      return { ok: false as const, error: "Payment cancelled on the phone." };
    }
    const sql = await getSql();
    const rows = await sql<SessionRow>`
      select s.id, s.table_id, t.name as table_name, t.code as table_code,
        s.location_id, l.name as location_name, s.amount_kes, s.phone_masked,
        s.checkout_id, s.mpesa_ref, s.status, s.paid_at, s.released_at, s.created_at
      from play_sessions s
      join pool_tables t on t.id = s.table_id
      join locations l on l.id = s.location_id
      where s.checkout_id = ${data.checkoutId}
      limit 1
    `;
    const sess = rows[0];
    if (!sess) return { ok: false as const, error: "Payment session expired." };
    if (sess.status === "paid" || sess.status === "released") {
      return { ok: true as const, session: mapSession(sess), already: true };
    }
    if (sess.status !== "pending") {
      return { ok: false as const, error: "This payment is no longer pending." };
    }
    const ref = randomRef();
    await sql`
      update play_sessions
      set status = 'paid', paid_at = now(), mpesa_ref = ${ref}
      where id = ${sess.id} and status = 'pending'
    `;
    await sql`
      update pool_tables
      set pending_games = pending_games + 1
      where id = ${sess.table_id}
    `;
    const updated = await sql<SessionRow>`
      select s.id, s.table_id, t.name as table_name, t.code as table_code,
        s.location_id, l.name as location_name, s.amount_kes, s.phone_masked,
        s.checkout_id, s.mpesa_ref, s.status, s.paid_at, s.released_at, s.created_at
      from play_sessions s
      join pool_tables t on t.id = s.table_id
      join locations l on l.id = s.location_id
      where s.id = ${sess.id}
      limit 1
    `;
    broadcast({ type: "session:update", locationId: sess.location_id, sessionId: sess.id });
    broadcast({ type: "table:update", locationId: sess.location_id, tableId: sess.table_id });
    return { ok: true as const, session: mapSession(updated[0]!), already: false };
  });

export const releasePaidGame = createServerFn({ method: "POST" })
  .validator((data: { code: string; sessionId?: string }) => data)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await tick(sql);
    const tables = await sql<TableRow>`
      select t.id, t.location_id, l.name as location_name, l.slug as location_slug,
        l.city, l.area, t.name, t.code, t.price_kes, t.status, t.busy_since,
        t.pending_games, t.hub_online, t.battery_pct, t.last_seen, l.game_minutes
      from pool_tables t
      join locations l on l.id = t.location_id
      where t.code = ${data.code.toUpperCase()}
      limit 1
    `;
    const table = tables[0];
    if (!table) return { ok: false as const, error: "Table not found." };
    if (table.status === "maintenance") {
      return { ok: false as const, error: "Table is locked for maintenance." };
    }
    if (table.status === "offline" || !table.hub_online) {
      return { ok: false as const, error: "Node offline — cannot fire the solenoid." };
    }
    const paid = await sql<{ id: string }>`
      select id from play_sessions
      where table_id = ${table.id} and status = 'paid'
        and (${data.sessionId ?? null}::text is null or id = ${data.sessionId ?? null})
      order by paid_at asc
      limit 1
    `;
    const session = paid[0];
    if (!session) {
      return { ok: false as const, error: "No payment found — pay first." };
    }
    if (table.status === "busy") {
      await sql`
        update play_sessions
        set status = 'released', released_at = now()
        where id = ${session.id}
      `;
      await sql`
        update pool_tables
        set pending_games = greatest(pending_games - 1, 0)
        where id = ${table.id}
      `;
      broadcast({ type: "table:update", locationId: table.location_id, tableId: table.id });
      return {
        ok: true as const,
        queued: true,
        message: "Payment stacked. Balls will drop when the current game ends — or press again after.",
      };
    }
    await sql`
      update play_sessions
      set status = 'released', released_at = now()
      where id = ${session.id}
    `;
    await sql`
      update pool_tables
      set pending_games = greatest(pending_games - 1, 0),
          status = 'busy',
          busy_since = now()
      where id = ${table.id}
    `;
    broadcast({ type: "table:update", locationId: table.location_id, tableId: table.id });
    return {
      ok: true as const,
      queued: false,
      message: "Solenoid fired. Balls are out — enjoy your game.",
    };
  });

export const getStaffMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await tick(sql);
    return ensureStaff(context.userId);
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await tick(sql);
    const me = await ensureStaff(context.userId);
    const locations = await fetchLocations(me.orgId, me.role === "manager" ? me.locationId : null);
    const kpis = {
      todayKes: locations.reduce((s, l) => s + l.todayKes, 0),
      tableCount: locations.reduce((s, l) => s + l.tableCount, 0),
      busy: locations.reduce((s, l) => s + l.busy, 0),
      idle: locations.reduce((s, l) => s + l.idle, 0),
      pendingGames: locations.reduce((s, l) => s + l.pendingGames, 0),
    };
    const week = await sql<{ kes: number; games: number }>`
      select
        coalesce(sum(s.amount_kes), 0)::int as kes,
        count(*)::int as games
      from play_sessions s
      join locations l on l.id = s.location_id
      where l.org_id = ${me.orgId}
        and s.status in ('paid', 'released')
        and s.paid_at >= now() - interval '7 days'
        and (${me.role === "manager" ? me.locationId : null}::text is null
             or s.location_id = ${me.role === "manager" ? me.locationId : null})
    `;
    const gamesToday = await sql<{ n: number }>`
      select count(*)::int as n
      from play_sessions s
      join locations l on l.id = s.location_id
      where l.org_id = ${me.orgId}
        and s.status in ('paid', 'released')
        and s.paid_at >= date_trunc('day', now() at time zone 'Africa/Nairobi')
            at time zone 'Africa/Nairobi'
        and (${me.role === "manager" ? me.locationId : null}::text is null
             or s.location_id = ${me.role === "manager" ? me.locationId : null})
    `;
    const recent = await fetchSessions({
      orgId: me.orgId,
      locationId: me.role === "manager" ? me.locationId : null,
      limit: 8,
    });
    const alerts = (await fetchAlerts(me.orgId, me.role === "manager" ? me.locationId : null)).filter(
      (a) => !a.resolved,
    );
    return {
      me,
      locations,
      kpis: {
        ...kpis,
        weekKes: Number(week[0]?.kes ?? 0),
        weekGames: Number(week[0]?.games ?? 0),
        gamesToday: Number(gamesToday[0]?.n ?? 0),
        openAlerts: alerts.length,
      },
      recent,
      alerts: alerts.slice(0, 5),
    };
  });

export const getFloor = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { locationId: string }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await tick(sql);
    const me = await ensureStaff(context.userId);
    if (me.role === "manager" && me.locationId && me.locationId !== data.locationId) {
      throw new Error("Not allowed for this location");
    }
    const locs = await fetchLocations(me.orgId, data.locationId);
    const loc = locs[0];
    if (!loc) throw new Error("Location not found");
    const tables = await sql<TableRow>`
      select t.id, t.location_id, l.name as location_name, l.slug as location_slug,
        l.city, l.area, t.name, t.code, t.price_kes, t.status, t.busy_since,
        t.pending_games, t.hub_online, t.battery_pct, t.last_seen, l.game_minutes
      from pool_tables t
      join locations l on l.id = t.location_id
      where t.location_id = ${data.locationId}
      order by t.name
    `;
    const allLocs = await fetchLocations(me.orgId, me.role === "manager" ? me.locationId : null);
    return { me, location: loc, locations: allLocs, tables: tables.map(mapTable) };
  });

export const getTransactions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { q?: string; locationId?: string } | undefined) => data ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await tick(sql);
    const me = await ensureStaff(context.userId);
    const locationId =
      me.role === "manager" && me.locationId ? me.locationId : (data.locationId ?? null);
    const sessions = await fetchSessions({ orgId: me.orgId, locationId, q: data.q, limit: 120 });
    const locations = await fetchLocations(me.orgId, me.role === "manager" ? me.locationId : null);
    return { me, sessions, locations };
  });

export const getReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await tick(sql);
    const me = await ensureStaff(context.userId);
    const locFilter = me.role === "manager" ? me.locationId : null;
    const days = await sql<{ day: string; kes: number; games: number }>`
      select
        to_char(date_trunc('day', s.paid_at at time zone 'Africa/Nairobi'), 'YYYY-MM-DD') as day,
        coalesce(sum(s.amount_kes), 0)::int as kes,
        count(*)::int as games
      from play_sessions s
      join locations l on l.id = s.location_id
      where l.org_id = ${me.orgId}
        and s.status in ('paid', 'released')
        and s.paid_at >= (now() at time zone 'Africa/Nairobi')::date - 6
        and (${locFilter}::text is null or s.location_id = ${locFilter})
      group by 1
      order by 1
    `;
    const byLocation = await sql<{ name: string; city: string; kes: number; games: number }>`
      select l.name, l.city,
        coalesce(sum(s.amount_kes), 0)::int as kes,
        count(s.id)::int as games
      from locations l
      left join play_sessions s
        on s.location_id = l.id
       and s.status in ('paid', 'released')
       and s.paid_at >= now() - interval '7 days'
      where l.org_id = ${me.orgId}
        and (${locFilter}::text is null or l.id = ${locFilter})
      group by l.id, l.name, l.city
      order by kes desc
    `;
    const byTable = await sql<{
      name: string;
      code: string;
      location_name: string;
      kes: number;
      games: number;
    }>`
      select t.name, t.code, l.name as location_name,
        coalesce(sum(s.amount_kes), 0)::int as kes,
        count(s.id)::int as games
      from pool_tables t
      join locations l on l.id = t.location_id
      left join play_sessions s
        on s.table_id = t.id
       and s.status in ('paid', 'released')
       and s.paid_at >= now() - interval '7 days'
      where l.org_id = ${me.orgId}
        and (${locFilter}::text is null or l.id = ${locFilter})
      group by t.id, t.name, t.code, l.name
      order by kes desc
    `;
    return {
      me,
      days: days.map((d) => ({ day: d.day, kes: Number(d.kes), games: Number(d.games) })),
      byLocation: byLocation.map((r) => ({
        name: r.name,
        city: r.city,
        kes: Number(r.kes),
        games: Number(r.games),
      })),
      byTable: byTable.map((r) => ({
        name: r.name,
        code: r.code,
        locationName: r.location_name,
        kes: Number(r.kes),
        games: Number(r.games),
      })),
    };
  });

export const getAlertsPage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await tick(sql);
    const me = await ensureStaff(context.userId);
    const alerts = await fetchAlerts(me.orgId, me.role === "manager" ? me.locationId : null);
    const log = await sql<{
      id: string;
      action: string;
      detail: string;
      created_at: unknown;
      table_id: string | null;
    }>`
      select id, action, detail, created_at, table_id
      from audit_log
      where org_id = ${me.orgId}
      order by created_at desc
      limit 20
    `;
    return {
      me,
      alerts,
      audit: log.map((r) => ({
        id: r.id,
        action: r.action,
        detail: r.detail,
        createdAt: iso(r.created_at) ?? "",
        tableId: r.table_id,
      })),
    };
  });

export const resolveAlert = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => data)
  .handler(async ({ context, data }) => {
    const me = await ensureStaff(context.userId);
    const sql = await getSql();
    await sql`
      update alerts set resolved = true
      where id = ${data.id} and org_id = ${me.orgId}
    `;
    return { ok: true };
  });

export const forceRelease = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { tableId: string }) => data)
  .handler(async ({ context, data }) => {
    const { staff, table } = await assertTableAccess(context.userId, data.tableId);
    const sql = await getSql();
    if (table.status === "offline" || !table.hub_online) {
      return { ok: false as const, error: "Node offline — cannot fire the solenoid." };
    }
    const paid = await sql<{ id: string }>`
      select id from play_sessions
      where table_id = ${table.id} and status = 'paid'
      order by paid_at asc
      limit 1
    `;
    if (paid[0]) {
      await sql`
        update play_sessions set status = 'released', released_at = now()
        where id = ${paid[0].id}
      `;
      await sql`
        update pool_tables
        set pending_games = greatest(pending_games - 1, 0),
            status = 'busy',
            busy_since = now()
        where id = ${table.id}
      `;
      await audit(sql, staff, "release", `Released paid game on ${table.name}`, table.id);
      broadcast({ type: "table:update", locationId: table.location_id, tableId: table.id });
      return { ok: true as const, comped: false };
    }
    const id = crypto.randomUUID();
    await sql`
      insert into play_sessions (
        id, table_id, location_id, amount_kes, phone_masked, checkout_id, mpesa_ref, status, paid_at, released_at
      ) values (
        ${id}, ${table.id}, ${table.location_id}, 0, 'STAFF', ${"ws_CO_COMP_" + Date.now()},
        'COMPED', 'released', now(), now()
      )
    `;
    await sql`
      update pool_tables
      set status = 'busy', busy_since = now()
      where id = ${table.id}
    `;
    await audit(sql, staff, "force_open", `Comped / force-opened ${table.name}`, table.id);
    broadcast({ type: "table:update", locationId: table.location_id, tableId: table.id });
    return { ok: true as const, comped: true };
  });

export const setTableStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { tableId: string; status: TableStatus }) => data)
  .handler(async ({ context, data }) => {
    const { staff, table } = await assertTableAccess(context.userId, data.tableId);
    const sql = await getSql();
    const next = data.status;
    const busySince = next === "busy" ? new Date().toISOString() : null;
    const hubOnline = next !== "offline";
    await sql`
      update pool_tables
      set status = ${next},
          busy_since = ${busySince},
          hub_online = ${hubOnline}
      where id = ${table.id}
    `;
    if (next === "maintenance") {
      const open = await sql<{ id: string }>`
        select id from alerts where table_id = ${table.id} and kind = 'maintenance' and resolved = false limit 1
      `;
      if (open.length === 0) {
        await sql`
          insert into alerts (id, org_id, location_id, table_id, kind, message, severity)
          values (
            ${crypto.randomUUID()}, ${staff.orgId}, ${table.location_id}, ${table.id},
            'maintenance', ${`${table.location_name} · ${table.name} is in maintenance.`}, 'info'
          )
        `;
      }
    }
    if (next === "idle") {
      await sql`
        update alerts set resolved = true
        where table_id = ${table.id} and kind in ('maintenance', 'hub_offline') and resolved = false
      `;
    }
    await audit(sql, staff, "status", `${table.name} → ${next}`, table.id);
    broadcast({ type: "table:update", locationId: table.location_id, tableId: table.id });
    return { ok: true };
  });

export const setTablePrice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { tableId: string; priceKes: number }) => data)
  .handler(async ({ context, data }) => {
    const price = Math.round(data.priceKes);
    if (price < 10 || price > 2000) throw new Error("Price must be between KES 10 and 2000");
    const { staff, table } = await assertTableAccess(context.userId, data.tableId);
    const sql = await getSql();
    await sql`update pool_tables set price_kes = ${price} where id = ${table.id}`;
    await audit(sql, staff, "price", `${table.name} price set to KES ${price}`, table.id);
    return { ok: true };
  });

export const setGameMinutes = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { locationId: string; minutes: number }) => data)
  .handler(async ({ context, data }) => {
    const minutes = Math.round(data.minutes);
    if (minutes < 5 || minutes > 90) throw new Error("Game length must be 5–90 minutes");
    const me = await ensureStaff(context.userId);
    if (me.role === "manager" && me.locationId && me.locationId !== data.locationId) {
      throw new Error("Not allowed for this location");
    }
    const sql = await getSql();
    await sql`
      update locations set game_minutes = ${minutes}
      where id = ${data.locationId} and org_id = ${me.orgId}
    `;
    await audit(sql, me, "duration", `Game length set to ${minutes} min`, null);
    return { ok: true };
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = await ensureStaff(context.userId);
    const locations = await fetchLocations(me.orgId, me.role === "manager" ? me.locationId : null);
    const tables = await sql<TableRow>`
      select t.id, t.location_id, l.name as location_name, l.slug as location_slug,
        l.city, l.area, t.name, t.code, t.price_kes, t.status, t.busy_since,
        t.pending_games, t.hub_online, t.battery_pct, t.last_seen, l.game_minutes
      from pool_tables t
      join locations l on l.id = t.location_id
      where l.org_id = ${me.orgId}
        and (${me.role === "manager" ? me.locationId : null}::text is null
             or t.location_id = ${me.role === "manager" ? me.locationId : null})
      order by l.name, t.name
    `;
    return { me, locations, tables: tables.map(mapTable) };
  });

// ── Admin (Owner-only) ─────────────────────────────────────────────────────

import { auth } from "@/lib/auth/server";

export const createManager = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { email: string; locationId: string }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await tick(sql);
    const me = await ensureStaff(context.userId);
    if (me.role !== "owner") throw new Error("Forbidden: owner only");

    // Better Auth doesn't let us bypass email verification or set a raw hash easily without the admin plugin,
    // but we can programmatically sign them up with a temp password. 
    // They will need to log in with this password and can change it later.
    const tempPassword = "CuePayManager123!";
    
    try {
      // Use Better Auth's server API to create the user and credential account
      const res = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: tempPassword,
          name: "Manager",
        },
      });

      if (!res?.user?.id) throw new Error("Failed to create auth user");

      await sql`
        insert into staff (user_id, org_id, role, location_id)
        values (${res.user.id}, ${me.orgId}, 'manager', ${data.locationId})
      `;

      return { ok: true as const, tempPassword };
    } catch (e: any) {
      return { ok: false as const, error: e.message || "Failed to create manager" };
    }
  });

/** Global organization overview for the owner: all locations + top-line KPIs. */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await tick(sql);
    const me = await ensureStaff(context.userId);
    if (me.role !== "owner") throw new Error("Forbidden: owner only");

    const locations = await fetchLocations(me.orgId, null);
    const totals = await sql<{ kes: number; games: number; sessions: number }>`
      select
        coalesce(sum(s.amount_kes), 0)::int  as kes,
        count(*) filter (where s.status in ('paid','released'))::int as games,
        count(*)::int as sessions
      from play_sessions s
      join locations l on l.id = s.location_id
      where l.org_id = ${me.orgId}
        and s.created_at >= date_trunc('day', now() at time zone 'Africa/Nairobi')
          at time zone 'Africa/Nairobi'
    `;
    const staff = await sql<{ id: string; user_id: string; role: string; location_id: string | null; location_name: string | null; email: string | null }>`
      select st.id, st.user_id, st.role, st.location_id, l.name as location_name,
        u.email
      from staff st
      left join locations l on l.id = st.location_id
      left join "user" u on u.id = st.user_id
      where st.org_id = ${me.orgId}
      order by st.role, u.email
    `;
    return {
      me,
      locations,
      staff: staff.map((s) => ({
        id: s.id,
        userId: s.user_id,
        role: s.role,
        locationId: s.location_id,
        locationName: s.location_name,
        email: s.email,
      })),
      todayKes: Number(totals[0]?.kes ?? 0),
      todayGames: Number(totals[0]?.games ?? 0),
    };
  });

