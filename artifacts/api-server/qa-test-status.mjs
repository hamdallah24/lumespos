import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmds = `curl -s -m 15 -b /tmp/qa_test2.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"halo","mode":"ceo"}' 2>&1 | grep -E "type.*status|type.*token|type.*system|type.*done|type.*runtime" | head -20; echo "===PIPELINE==="; pm2 logs pos-api --nostream --lines 30 2>&1 | grep "PIPELINE" | tail -5`;
  c.exec(cmds, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
