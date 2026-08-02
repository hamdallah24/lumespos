import { Client } from "ssh2";

const HOST = "43.157.227.205";
const KEY = "AIzaSyDIgojeTm-tFbl_Esa-2R05W47Eo5dAE-c";

async function run() {
  const conn = new Client();
  conn.on("ready", () => {
    // Try listing models via the OpenAI-compatible endpoint
    conn.exec(`curl -s "https://generativelanguage.googleapis.com/v1beta/openai/models" -H "Authorization: Bearer ${KEY}" 2>&1 | python3 -c "
import sys,json
data = json.load(sys.stdin)
for m in data.get('data',[]):
  print(m['id'])
" 2>/dev/null || echo "OpenAI endpoint failed, trying native API"`, (e, s) => {
      if (e) { console.error(e); conn.end(); return; }
      let o = "";
      s.on("data", d => o += d);
      s.on("close", () => {
        console.log("OpenAI-compatible models:");
        console.log(o.slice(0, 2000));

        // Also try the native API list
        if (o.includes("failed")) {
          conn.exec(`curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}" 2>&1 | python3 -c "
import sys,json
data = json.load(sys.stdin)
for m in data.get('models',[]):
  print(m['name'])
"`, (e2, s2) => {
            let o2 = "";
            s2.on("data", d => o2 += d);
            s2.on("close", () => {
              console.log("Native API models:");
              console.log(o2.slice(0, 2000));

              // Test the most common free model
              conn.exec(`echo '{"model":"gemini-2.0-flash","messages":[{"role":"user","content":"balas: halo"}],"max_tokens":30}' > /tmp/gemini2.json && curl -s -w "\\nHTTP:%{http_code}" -X POST 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' -H 'Content-Type: application/json' -H "Authorization: Bearer ${KEY}" -d @/tmp/gemini2.json`, (e3, s3) => {
                let o3 = "";
                s3.on("data", d => o3 += d);
                s3.on("close", () => {
                  console.log("\\nTest gemini-2.0-flash:");
                  console.log(o3.slice(0, 500));
                  conn.end();
                });
              });
            });
          });
        } else {
          conn.end();
        }
      });
    });
  });
  conn.on("error", e => { console.error(e); process.exit(1); });
  conn.connect({ host: HOST, username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
}

run().catch(e => console.error(e));
