import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "=== normalizeOutput check ==="; grep -c "format bebas" /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs; grep -c "JANGAN gunakan template" /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs; echo "=== CEO summary check ==="; grep -c "CEO EXPLAIN" /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs; echo "=== BERPIKIR template check (should be 0 in CYCLE 3) ==="; grep -c "BERPIKIR" /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs; echo "=== normalizeOutput check ==="; grep -c "hanya tolak output" /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no output)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
