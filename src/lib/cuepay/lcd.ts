import { elapsed, pad16 } from "./format";
import type { LcdLines, PoolTable } from "./types";

export function lcdFor(table: PoolTable): LcdLines {
  const tag = table.name.replace("Table ", "T").toUpperCase();
  if (table.status === "maintenance") {
    return { line1: pad16(`${tag}  LOCKED`), line2: pad16("Maintenance") };
  }
  if (table.status === "offline" || !table.hubOnline) {
    return { line1: pad16(`${tag} OFFLINE`), line2: pad16("Call attendant") };
  }
  if (table.status === "busy") {
    return {
      line1: pad16(`${tag} IN PLAY`),
      line2: pad16(`${elapsed(table.busySince)}  Enjoy`),
    };
  }
  if (table.pendingGames > 0) {
    return {
      line1: pad16(`Payment OK x${table.pendingGames}`),
      line2: pad16("Press to open"),
    };
  }
  return {
    line1: pad16(`CUEPAY  ${tag}`),
    line2: pad16("Ready — pay first"),
  };
}
