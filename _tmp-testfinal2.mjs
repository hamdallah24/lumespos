import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`curl -s -X POST "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"owner@lumes.com","password":"owner1234"}' -c /tmp/owner.txt`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => {
      console.log("LOGIN OK");
      setTimeout(() => {
        c.exec(`curl -s -X POST "http://localhost:3000/api/ai/mission" -b /tmp/owner.txt -H "Content-Type: application/json" -d '{"title":"Analisa dashboard","objective":"Analisa file dashboard.jsx cari potential bug","domains":["architecture"]}'`, (e2, s2) => {
          if (e2) { console.error(e2); c.end(); return; }
          let d = "";
          s2.on("data", chunk => d += chunk);
          s2.on("close", () => {
            console.log("CREATE:", d.substring(0,500));
            let cnt = 0;
            let lastId = 0;
            const chk = () => {
              cnt++;
              c.exec(`curl -s -X GET "http://localhost:3000/api/ai/missions" -b /tmp/owner.txt`, (e3, s3) => {
                if (e3) { console.error(e3); c.end(); return; }
                let d2 = "";
                s3.on("data", chunk => d2 += chunk);
                s3.on("close", () => {
                  try {
                    const j = JSON.parse(d2);
                    const arr = Array.isArray(j) ? j : j.missions || j.data || [];
                    if (arr.length > 0) {
                      const last = arr[arr.length-1];
                      if (last.id !== lastId) { lastId = last.id; console.log("NEW MISSION id=" + last.id + " status=" + last.status); }
                      if (last.status === "COMPLETED" || last.status === "FAILED" || cnt >= 30) {
                        console.log("FINAL:", JSON.stringify({id:last.id,status:last.status,err:last.error,res:(last.result||"").substring(0,500)}));
                        c.end();
                      } else { setTimeout(chk, 10000); }
                    } else { console.log("No missions yet"); setTimeout(chk, 10000); }
                  } catch { console.log("RAW:", d2.substring(0,200)); setTimeout(chk, 10000); }
                });
              });
            };
            setTimeout(chk, 10000);
          });
        });
      }, 2000);
    }).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 300000 });
