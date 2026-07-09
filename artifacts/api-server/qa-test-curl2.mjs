import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  // Wait for server to be ready then test
  const cmds = `sleep 10; curl -s --max-time 30 -X POST http://localhost:2024/api/ai/chat -H "Content-Type: application/json" -H "x-api-key: lumos-pos-2024" -d '{"message":"Misi 53 ngapain aja?","userId":"test-1","sessionId":"test-1"}' 2>&1 | head -c 300`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(empty)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 120000 });
