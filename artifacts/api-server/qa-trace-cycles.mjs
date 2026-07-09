import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  // Get detailed execution logs for recent missions
  const cmd = `pm2 logs pos-api --nostream --lines 500 2>&1 | grep -E "PIPELINE:EXEC|PIPELINE:→|PIPELINE:BGE|strategy=|cycle=|__strategy=|EXECUTE|writeFile|editFile|_advanceTextOnly|Text response.*EXECUTE|CEO review|approved" | tail -30`;
  c.exec(cmd, (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o || "(no matches)"); c.end(); });
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
