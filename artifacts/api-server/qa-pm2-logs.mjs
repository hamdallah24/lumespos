import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
const c = new Client();
c.on("ready", () => {
  c.exec(`pm2 logs pos-api --nostream --lines 1500 2>&1 | grep -E "LLM-REQ|STRATEGY|PIPELINE:.*cycle|CONCLUDE.*final|needsImpl|setNeedsImpl" | tail -25`, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 30000 });
