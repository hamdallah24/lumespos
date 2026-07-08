import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`curl -s -X POST "http://localhost:21008/api/login" -H "Content-Type: application/json" -d '{"username":"founder","password":"founder123"}' -c /tmp/cookie.txt`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => {
      const desc = "Analisa file dashboard.jsx dan cari potensi bug";
      c.exec(`curl -s -X POST "http://localhost:21008/api/missions" -b /tmp/cookie.txt -H "Content-Type: application/json" -d '{"type":"analysis","description":"${desc}"}'`, (e2, s2) => {
        if (e2) { console.error(e2); c.end(); return; }
        let data = "";
        s2.on("data", d => data += d);
        s2.on("close", () => {
          console.log("CREATE:", data);
          setTimeout(() => {
            c.exec(`curl -s -X GET "http://localhost:21008/api/missions" -b /tmp/cookie.txt`, (e3, s3) => {
              if (e3) { console.error(e3); c.end(); return; }
              let d2 = "";
              s3.on("data", d => d2 += d);
              s3.on("close", () => {
                console.log("LIST:", d2);
                c.end();
              });
            });
          }, 30000);
        });
      });
    }).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 120000 });
