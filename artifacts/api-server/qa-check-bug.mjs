import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`grep "entri" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts 2>/dev/null || echo "bug not found (may be restored or never injected)"`, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
