import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  // Check for JavaScript errors in PM2 logs, and also check if port is bound
  const cmds = [
    `pm2 logs pos-api --err --nostream --lines 50 2>&1 | tail -30`,
  ].join("; ");
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(empty)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
