import { Client } from "ssh2";
const c = new Client();
c.on("ready", () => {
  c.exec(`curl -s -X POST "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"owner@lumes.com","password":"owner1234"}' -c /tmp/final3.txt`, (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on("close", () => {
      console.log("LOGIN OK");
      c.exec(`curl -s -X POST "http://localhost:3000/api/ai/mission" -b /tmp/final3.txt -H "Content-Type: application/json" -d '{"title":"Analisa dashboard","objective":"Analisa file dashboard.jsx cari potential bug","domains":["architecture"]}'`, (e2, s2) => {
        if (e2) { console.error(e2); c.end(); return; }
        let d = "";
        s2.on("data", chunk => d += chunk);
        s2.on("close", () => {
          console.log("CREATE:", d.substring(0,400));
          if (d.includes('"error"')) { console.log("FAILED"); c.end(); return; }
          let cnt = 0;
          const chk = () => {
            cnt++;
            c.exec(`curl -s -X GET "http://localhost:3000/api/ai/missions" -b /tmp/final3.txt`, (e3, s3) => {
              if (e3) { console.error(e3); c.end(); return; }
              let d2 = "";
              s3.on("data", chunk => d2 += chunk);
              s3.on("close", () => {
                try {
                  const j = JSON.parse(d2);
                  const active = j.active || [];
                  const last = active[active.length-1];
                  console.log("TICK", cnt, "status:", last?.status, "type:", last?.missionType);
                  if (last && ["COMPLETED","FAILED","REVIEW","APPROVED"].includes(last.status)) {
                    console.log("FINAL:", JSON.stringify({id:last.id,status:last.status,type:last.missionType,userId:last.userId,result:(last.result||"").substring(0,300)}));
                    c.end();
                  } else if (cnt >= 60) { console.log("TIMEOUT"); c.end(); }
                  else setTimeout(chk, 10000);
                } catch { console.log("PARSE ERR, raw:", d2.substring(0,200)); setTimeout(chk, 10000); }
              });
            });
          };
          setTimeout(chk, 15000);
        });
      });
    }).on("data", d => process.stdout.write(d));
    s.stderr.on("data", d => process.stderr.write(d));
  });
});
c.connect({ host: "43.157.227.205", username: "ubuntu", password: "river-86%-falcon", readyTimeout: 600000 });
