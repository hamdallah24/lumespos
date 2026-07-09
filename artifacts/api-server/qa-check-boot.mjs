import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Get the last boot output from the out log (lines with Kernel/Health/MissionEngine/Server listening)
  c.exec(`grep -E 'Kernel|HealthMonitor|MissionEngine|Server listening|CKO|Boot Report' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -10`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no boot lines)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
