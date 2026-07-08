import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec("ls /home/ubuntu/lumespos/artifacts/api-server/ecosystem* /home/ubuntu/lumespos/ecosystem* 2>/dev/null; echo '---START---'; cat /home/ubuntu/lumespos/package.json | python3 -c 'import sys,json; p=json.load(sys.stdin); print(p.get(\"scripts\",{}).get(\"start\",\"\"))' 2>/dev/null", (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => c.end()).on("data", d => process.stdout.write(d)).stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 15000 });
