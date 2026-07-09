import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = [
    `# Login first`,
    `curl -s -m 10 -c /tmp/qa_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' 2>&1`,
    `echo ""`,
    `echo "===COOKIE==="`,
    `cat /tmp/qa_cookie.txt 2>&1 | head -5`,
  ].join("; ");
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
