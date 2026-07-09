import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "=== dist ==="; ls -la /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs 2>&1; echo "=== pm2 status ==="; pm2 status 2>&1; echo "=== recent errors ==="; pm2 logs pos-api --lines 10 --nostream 2>&1 | grep -i "error\|module" | tail -5`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no output)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
