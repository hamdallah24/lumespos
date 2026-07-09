import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `sleep 30; echo "===HEALTH==="; curl -s --max-time 10 http://localhost:3000/api/health 2>&1 | head -c 100; echo ""; echo "===PIPELINE LOGS==="; pm2 logs pos-api --nostream --lines 50 2>&1 | grep "PIPELINE" | tail -5; echo ""; echo "===TEST MISSION QUERY==="; curl -s -m 10 -c /tmp/qa_cookie.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null; curl -s -m 90 -b /tmp/qa_cookie.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"Misi 53 ngapain aja?","mode":"ceo"}' 2>&1 | grep -E "finalText|Direct|System" | head -5`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
