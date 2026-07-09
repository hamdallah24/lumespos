import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`grep -n "GOV:DEBUG\\|shouldContinue" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-governor.ts 2>/dev/null; echo "---"; wc -l /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-governor.ts`, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
