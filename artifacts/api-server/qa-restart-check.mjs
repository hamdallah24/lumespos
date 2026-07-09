import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `pm2 restart pos-api 2>&1; sleep 8; echo "==="; ss -tlnp | grep 2024 || echo "not listening"; echo "==="; cat /home/ubuntu/lumespos/artifacts/api-server/.env 2>/dev/null | grep PORT || echo "no .env PORT"; echo "==="; pm2 show pos-api 2>&1 | grep "POR\\|env"`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
