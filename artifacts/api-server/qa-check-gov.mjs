import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
const c = new Client();
c.on("ready", () => {
  c.exec(`grep -c "GOV:DEBUG" /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs 2>/dev/null; echo "---"; grep "GOV:DEBUG" /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/execution/execution-governor.ts 2>/dev/null | head -5`, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 30000 });
