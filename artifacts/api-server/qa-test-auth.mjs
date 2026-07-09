import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = [
    `# Login to get auth cookie`,
    `curl -s -m 10 -c /tmp/qa_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null`,
    `echo "===LOGIN DONE==="`,
    `# Test mission query`,
    `curl -s -m 90 -b /tmp/qa_cookie.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"Misi 53 ngapain aja?","mode":"ceo"}' 2>&1 | grep -E "finalText|dikirim|Direct" | head -5`,
    `echo ""`,
    `echo "===LOGS==="`,
    `pm2 logs pos-api --nostream --lines 50 2>&1 | grep "PIPELINE" | tail -5`,
  ].join("; ");
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
