import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Get the actual CTO output from the QA-CTO log line
  c.exec("grep '\\[QA-CTO\\] mission=M-1' /home/ubuntu/.pm2/logs/pos-api-out.log | head -1", (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { 
      console.log("QA-CTO line:", o);
      c.end(); 
    });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
