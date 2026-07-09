import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`grep "PIPELINE:EXEC\|PIPELINE.*cycle\|Mission Budget\|REQ-mrcv.*pipeline\|WARNING.*Tools" /home/ubuntu/.pm2/logs/pos-api-out.log | tail -20`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no matches)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
