import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  // Find the delegation line logic in the bundle
  c.exec(`grep -oP '.{0,100}isMissionQuery.{0,200}' /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs | head -5`, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(no match)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
