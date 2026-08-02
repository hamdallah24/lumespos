import { Client } from "ssh2";

const HOST = "43.157.227.205";
const REMOTE = "/home/ubuntu/lumespos/artifacts/api-server";

async function run() {
  const conn = new Client();

  conn.on("ready", () => {
    console.log("SSH connected");

    // 1. Read current file
    conn.exec(`cat ${REMOTE}/src/ai/llm/llm-adapter.ts`, (e, s) => {
      if (e) { console.error(e); conn.end(); return; }
      let current = "";
      s.on("data", (d) => current += d);
      s.on("close", async () => {
        console.log("Read llm-adapter.ts (" + current.length + " chars)");

        // 2. Apply patches
        let patched = current;

        // 2a. Add fallback vars
        patched = patched.replace(
          "const TIMEOUT_MS = 45000;\n",
          `const TIMEOUT_MS = 45000;
const GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function shouldFallback(status) {
  return [401, 402, 403, 429, 500, 502, 503].includes(status);
}
`
        );

        // 2b. Add callGemini function
        const callGeminiFn = `
// ── Gemini Fallback ──
async function callGemini(messages, tools, maxTokens, jsonMode) {
  if (!GEMINI_KEY) { console.warn("[gemini] No key"); return null; }
  try {
    const body = { model: GEMINI_MODEL, messages, max_tokens: Math.min(maxTokens, 4000), temperature: 0.7 };
    if (jsonMode) body.response_format = { type: "json_object" };
    const resp = await fetch(GEMINI_BASE + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + GEMINI_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) { console.warn("[gemini] HTTP " + resp.status); return null; }
    const json = await resp.json();
    const msg = json.choices?.[0]?.message;
    if (!msg) return null;
    return {
      content: msg.content?.trim() || "",
      toolCalls: (msg.tool_calls || []).map(tc => ({
        id: tc.id, name: tc.function?.name || "unknown",
        args: JSON.parse(tc.function?.arguments || "{}"),
      })),
    };
  } catch (err) { console.warn("[gemini] Error:", err.message); return null; }
}
`;

        patched = patched.replace(
          "export async function callLLMWithTools(",
          callGeminiFn + "\n\nexport async function callLLMWithTools("
        );

        // 2c. Fallback in callLLMWithTools
        const origLLMFail = `    console.error(\`[ai] DeepSeek HTTP \${resp.status}: \${errBody.slice(0, 300)}\`);\n    return { message: null, content: "", toolCalls: [], tokensUsed: 0, status: "error", errorStatus: resp.status };`;
        const newLLMFail = `    console.error(\`[ai] DeepSeek HTTP \${resp.status}: \${errBody.slice(0, 300)}\`);\n    if (shouldFallback(resp.status)) {\n      console.log("[ai] Fallback ke Gemini...");\n      const gemini = await callGemini(clean, tools, maxTokens, jsonMode);\n      if (gemini) return { message: null, content: gemini.content, toolCalls: gemini.toolCalls, tokensUsed: 0, status: gemini.toolCalls.length > 0 ? "tool_calls" : "ok" };\n    }\n    return { message: null, content: "", toolCalls: [], tokensUsed: 0, status: "error", errorStatus: resp.status };`;
        patched = patched.replace(origLLMFail, newLLMFail);

        // 2d. Fallback in callDeepSeek
        const origDSFail = `      console.error(\`[ai] DeepSeek HTTP \${resp.status}: \${err.slice(0, 300)}\`);\n      return \`ERROR: AI tidak merespon (HTTP \${resp.status}). \${err.slice(0, 100)}\`;`;
        const newDSFail = `      console.error(\`[ai] DeepSeek HTTP \${resp.status}: \${err.slice(0, 300)}\`);\n      if (shouldFallback(resp.status)) {\n        console.log("[ai] Fallback ke Gemini...");\n        const gemini = await callGemini(messages, [], safeMaxTokens, jsonMode);\n        if (gemini) { await remember(userId, mode, user, gemini.content); return gemini.content; }\n      }\n      return \`ERROR: AI tidak merespon (HTTP \${resp.status}). \${err.slice(0, 100)}\`;`;
        patched = patched.replace(origDSFail, newDSFail);

        if (patched === current) {
          console.error("ERROR: No changes applied — pattern mismatch");
          conn.end();
          return;
        }

        // 3. SFTP upload
        conn.sftp((err, sftp) => {
          if (err) { console.error("SFTP error:", err); conn.end(); return; }
          const buf = Buffer.from(patched, "utf-8");
          const remotePath = REMOTE + "/src/ai/llm/llm-adapter.ts";
          const wstream = sftp.createWriteStream(remotePath);
          wstream.on("close", () => {
            console.log("Uploaded llm-adapter.ts (" + buf.length + " bytes)");
            sftp.end();

            // 4. Update .env if needed
            conn.exec("grep -q GOOGLE_GEMINI_API_KEY " + REMOTE + "/.env && echo EXISTS || echo MISSING", (e2, s2) => {
              let check = "";
              s2.on("data", d => check += d);
              s2.on("close", () => {
                if (check.trim() === "MISSING") {
                  conn.exec("echo '\n# Gemini fallback — gratis 250 req/hari via Google AI Studio\n# GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here\n# GEMINI_MODEL=gemini-2.5-flash' >> " + REMOTE + "/.env", () => {
                    console.log("Updated .env with Gemini placeholder");
                    doBuild(conn);
                  });
                } else {
                  console.log(".env already has GOOGLE_GEMINI_API_KEY");
                  doBuild(conn);
                }
              });
            });
          });
          wstream.write(buf);
          wstream.end();
        });
      });
    });
  });

  conn.on("error", e => { console.error("SSH error:", e.message); process.exit(1); });
  conn.connect({ host: HOST, username: "ubuntu", password: "river-86%-falcon", readyTimeout: 30000 });
}

function doBuild(conn) {
  console.log("Building...");
  conn.exec("cd /home/ubuntu/lumespos/artifacts/api-server && node build.mjs 2>&1", (e, s) => {
    let o = "";
    s.on("data", d => o += d);
    s.on("close", () => {
      console.log("Build output:", o.trim());
      console.log("Restarting PM2...");
      conn.exec("pm2 restart pos-api --update-env 2>&1", (e2, s2) => {
        let o2 = "";
        s2.on("data", d => o2 += d);
        s2.on("close", () => {
          console.log("PM2 restart:", o2.trim());
          conn.end();
          console.log("Done! Gemini fallback deployed.");
        });
      });
    });
  });
}

run().catch(e => { console.error(e); process.exit(1); });
