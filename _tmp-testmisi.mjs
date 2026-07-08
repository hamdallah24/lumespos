import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`curl -s -X POST "http://localhost:21008/api/login" -H "Content-Type: application/json" -d '{"username":"founder","password":"founder123"}' -c /tmp/cookie.txt`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => {
      c.exec(`curl -s -X POST "http://localhost:21008/api/missions" -b /tmp/cookie.txt -H "Content-Type: application/json" -d '{"type":"analysis","description":"Analisa file dashboard.jsx dan cari potensi bug"}'`, (e2, s2) => {
        if (e2) { console.error(e2); c.end(); return; }
        s2.on("close", () => {
          setTimeout(() => {
            c.exec(`curl -s -X GET "http://localhost:21008/api/missions" -b /tmp/cookie.txt`, (e3, s3) => {
              if (e3) { console.error(e3); c.end(); return; }
              s3.on("close", () => c.end()).on("data", d => process.stdout.write(d));
              s3.stderr.on("data", d => process.stderr.write(d));
            });
          }, 15000);
        }).on("data", d => process.stdout.write(d));
        s2.stderr.on("data", d => process.stderr.write(d));
      });
    }).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 120000 });
