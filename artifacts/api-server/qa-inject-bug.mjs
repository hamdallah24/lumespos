import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmd = `sed -i 's/Single entry point/Single entri point/' /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts && grep -n "entri" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts && echo "Bug injected!"`;
  c.exec(cmd, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
