import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `grep PORT /home/ubuntu/lumespos/artifacts/api-server/.env; echo "==="; pm2 logs pos-api --err --nostream --lines 50 2>&1 | grep -i "listen\\|error\\|Error\\|crash" | tail -10`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
