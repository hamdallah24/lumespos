import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`tail -15 /home/ubuntu/.pm2/logs/pos-api-error.log | head -10`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log("=== error tail ===\n" + o); 
      c.exec(`tail -5 /home/ubuntu/.pm2/logs/pos-api-out.log`, (e2, s2) => {
        let o2 = "";
        s2.on("data", d => o2 += d);
        s2.on("close", () => { console.log("=== out tail ===\n" + o2); c.end(); });
      });
    });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
