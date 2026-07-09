import { Client } from "ssh2";
const c = new Client();
let buf = "";
c.on("ready", () => {
  const cmds = `ls -la /home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs; echo "==="; timeout 10 node -e "try { require('/home/ubuntu/lumespos/artifacts/api-server/dist/index.mjs') } catch(e) { console.log('ERROR:', e.message) }" 2>&1; echo "==="; cat /home/ubuntu/lumespos/artifacts/api-server/.env`;
  c.exec(cmds, (e, s) => {
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
