import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Get ALL error log entries from this PID
  c.exec(`grep -A3 '1189723' /home/ubuntu/.pm2/logs/pos-api-error.log 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no entries for this PID)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
