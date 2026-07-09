import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`grep -E "DEEPSEEK_MODEL|DEEPSEEK_BASE" /home/ubuntu/lumespos/artifacts/api-server/.env 2>/dev/null; echo "---"; node -e "console.log('MODEL:', process.env.DEEPSEEK_MODEL || '(not set)'); console.log('BASE:', process.env.DEEPSEEK_BASE_URL || process.env.DEEPSEEK_BASE || '(not set)')"`, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
