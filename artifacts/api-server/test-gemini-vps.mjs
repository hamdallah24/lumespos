import { Client } from "ssh2";

const HOST = "43.157.227.205";

async function run() {
  const payload = Buffer.from(JSON.stringify({
    model: "gemini-2.5-flash",
    messages: [{ role: "user", content: "balas: halo" }],
    max_tokens: 30,
  })).toString("base64");

  console.log("Base64 payload:", payload);

  const conn = new Client();
  conn.on("ready", () => {
    conn.exec(`echo ${payload} | base64 -d > /tmp/gemini.json && curl -s -w "\\nHTTP_CODE:%{http_code}" -X POST 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' -H 'Content-Type: application/json' -H 'Authorization: Bearer AIzaSyDIgojeTm-tFbl_Esa-2R05W47Eo5dAE-c' -d @/tmp/gemini.json`, (e, s) => {
      if (e) { console.error(e); conn.end(); return; }
      let o = "";
      s.on("data", d => o += d);
      s.on("close", () => {
        console.log("Result:", o);

        // Also check if the running PM2 process has the env var
        conn.exec("cat /proc/$(pgrep -f 'node.*pos-api' | head -1)/environ 2>/dev/null | tr '\\0' '\\n' | grep GEMINI", (e2, s2) => {
          let o2 = "";
          s2.on("data", d => o2 += d);
          s2.on("close", () => {
            console.log("PM2 env GEMINI:", o2 || "NOT FOUND");
            conn.end();
          });
        });
      });
    });
  });
  conn.on("error", e => { console.error(e); process.exit(1); });
  conn.connect({ host: HOST, username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
}

run().catch(e => console.error(e));
