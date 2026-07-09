import { Client } from "ssh2";
const c = new Client();
let done = false;
c.on("ready", () => {
  // Check stdout from latest restart
  c.exec(`grep -F 'CKO' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -5`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => {
      if (!done) { done = true; console.log("=== stdout CKO ===\n" + o || "(none)"); c.end(); }
    });
  });
  // Also check for startup crash or error
  c.exec(`tail -20 /home/ubuntu/.pm2/logs/pos-api-error.log`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => {
      if (!done) { done = true; console.log("=== stderr tail ===\n" + o || "(none)"); c.end(); }
    });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
