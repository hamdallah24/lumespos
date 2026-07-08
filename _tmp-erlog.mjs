import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec("tail -30 /home/ubuntu/.pm2/logs/pos-api-error.log", (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => c.end()).on("data", d => process.stdout.write(d)).stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
