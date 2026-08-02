import { Client } from "ssh2";

const HOST = "43.157.227.205";
const REMOTE = "/home/ubuntu/lumespos/artifacts/api-server";

async function run() {
  const conn = new Client();

  conn.on("ready", () => {
    const results = [];

    // TEST 1: Gemini in bundle
    conn.exec(`grep -c 'callGemini' ${REMOTE}/dist/index.mjs`, (e, s) => {
      let o = "";
      s.on("data", d => o += d);
      s.on("close", () => {
        results.push({ test: "1. Gemini fallback in bundle", pass: parseInt(o.trim()) > 0, detail: `callGemini found ${o.trim()}x` });

        // TEST 2: Gemini key
        conn.exec(`grep '^GOOGLE_GEMINI_API_KEY=' ${REMOTE}/.env | grep -v '^#'`, (e2, s2) => {
          let o2 = "";
          s2.on("data", d => o2 += d);
          s2.on("close", () => {
            const key = o2.trim();
            results.push({ test: "2. Gemini API key set", pass: key.length > 20 && key.includes("="), detail: key ? "Key present" : "MISSING" });

            // TEST 3: Gemini API connectivity
            const apiKey = key.split("=")[1]?.trim();
            if (apiKey) {
              conn.exec(`curl -s -w "\\nHTTP_CODE:%{http_code}" -X POST "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" -H "Content-Type: application/json" -H "Authorization: Bearer ${apiKey}" -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"Hi"}],"max_tokens":20}'`, (e3, s3) => {
                let o3 = "";
                s3.on("data", d => o3 += d);
                s3.on("close", () => {
                  const httpMatch = o3.match(/HTTP_CODE:(\d+)/);
                  const http = httpMatch ? httpMatch[1] : "?";
                  const hasContent = o3.includes('"content"');
                  results.push({ test: "3. Gemini API connectivity", pass: http === "200" && hasContent, detail: `HTTP ${http}` });

                  // TEST 4: CEO Architecture - no erpContexts
                  conn.exec(`grep -c 'erpContexts\\|erpContext\\|__executiveBI\\|__businessIntelligence' ${REMOTE}/src/executive-runtime/executives/CEO/CEOProgram.ts`, (e4, s4) => {
                    let o4 = "";
                    s4.on("data", d => o4 += d);
                    s4.on("close", () => {
                      const refs = parseInt(o4.trim());
                      results.push({ test: "4. CEO no erpContexts/BI refs", pass: refs === 0, detail: `${refs} references (REASONING mode, delegates to others)` });

                      // TEST 5: Other executives use BI
                      conn.exec(`for e in COO CFO CMO CHRO CAIO; do echo "$e:$(grep -c '__businessIntelligence\\|__executiveBI' ${REMOTE}/src/executive-runtime/executives/\$e/\${e}Program.ts 2>/dev/null || echo 0)"; done`, (e5, s5) => {
                        let o5 = "";
                        s5.on("data", d => o5 += d);
                        s5.on("close", () => {
                          const lines = o5.trim().split("\n");
                          const allHaveBI = lines.every(l => {
                            const count = parseInt(l.split(":")[1]);
                            return count > 0;
                          });
                          results.push({ test: "5. Executives BI adoption", pass: allHaveBI, detail: o5.trim().replace(/\n/g, ", ") });

                          // TEST 6: shouldFallback function
                          conn.exec(`grep -c 'shouldFallback' ${REMOTE}/dist/index.mjs`, (e6, s6) => {
                            let o6 = "";
                            s6.on("data", d => o6 += d);
                            s6.on("close", () => {
                              results.push({ test: "6. shouldFallback logic in bundle", pass: parseInt(o6.trim()) > 0, detail: `found ${o6.trim()}x` });

                              // REPORT
                              console.log("\n=== QA TEST REPORT ===");
                              console.log("=".repeat(60));
                              let passed = 0;
                              for (const r of results) {
                                const icon = r.pass ? "PASS" : "FAIL";
                                if (r.pass) passed++;
                                console.log(`${icon}: ${r.test}`);
                                console.log(`     ${r.detail}`);
                              }
                              console.log("=".repeat(60));
                              console.log(`Result: ${passed}/${results.length} passed`);
                              conn.end();
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            } else {
              results.push({ test: "3. Gemini API connectivity", pass: false, detail: "No key to test" });
              console.log("\n=== INCOMPLETE — No Gemini key ===");
              for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}: ${r.test} — ${r.detail}`);
              conn.end();
            }
          });
        });
      });
    });
  });

  conn.on("error", e => { console.error("SSH error:", e.message); process.exit(1); });
  conn.connect({ host: HOST, username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
}

run().catch(e => { console.error(e); process.exit(1); });
