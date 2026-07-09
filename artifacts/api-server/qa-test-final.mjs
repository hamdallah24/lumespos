import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmds = `echo "===LOGIN==="; curl -s -m 10 -c /tmp/qa_test2.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' 2>&1 | head -c 100; echo ""; echo "===MISI 53==="; curl -s -m 90 -b /tmp/qa_test2.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"Misi 53 ngapain aja?","mode":"ceo"}' 2>&1 | grep -E "finalText|Direct|System|\\\\u2699|\\\\ud83d\\\\udd00" | head -5`;
  c.exec(cmds, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(empty)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
