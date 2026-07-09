import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon", PROJECT = "/home/ubuntu/lumespos";
const c = new Client();
c.on("ready", () => {
  // Step 1: Inject bug
  c.exec(`sed -i 's/Single entry point/Single entri point/' ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts && grep -n "entri" ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`, (e1, s1) => {
    let o1 = "";
    s1.on("data", d => o1 += d);
    s1.on("close", () => {
      console.log("Bug injected:", o1.trim());
      // Step 2: Login
      c.exec(`curl -s -m 10 -c /tmp/qa_apr.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}'`, (e2, s2) => {
        let o2 = "";
        s2.on("data", d => o2 += d);
        s2.on("close", () => {
          console.log("Login OK");
          // Step 3: Record BEFORE timestamp
          c.exec(`stat -c %Y ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`, (e3, s3) => {
            let o3 = "";
            s3.on("data", d => o3 += d);
            s3.on("close", () => {
              const before = o3.trim();
              console.log("BEFORE:", before);
              // Step 4: Send CTO implementation command
              console.log("Sending CTO command...");
              c.exec(`curl -s -m 300 -b /tmp/qa_apr.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi cari dan perbaiki bug di file execution-pipeline.ts","mode":"ceo"}' 2>&1 | grep -E "type.*meta|type.*done|APPROVED|writeFile|editFile" | head -10`, (e4, s4) => {
                let o4 = "";
                s4.on("data", d => o4 += d);
                s4.on("close", () => {
                  console.log("CTO Response:", o4);
                  // Step 5: Record AFTER timestamp
                  c.exec(`stat -c %Y ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`, (e5, s5) => {
                    let o5 = "";
                    s5.on("data", d => o5 += d);
                    s5.on("close", () => {
                      const after = o5.trim();
                      console.log("AFTER:", after);
                      if (before !== after) {
                        console.log("✅ FILE BERUBAH!");
                        c.exec(`grep -n "entri\\|entry" ${PROJECT}/artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts`, (e6, s6) => {
                          let o6 = "";
                          s6.on("data", d => o6 += d);
                          s6.on("close", () => { console.log(o6); c.end(); });
                        });
                      } else {
                        console.log("❌ FILE TIDAK BERUBAH");
                        c.end();
                      }
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
