import { Client } from "ssh2";
const c = new Client();
let step = 0;
c.on("ready", () => {
  function next() {
    if (step === 0) {
      step++;
      c.exec(`grep -F 'CKO' /home/ubuntu/.pm2/logs/pos-api-out.log | tail -5`, (e, s) => {
        let o = "";
        s.on("data", d => o += d);
        s.on("close", () => { console.log("=== CKO in stdout ===\n" + o || "(none)"); next(); });
      });
    } else if (step === 1) {
      step++;
      c.exec(`tail -20 /home/ubuntu/.pm2/logs/pos-api-error.log`, (e, s) => {
        let o = "";
        s.on("data", d => o += d);
        s.on("close", () => { console.log("=== stderr ===\n" + o || "(none)"); next(); });
      });
    } else if (step === 2) {
      step++;
      c.exec(`ls -la /home/ubuntu/lumespos/data/`, (e, s) => {
        let o = "";
        s.on("data", d => o += d);
        s.on("close", () => { console.log("=== data dir ===\n" + o || "(none)"); c.end(); });
      });
    }
  }
  next();
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
