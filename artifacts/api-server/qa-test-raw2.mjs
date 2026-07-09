import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmds = `curl -s -m 10 -c /tmp/qa_test3.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null; curl -s -m 30 -b /tmp/qa_test3.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"halo","mode":"ceo"}' 2>&1 | head -25`;
  c.exec(cmds, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
