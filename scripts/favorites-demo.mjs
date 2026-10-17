import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const port = args.length === 0 ? 3200 : args.length === 2 && args[0] === "--port" ? Number(args[1]) : NaN;
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
  console.error("Uso: npm run demo:favoritos -- --port 3200"); process.exit(1);
}
try {
  await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once("error", reject);
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
} catch {
  console.error(`El puerto ${port} está ocupado. Si ya ejecutas este proyecto, abre http://127.0.0.1:${port}/demo/h3/favoritos/lista. De lo contrario, usa --port con un puerto libre. No se detuvo ningún proceso.`);
  process.exit(1);
}
const cwd = fileURLToPath(new URL("../", import.meta.url));
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port), "--webpack"], {
  cwd, windowsHide: true, stdio: "inherit", env: { ...process.env, H3_FRONTEND_SANDBOX_ENABLED: "true", H3_FRONTEND_ORIGIN: `http://127.0.0.1:${port}` },
});
console.log(`Vistas simuladas: http://127.0.0.1:${port}/demo/h3/favoritos/lista — sin Docker ni backend.`);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  if (child.exitCode === null && child.pid) {
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    else child.kill("SIGTERM");
  }
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = stopping ? 130 : code ?? 0; });
