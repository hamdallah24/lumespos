import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "=== cto-runtime.ts ==="; grep -c "hanya tolak output" /home/ubuntu/lumespos/artifacts/api-server/src/ai/programs/cto-runtime.ts; echo "=== ai-prompts.ts ==="; grep -c "format bebas" /home/ubuntu/lumespos/artifacts/api-server/src/routes/ai-prompts.ts; echo "=== mission-bg ==="; grep -c "CEO EXPLAIN" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/mission-background-engine.ts; echo "=== src path check ==="; ls /home/ubuntu/lumespos/artifacts/api-server/src/routes/ai-prompts.ts /home/ubuntu/lumespos/artifacts/api-server/src/ai/programs/cto-runtime.ts /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/mission-background-engine.ts 2>&1`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no output)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
