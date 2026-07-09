import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`grep -F '1190683' /home/ubuntu/.pm2/logs/pos-api-out.log | head -5`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no PID in log)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
