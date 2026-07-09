import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon";
const c = new Client();
c.on("ready", () => {
  c.exec(`echo "---FILE CHECK---"; grep -n "Math\\." /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>&1; echo "---MOD TIME---"; stat -c %Y /home/ubuntu/lumespos/artifacts/api-server/src/ai/runtime/proposal-review.ts 2>&1`, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 30000 });
