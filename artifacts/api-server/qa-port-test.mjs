import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`node -e "const http=require('http');const s=http.createServer((q,r)=>{r.end('ok')});s.listen(3000,()=>{console.log('TEST SERVER LISTENING ON 3000')})" &> /tmp/test-server.log & sleep 2 && curl -s -m 3 http://localhost:3000/ 2>&1; echo "==="; cat /tmp/test-server.log 2>&1; kill %1 2>/dev/null`, (e, s) => {
    if (e) return;
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => { console.log(o); c.end(); });
  });
});
c.on("error", e => { console.error(e.message); process.exit(1); });
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
