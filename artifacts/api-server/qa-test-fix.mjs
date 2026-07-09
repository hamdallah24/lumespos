import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `sleep 15; curl -s --max-time 90 -X POST http://localhost:2024/api/ai/chat -H "Content-Type: application/json" -H "x-api-key: lumos-pos-2024" -d '{"message":"Misi 53 ngapain aja?","userId":"test-1","sessionId":"test-1"}' 2>&1 | grep -E "finalText|dikirim|Direct|PIPELINE" | head -10; echo "===LOGS==="; pm2 logs pos-api --nostream --lines 30 2>&1 | grep "PIPELINE" | tail -5`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(empty)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
