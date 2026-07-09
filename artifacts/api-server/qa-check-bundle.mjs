import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  c.exec(`grep -o "isMissionQuery\\|isDelegated\\|Misi dikirim" /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs | head -10`, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf || "(no matches in bundle)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
