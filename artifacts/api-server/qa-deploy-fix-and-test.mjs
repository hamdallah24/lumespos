import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = [
    `# Fix PORT in .env`,
    `sed -i 's/PORT=3000/PORT=2024/' /home/ubuntu/lumespos/artifacts/api-server/.env`,
    `grep PORT /home/ubuntu/lumespos/artifacts/api-server/.env`,
    `# Build fresh`,
    `cd /home/ubuntu/lumespos/artifacts/api-server && node build.mjs 2>&1 | tail -5`,
    `# Restart`,
    `pm2 restart pos-api 2>&1 | tail -5`,
    `sleep 10`,
    `# Test`,
    `curl -s --max-time 60 -X POST http://localhost:2024/api/ai/chat -H "Content-Type: application/json" -H "x-api-key: lumos-pos-2024" -d '{"message":"Misi 53 ngapain aja?","userId":"test-1","sessionId":"test-1"}' 2>&1 | grep "finalText\\|dikirim\\|Direct" | head -3`,
    `echo ""`,
    `echo "===PIPELINE==="`,
    `pm2 logs pos-api --nostream --lines 30 2>&1 | grep "PIPELINE" | tail -5`,
  ].join("; ");
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
