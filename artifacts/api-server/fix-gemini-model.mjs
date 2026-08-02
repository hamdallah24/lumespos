import { Client } from "ssh2";

const HOST = "43.157.227.205";
const REMOTE = "/home/ubuntu/lumespos/artifacts/api-server";

async function run() {
  const conn = new Client();
  conn.on("ready", () => {
    // Change default model in source file
    conn.exec(`sed -i 's/gemini-2.5-flash/gemini-2.0-flash/g' ${REMOTE}/src/ai/llm/llm-adapter.ts`, (e, s) => {
      let o = "";
      s.on("data", d => o += d);
      s.on("close", () => {
        console.log("Updated default model to gemini-2.0-flash");

        // Also update .env if GEMINI_MODEL is set
        conn.exec(`grep '^GEMINI_MODEL=' ${REMOTE}/.env && sed -i 's/^GEMINI_MODEL=.*/GEMINI_MODEL=gemini-2.0-flash/' ${REMOTE}/.env || echo "GEMINI_MODEL not in .env (using default)"`, (e2, s2) => {
          let o2 = "";
          s2.on("data", d => o2 += d);
          s2.on("close", () => {
            console.log(o2.trim());

            // Build
            conn.exec(`cd ${REMOTE} && node build.mjs 2>&1`, (e3, s3) => {
              let o3 = "";
              s3.on("data", d => o3 += d);
              s3.on("close", () => {
                if (o3.includes("ERROR")) {
                  console.error("Build failed:", o3);
                  conn.end();
                  return;
                }
                console.log("Build OK");

                // Test Gemini connectivity with new model
                const KEY = "AIzaSyDIgojeTm-tFbl_Esa-2R05W47Eo5dAE-c";
                const payload = JSON.stringify({ model: "gemini-2.0-flash", messages: [{ role: "user", content: "balas: halo" }], max_tokens: 30 });
                const b64 = Buffer.from(payload).toString("base64");
                conn.exec(`echo ${b64} | base64 -d > /tmp/gemini_test.json && curl -s -w "\\nHTTP:%{http_code}" -X POST 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' -H 'Content-Type: application/json' -H "Authorization: Bearer ${KEY}" -d @/tmp/gemini_test.json`, (e4, s4) => {
                  let o4 = "";
                  s4.on("data", d => o4 += d);
                  s4.on("close", () => {
                    const hasContent = o4.includes('"content"');
                    const http = o4.match(/HTTP:(\d+)/);
                    console.log("Gemini test:", hasContent ? "OK (HTTP " + (http?.[1] || "?") + ")" : "FAIL (" + o4.slice(0, 200) + ")");

                    // Restart PM2
                    conn.exec("pm2 restart pos-api --update-env 2>&1", (e5, s5) => {
                      let o5 = "";
                      s5.on("data", d => o5 += d);
                      s5.on("close", () => {
                        console.log("PM2 restarted");
                        console.log("Done. Silakan coba chat CEO lagi.");
                        conn.end();
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
  conn.on("error", e => { console.error(e); process.exit(1); });
  conn.connect({ host: HOST, username: "ubuntu", password: "river-86%-falcon", readyTimeout: 60000 });
}

run().catch(e => console.error(e));
