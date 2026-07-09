import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`grep -n "MissionQuery\\|isDelegated\\|isMissionQuery\\|Ringkasan Eksekutif" /home/ubuntu/lumespos/artifacts/api-server/src/ai/programs/ceo-runtime.ts | head -20`, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
