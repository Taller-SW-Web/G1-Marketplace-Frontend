import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

const frontend = fileURLToPath(new URL("../", import.meta.url));
const backend = fileURLToPath(new URL("../../G1-Marketplace-Backend/", import.meta.url));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run using npm run test:e2e:wishlist:connected or npm run demo:h3");
const demo = process.argv.includes("--demo");
const database = "postgresql://h3_test:h3_local_test_only@127.0.0.1:55432/marketplace_h3_test?schema=public";
const backendEnv = { ...process.env, NODE_ENV: "development", DATABASE_URL: database, H3_SANDBOX_ENABLED: "true",
  H3_JWT_SECRET: randomBytes(32).toString("hex"), PORT: "10200", CORS_ALLOWED_ORIGINS: "http://127.0.0.1:3200" };
function run(command, args, cwd, env = backendEnv, capture = false) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8", stdio: capture ? "pipe" : "inherit", windowsHide: true });
  if (result.status !== 0) throw new Error(`Failed command: ${command} ${args[0] ?? ""}`);
  return capture ? result.stdout.trim() : "";
}
const dockerArgs = ["compose", "-f", "docker-compose.test.yml"];
const children = [];
async function freePort(port) {
  await new Promise((resolve, reject) => {
    const server = createServer(); server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}
async function ready(url, process) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (process.exitCode !== null) throw new Error("Demo server exited before readiness");
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) return; } catch { /* retry readiness only */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Demo readiness timed out");
}
function start(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: "inherit", windowsHide: true });
  children.push(child); return child;
}
function stop() {
  for (const child of children.reverse()) {
    if (child.exitCode === null && child.pid) {
      if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      else child.kill("SIGTERM");
    }
  }
}
process.once("SIGINT", () => { stop(); process.exit(130); });
try {
  await freePort(3200); await freePort(10200);
  run("docker", [...dockerArgs, "up", "-d", "--wait"], backend);
  run(process.execPath, [npmCli, "run", "build"], backend);
  run(process.execPath, [npmCli, "run", "prisma:deploy"], backend);
  // Only automated tests reset fixtures; interactive demo preserves the current rows.
  if (!demo) run("docker", [...dockerArgs, "exec", "-T", "postgres-test", "psql", "-U", "h3_test", "-d", "marketplace_h3_test", "-c",
    "DELETE FROM wishlist_items WHERE product_id = 'PRD-1' AND customer_id IN ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');"], backend);
  const tokenA = run(process.execPath, [npmCli, "run", "--silent", "sandbox:token", "--", "--customer", "A"], backend, backendEnv, true);
  const tokenB = run(process.execPath, [npmCli, "run", "--silent", "sandbox:token", "--", "--customer", "B"], backend, backendEnv, true);
  const nest = start(["dist/main.js"], backend, backendEnv);
  await ready("http://127.0.0.1:10200/health", nest);
  const nextEnv = { ...process.env, NODE_ENV: "development", MARKETPLACE_API_URL: "http://127.0.0.1:10200", H3_FRONTEND_SANDBOX_ENABLED: "true",
    H3_FRONTEND_ORIGIN: "http://127.0.0.1:3200", H3_SANDBOX_TOKEN_A: tokenA, H3_SANDBOX_TOKEN_B: tokenB, NEXT_TELEMETRY_DISABLED: "1" };
  delete nextEnv.H3_JWT_SECRET;
  const next = start(["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3200", "--webpack"], frontend, nextEnv);
  await ready("http://127.0.0.1:3200/demo/h3/favoritos", next);
  if (demo) {
    console.log("Demo: http://127.0.0.1:3200/demo/h3/favoritos — Ctrl+C to stop. Tokens expire after 15 minutes; restart this command to issue new tokens.");
    await Promise.race([nest, next].map(child => new Promise((_, reject) => child.once("exit", () => reject(new Error("Demo server stopped"))))));
  } else {
    run(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.wishlist.config.ts"], frontend,
      { ...process.env, H3_CONNECTED: "true" });
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { stop(); console.log("Demo processes stopped. Temporary PostgreSQL remains available; stop only with its compose when no longer needed."); }
