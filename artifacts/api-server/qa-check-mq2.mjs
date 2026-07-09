import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  c.exec(`awk 'NR>=165&&NR<=320' /home/ubuntu/lumespos/artifacts/api-server/src/ai/programs/ceo-runtime.ts`, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
