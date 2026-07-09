import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = [
    `# Wait and test port 3000 with verbose curl`,
    `sleep 5`,
    `curl -v --max-time 10 http://localhost:3000/api/health 2>&1 | head -20`,
    `echo "==="`,
    `ss -tlnp | grep -E "3000|2024" || echo "no ports found"`,
  ].join("; ");
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
