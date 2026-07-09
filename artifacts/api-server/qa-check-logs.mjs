import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Tail PM2 logs for 15 seconds, run a curl test in parallel
  c.exec(`pm2 logs pos-api --nostream --lines 30 2>&1 | grep -i "pipeline\\|mission\\|Direct\\|dikirim" | tail -20`, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(no matches)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
