import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`curl -s -X POST "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d '{"username":"founder","password":"founder123"}' -c /tmp/cookie.txt`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => {
      c.exec(`curl -s -X POST "http://localhost:3000/api/ai/mission" -b /tmp/cookie.txt -H "Content-Type: application/json" -d '{"title":"Analisa dashboard","objective":"Analisa file dashboard.jsx cari bug","domains":["architecture"]}'`, (e2, s2) => {
        if (e2) { console.error(e2); c.end(); return; }
        let data = "";
        s2.on("data", d => data += d);
        s2.on("close", () => {
          console.log("CREATE:", data);
          let checkCount = 0;
          const check = () => {
            checkCount++;
            c.exec(`curl -s -X GET "http://localhost:3000/api/ai/missions" -b /tmp/cookie.txt`, (e3, s3) => {
              if (e3) { console.error(e3); c.end(); return; }
              let d2 = "";
              s3.on("data", d => d2 += d);
              s3.on("close", () => {
                try {
                  const j = JSON.parse(d2);
                  const arr = Array.isArray(j) ? j : j.missions || j.data || [];
                  if (arr.length > 0) {
                    const last = arr[arr.length - 1];
                    console.log("LATEST MISSION:", JSON.stringify({id:last.id, status:last.status, result:(last.result||"").substring(0,300), error:last.error}, null, 2));
                  } else { console.log("NO MISSIONS, raw:", d2.substring(0, 500)); }
                } catch { console.log("RAW:", d2.substring(0, 1500)); }
                if (checkCount < 10) { setTimeout(check, 15000); } else { c.end(); }
              });
            });
          };
          setTimeout(check, 10000);
        });
      });
    }).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 120000 });
