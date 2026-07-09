import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmds = `echo "===LOGIN==="; curl -s -m 10 -c /tmp/qa_final.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' 2>&1 | head -c 50; echo ""; echo "===TEST==="; curl -s -m 60 -b /tmp/qa_final.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"halo","mode":"ceo"}' 2>&1 | grep -E "meta|sender|done.*sender|role" | head -10`;
  c.exec(cmds, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 120000 });
