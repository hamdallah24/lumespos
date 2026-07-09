import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `sleep 15; echo "---port---"; ss -tlnp | grep 2024 || echo "still not listening"; echo "---health---"; curl -s --max-time 10 http://localhost:2024/api/health 2>&1 | head -c 200`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(empty)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
