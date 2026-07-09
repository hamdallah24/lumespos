import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`grep -n "10:42:14\|10:42:33" /home/ubuntu/.pm2/logs/pos-api-out.log`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { let lines = o.trim().split("\n"); if (lines.length >= 2) { let start = parseInt(lines[0].split(":")[0]); let end = parseInt(lines[1].split(":")[0]); console.log("Lines " + start + " to " + end); c.exec("sed -n '" + start + "," + end + "p' /home/ubuntu/.pm2/logs/pos-api-out.log", (e2, s2) => { let o2 = ""; s2.on("data", d => o2 += d); s2.on("close", () => { console.log(o2); c.end(); }); }); } else { console.log(o || "(no output)"); c.end(); } });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
