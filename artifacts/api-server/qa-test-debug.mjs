import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Run a quick curl test and capture PM2 logs
  const cmds = [
    `curl -s --max-time 30 -X POST http://localhost:2024/api/ai/chat -H "Content-Type: application/json" -H "x-api-key: lumos-pos-2024" -d '{"message":"Misi 53 ngapain aja?","userId":"test-1","sessionId":"test-1"}' | head -c 100`,
    `echo ""`,
    `echo "---LOGS---"`,
    `pm2 logs pos-api --nostream --lines 50 2>&1 | grep DELEGATION_DEBUG | tail -5`,
  ].join("; ");
  c.exec(cmds, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
