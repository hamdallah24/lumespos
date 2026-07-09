import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Check latest PID in out log
  c.exec(`grep -oP '\(\d+\)' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -1; echo "==="; tail -5 /home/ubuntu/.pm2/logs/pos-api-out.log`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
