import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  c.exec(`pm2 logs pos-api --err --nostream --lines 200 2>&1 | tail -60`, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(empty)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
