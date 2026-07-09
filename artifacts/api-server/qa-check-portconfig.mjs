import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `grep -n "listen\\|port\\|2024\\|4173" /home/ubuntu/lumespos/artifacts/api-server/src/index.ts | head -10; echo "==="; grep -rn "listen\\|PORT" /home/ubuntu/lumespos/artifacts/api-server/src/index.ts 2>/dev/null | head -5`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(no matches)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
