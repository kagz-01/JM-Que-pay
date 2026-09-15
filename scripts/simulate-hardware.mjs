/**
 * ESP32 Hardware Simulator
 * 
 * Simulates the behaviour of IoT nodes attached to pool tables.
 * Each node:
 * 1. Polls its table endpoint /api/hardware/tables/:id every 5 seconds.
 * 2. If pendingGames > 0, it "fires the solenoid" to release the balls and 
 *    sends a POST request to consume the pending game.
 */

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8080';

// IDs of tables to simulate (hardcoded for sandbox/dev testing)
// We will fetch the actual table IDs from the database or API.
async function getTables() {
  try {
    // In a real scenario we'd use a dedicated hardware auth.
    // For simulation, we will query the local db using standard pg or pglite.
    // However, it's easier to just pass table IDs as CLI arguments, or 
    // we can make a lightweight API call if we expose a public endpoint.
    // Let's just fetch from the public location API.
    const res = await fetch(`${baseUrl}/api/live`); // just to wake up server
    res.body?.cancel(); // close the SSE

    const payRes = await fetch(`${baseUrl}/pay`);
    // since /pay is SSR, let's just use the direct location endpoint if we know the slug.
    // Alternatively, we can use the db module.
  } catch (e) {
    console.error("Failed to connect", e);
  }
}

async function simulateTable(tableId, tableName) {
  console.log(`[Table ${tableName}] Node started. Polling ${baseUrl}/api/hardware/tables/${tableId}...`);
  
  setInterval(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/hardware/tables/${tableId}`);
      if (!res.ok) return;
      
      const data = await res.json();
      
      if (data.pendingGames > 0) {
        console.log(`[Table ${tableName}] 🪙 Pending game detected! Firing solenoid...`);
        // Consume the game
        const postRes = await fetch(`${baseUrl}/api/hardware/tables/${tableId}`, {
          method: 'POST'
        });
        
        if (postRes.ok) {
          console.log(`[Table ${tableName}] ✅ Solenoid fired. Balls released. Game consumed.`);
        } else {
          console.error(`[Table ${tableName}] ❌ Failed to consume game.`);
        }
      }
    } catch (e) {
      console.error(`[Table ${tableName}] Connection error: ${e.message}`);
    }
  }, 5000);
}

// Read table IDs from args
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
Usage: node scripts/simulate-hardware.mjs <table_id_1> <table_id_2> ...

You can find table IDs in the database or dashboard URL.
Example: node scripts/simulate-hardware.mjs e89b3f...
  `);
  process.exit(1);
}

console.log("Starting CuePay Hardware Simulator...");
args.forEach((id, index) => {
  simulateTable(id, `SIM-${index + 1}`);
});
