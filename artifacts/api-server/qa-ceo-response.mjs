import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec("grep -n 'CEO review result' /home/ubuntu/.pm2/logs/pos-api-out.log", (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { 
      // Get the last CEO result and look at surrounding lines
      const lines = o.trim().split("\n");
      const lastLine = lines[lines.length-1];
      const lineNum = parseInt(lastLine.split(":")[0]);
      c2.exec(`sed -n '${lineNum-20},${lineNum+5}p' /home/ubuntu/.pm2/logs/pos-api-out.log`, (e2, s2) => {
        if (e2) { console.error(e2); c2.end(); return; }
        let o2 = "";
        s2.on("data", d => o2 += d);
        s2.on("close", () => { console.log(o2); c2.end(); });
      });
    });
  });
});
const c2 = new Client();
c.on("error", e => { console.error(e.message); process.exit(1); });
c2.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
