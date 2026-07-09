import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`pm2 logs pos-api --lines 100 --nostream 2>&1 | tail -50`, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
