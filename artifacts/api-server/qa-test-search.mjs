import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "=== SEARCH TOOL ==="; grep -F 'searchLocalContent' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -5; echo "=== READ TOOL ==="; grep -E 'FileRead|Membaca|readLocalFile' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -5; echo "=== ERROR LOG ==="; tail -3 /home/ubuntu/.pm2/logs/pos-api-error.log | grep -v 'Warning\|SECURITY\|Timeout\|2592000\|already registered' | tail -2`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
