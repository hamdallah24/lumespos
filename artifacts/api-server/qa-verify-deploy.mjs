import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `echo "===FRONTEND BUILD==="; ls -la /home/ubuntu/lumespos/artifacts/pos-app/dist/ 2>&1 | head -10; echo ""; echo "===SERVER STATUS==="; pm2 show pos-api 2>&1 | grep -E "uptime|status|restarts"; echo ""; curl -s --max-time 10 http://localhost:3000/api/health 2>&1 | head -c 100`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
