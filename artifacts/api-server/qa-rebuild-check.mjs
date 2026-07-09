import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  const cmds = `echo "===FE BUILD==="; ls -la /home/ubuntu/lumespos/artifacts/pos-app/dist/public/assets/ 2>&1 | head -5; echo ""; echo "===Try rebuild==="; cd /home/ubuntu/lumespos/artifacts/pos-app && pnpm run build 2>&1 | tail -15`;
  c.exec(cmds, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 180000 });
