import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`ls -la /home/ubuntu/lumespos/data/ 2>&1; echo "---"; stat /home/ubuntu/lumespos/data/cko-file-map.json 2>&1; echo "---"; node -e "console.log('ROOT:',require('path').resolve(process.cwd(),'../..'));console.log('DATA:',require('path').resolve(process.cwd(),'../..','data'));require('fs').accessSync(require('path').resolve(process.cwd(),'../..','data'),require('fs').R_OK|require('fs').W_OK);console.log('OK');" 2>&1`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
