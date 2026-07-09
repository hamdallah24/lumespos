import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmd = `echo "=== execution-pipeline.ts exists? ===" && ls -la /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts 2>&1 && echo "=== Imports check ===" && grep -n "execution-pipeline" /home/ubuntu/lumespos/artifacts/api-server/src/ai/llm/llm-adapter.ts 2>&1 && grep -n "execution-pipeline" /home/ubuntu/lumespos/artifacts/api-server/src/ai/programs/executive-runtime.ts 2>&1 && grep -n "execution-pipeline" /home/ubuntu/lumespos/artifacts/api-server/src/programs/coo-runtime.ts 2>&1 && echo "=== Buat test case nyata ===" && echo "Inject unused import ke verification-engine.ts" && grep -n "^import" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/verification-engine.ts`;
  c.exec(cmd, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
