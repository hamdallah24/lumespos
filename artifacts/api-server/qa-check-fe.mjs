import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `echo "===DIST==="; find /home/ubuntu/lumespos/artifacts/pos-app/dist -type f 2>&1 | head -20; echo "===BUILD LOG==="; pm2 logs pos-api --nostream --lines 100 2>&1 | grep -i "vite\\|build\\|error" | tail -10`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
