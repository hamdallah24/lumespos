import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `find /home/ubuntu/lumespos -name "ecosystem*" -o -name "pm2*" 2>/dev/null | head -5; echo "==="; cat /home/ubuntu/lumespos/artifacts/api-server/ecosystem.config.* 2>/dev/null || echo "no eco file"; echo "==="; pm2 env 0 2>&1 | grep PORT; echo "==="; grep -rn "2024" /home/ubuntu/lumespos/artifacts 2>/dev/null | grep -v "node_modules" | grep -v ".map" | head -5`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
