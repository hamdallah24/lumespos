import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`cd /home/ubuntu/lumespos/artifacts/pos-app && pnpm run build 2>&1 | tail -20`, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 120000 });
