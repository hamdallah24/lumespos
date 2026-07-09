import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmd = `curl -s -m 10 -c /tmp/qf.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null && curl -s -m 10 -b /tmp/qf.txt 'http://localhost:3000/api/ai/missions/active' 2>&1 | python3 -m json.tool 2>/dev/null | head -80`;
  c.exec(cmd, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
