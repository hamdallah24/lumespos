import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`ls -la /home/ubuntu/lumespos/artifacts/pos-app/dist/public/assets/ 2>&1; echo "==="; ls -la /home/ubuntu/lumespos/artifacts/pos-app/node_modules/react-markdown/package.json 2>&1 | head -2`, (e, s) => {
    let buf = "";
    s.on("data", d => buf += d);
    s.on("close", () => { console.log(buf); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
