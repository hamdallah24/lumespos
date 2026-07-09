import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`pm2 logs pos-api --nostream --lines 300 2>&1 | grep -E "PIPELINE|Text response|Write tool|writeFile|editFile|execCommand|EXECUTE|CONCLUDE.*EXECUTE|advance" | tail -20`, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
