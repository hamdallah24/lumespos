import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "=== M-1 FULL TEXT ==="; grep -A1 'QA-CTO.*M-1 success' /home/ubuntu/.pm2/logs/pos-api-out.log | grep textPreview; echo "=== M-1 PIPELINE ==="; grep 'PIPELINE:CTO.*execute end.*duration=33592ms' /home/ubuntu/.pm2/logs/pos-api-out.log; echo "=== CEO REVIEW ==="; grep -F 'CEO review' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -3; echo "=== BGE ==="; grep -F 'PIPELINE:BGE' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -5`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
