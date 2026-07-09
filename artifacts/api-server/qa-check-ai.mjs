import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  c.exec(`grep -n "replayExecution\\|finalText\\|Executive Report\\|delegation" /home/ubuntu/lumespos/artifacts/api-server/src/routes/ai.ts | head -20`, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(no matches)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
