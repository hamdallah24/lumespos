import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`wc -l /home/ubuntu/.pm2/logs/pos-api-out.log; echo "---"; tail -3000 /home/ubuntu/.pm2/logs/pos-api-out.log | grep -i "pipeline\|cto.*start\|cto.*end\|cko\|engine\|mission\|error\|fail\|41\|dbid=41" | tail -30`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no output)"); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
