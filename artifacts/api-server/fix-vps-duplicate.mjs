import { Client } from "ssh2";

const HOST = "43.157.227.205";
const REMOTE = "/home/ubuntu/lumespos/artifacts/api-server";

async function run() {
  const conn = new Client();
  conn.on("ready", () => {
    conn.exec(`cat ${REMOTE}/src/ai/llm/llm-adapter.ts`, (e, s) => {
      if (e) { console.error(e); conn.end(); return; }
      let current = "";
      s.on("data", d => current += d);
      s.on("close", () => {
        // Remove duplicates — keep only first occurrence of each
        let fixed = current;

        // Remove second GEMINI_KEY block (lines 33-37)
        fixed = fixed.replace(
          `\nconst GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY;\nconst GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";\nconst GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";\n\nfunction shouldFallback(status) {\n  return [401, 402, 403, 429, 500, 502, 503].includes(status);\n}\n`,
          "\n"
        );

        // Remove second callGemini function (keep first)
        fixed = fixed.replace(
          `\n\n// ── Gemini Fallback ──\nasync function callGemini(messages, tools, maxTokens, jsonMode) {\n  if (!GEMINI_KEY) { console.warn("[gemini] No key"); return null; }\n  try {\n    const body = { model: GEMINI_MODEL, messages, max_tokens: Math.min(maxTokens, 4000), temperature: 0.7 };\n    if (jsonMode) body.response_format = { type: "json_object" };\n    const resp = await fetch(GEMINI_BASE + "/chat/completions", {\n      method: "POST",\n      headers: { "Content-Type": "application/json", Authorization: "Bearer " + GEMINI_KEY },\n      body: JSON.stringify(body),\n      signal: AbortSignal.timeout(30000),\n    });\n    if (!resp.ok) { console.warn("[gemini] HTTP " + resp.status); return null; }\n    const json = await resp.json();\n    const msg = json.choices?.[0]?.message;\n    if (!msg) return null;\n    return {\n      content: msg.content?.trim() || "",\n      toolCalls: (msg.tool_calls || []).map(tc => ({\n        id: tc.id, name: tc.function?.name || "unknown",\n        args: JSON.parse(tc.function?.arguments || "{}"),\n      })),\n    };\n  } catch (err) { console.warn("[gemini] Error:", err.message); return null; }\n}\n`,
          ""
        );

        if (current === fixed) {
          // Try alternative duplicate pattern
          console.log("First pattern didn't match, trying alt...");
          const lines = current.split("\n");
          const seen = new Set();
          const deduped = [];
          let skipCallGemini = false;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip second shouldFallback function declaration
            if (line.includes("function shouldFallback(status)") && seen.has("shouldFallback")) {
              // Skip this line and next 3 lines (function body)
              for (let j = i; j < Math.min(i + 4, lines.length); j++) {
                if (lines[j].trim() === "}") { i = j; break; }
              }
              continue;
            }
            // Skip second callGemini declaration
            if (line.includes("async function callGemini(") && seen.has("callGemini")) {
              skipCallGemini = true;
              continue;
            }
            if (skipCallGemini) {
              if (line.trim() === "}" && line.trim() === "}") {
                skipCallGemini = false;
              }
              continue;
            }
            // Skip duplicate const declarations
            if (line.startsWith("const GEMINI_") && seen.has(line.split("=")[0].trim())) continue;

            // Track
            if (line.includes("shouldFallback")) seen.add("shouldFallback");
            if (line.includes("callGemini")) seen.add("callGemini");
            if (line.startsWith("const GEMINI_KEY")) seen.add("const GEMINI_KEY");
            if (line.startsWith("const GEMINI_BASE")) seen.add("const GEMINI_BASE");
            if (line.startsWith("const GEMINI_MODEL")) seen.add("const GEMINI_MODEL");

            deduped.push(line);
          }
          fixed = deduped.join("\n");
        }

        console.log("Original length:", current.length, "Fixed length:", fixed.length);
        console.log("Changes applied:", current !== fixed);

        // Upload fixed file
        conn.sftp((err, sftp) => {
          if (err) { console.error(err); conn.end(); return; }
          const wstream = sftp.createWriteStream(REMOTE + "/src/ai/llm/llm-adapter.ts");
          wstream.on("close", () => {
            console.log("Uploaded fixed file");
            sftp.end();

            // Build
            console.log("Building...");
            conn.exec(`cd ${REMOTE} && node build.mjs 2>&1`, (e2, s2) => {
              let o = "";
              s2.on("data", d => o += d);
              s2.on("close", () => {
                const success = !o.includes("ERROR");
                console.log(success ? "Build: SUCCESS" : "Build: FAILED\n" + o.slice(0, 500));

                if (success) {
                  conn.exec("pm2 restart pos-api --update-env 2>&1", (e3, s3) => {
                    let o2 = "";
                    s3.on("data", d => o2 += d);
                    s3.on("close", () => {
                      console.log("PM2:", o2.slice(0, 200));
                      conn.end();
                      console.log("Done!");
                    });
                  });
                } else {
                  conn.end();
                }
              });
            });
          });
          wstream.write(Buffer.from(fixed, "utf-8"));
          wstream.end();
        });
      });
    });
  });

  conn.on("error", e => { console.error(e); process.exit(1); });
  conn.connect({ host: HOST, username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
}

run().catch(e => { console.error(e); process.exit(1); });
