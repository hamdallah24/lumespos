import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "=== QA-CTO ==="; grep -F '[QA-CTO]' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -5; echo "=== CTO PIPELINE ==="; grep -F 'PIPELINE:CTO' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -5; echo "=== CKO TRANSLATE ==="; grep -F 'CKO:TRANSLATE' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -3; echo "=== SEARCH/RESULTS ==="; grep -E 'searchContent|readLocalFile|FileRead' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -5`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
