import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
const c = new Client();
c.on("ready", () => {
  const cmds = `
curl -s -m 10 -c /tmp/qe.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null
curl -s -m 300 -b /tmp/qe.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi perbaiki file proposal-review.ts","mode":"ceo"}' 2>&1 | grep "finalText" | head -1
echo ""
grep -n "needsImpl\\|implement_change\\|onImplPlan\\|request_approval\\|Implementation Plan" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts 2>/dev/null
echo "---"
stat -c "%Y %n" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>/dev/null`;
  c.exec(cmds, (err, stream) => {
    let o = "";
    if (err) { console.error("Error:", err.message); c.end(); return; }
    stream.on("data", d => o += d);
    stream.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
