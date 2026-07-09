import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // First, stop current, rebuild from source, restart
  const cmds = [
    `cd /home/ubuntu/lumespos/artifacts/api-server`,
    `npm run build 2>&1 | tail -5`,
    `pm2 restart pos-api 2>&1`,
    `sleep 10`,
    `curl -s --max-time 60 -X POST http://localhost:2024/api/ai/chat -H "Content-Type: application/json" -H "x-api-key: lumos-pos-2024" -d '{"message":"Misi 53 ngapain aja?","userId":"test-1","sessionId":"test-1"}' 2>&1 | head -c 200`,
    `echo ""`,
    `echo "---LOGS---"`,
    `pm2 logs pos-api --nostream --lines 30 2>&1 | grep "PIPELINE" | tail -5`,
  ].join("; ");
  c.exec(cmds, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
