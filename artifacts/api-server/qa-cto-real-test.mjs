import { Client } from "ssh2";
const HOST = "43.157.227.205", USER = "ubuntu", PASS = "river-86%-falcon", PROJECT = "/home/ubuntu/lumespos";
const c = new Client();
c.on("ready", () => {
  // Step 1: Inject unused import ke verification-engine.ts
  const cmd1 = `sed -i '6i import { plan } from "./planner";' ${PROJECT}/artifacts/api-server/src/ai/runtime/verification-engine.ts && echo "=== BUG INJECTED ===" && head -10 ${PROJECT}/artifacts/api-server/src/ai/runtime/verification-engine.ts`;
  c.exec(cmd1, (e1, s1) => {
    let o1 = "";
    s1.on("data", d => o1 += d);
    s1.on("close", () => {
      console.log(o1);
      // Step 2: Login + injector siap
      const cmd2 = `curl -s -m 10 -c /tmp/qa_testbug.txt -X POST 'http://localhost:3000/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"admin@lumespos.com","password":"admin123"}' > /dev/null && echo "Login OK"`;
      c.exec(cmd2, (e2, s2) => {
        let o2 = "";
        s2.on("data", d => o2 += d);
        s2.on("close", () => {
          console.log(o2);
          // Step 3: Catat timestamp before
          const cmd3 = `stat -c %Y ${PROJECT}/artifacts/api-server/src/ai/runtime/verification-engine.ts`;
          c.exec(cmd3, (e3, s3) => {
            let o3 = "";
            s3.on("data", d => o3 += d);
            s3.on("close", () => {
              console.log("=== BEFORE ===", o3.trim());
              // Step 4: Kirim perintah CTO
              console.log("=== SENDING CTO IMPLEMENTATION ===");
              const cmd4 = `curl -s -m 300 -b /tmp/qa_testbug.txt -X POST 'http://localhost:3000/api/ai/chat' -H 'Content-Type: application/json' -d '{"message":"buat misi analisis dan perbaiki file verification-engine.ts - cari unused import, typo, atau logic error. Gunakan writeFile/editFile untuk implementasi.","mode":"ceo"}' 2>&1 | grep -E "type.*meta|type.*done|writeFile|editFile|APPROVED|unused|plan|import" | head -10`;
              c.exec(cmd4, (e4, s4) => {
                let o4 = "";
                s4.on("data", d => o4 += d);
                s4.on("close", () => {
                  console.log(o4);
                  // Step 5: Verify
                  const cmd5 = `echo "=== AFTER ===" && stat -c %Y ${PROJECT}/artifacts/api-server/src/ai/runtime/verification-engine.ts && echo "---" && grep -n "plan" ${PROJECT}/artifacts/api-server/src/ai/runtime/verification-engine.ts && echo "---" && grep -c "import.*plan" ${PROJECT}/artifacts/api-server/src/ai/runtime/verification-engine.ts`;
                  c.exec(cmd5, (e5, s5) => {
                    let o5 = "";
                    s5.on("data", d => o5 += d);
                    s5.on("close", () => {
                      console.log(o5);
                      // Step 6: Restore file
                      const cmd6 = `sed -i '/^import { plan } from \\".\\/planner\\";/d' ${PROJECT}/artifacts/api-server/src/ai/runtime/verification-engine.ts && echo "=== RESTORED ===" && head -8 ${PROJECT}/artifacts/api-server/src/ai/runtime/verification-engine.ts`;
                      c.exec(cmd6, (e6, s6) => {
                        let o6 = "";
                        s6.on("data", d => o6 += d);
                        s6.on("close", () => { console.log(o6); c.end(); });
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
});
c.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 360000 });
