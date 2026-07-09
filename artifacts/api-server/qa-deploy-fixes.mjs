import { Client } from "ssh2";
import { readFileSync } from "fs";
import { join } from "path";

const HOST = "43.157.227.205";
const USER = "ubuntu";
const PASS = "river-86%-falcon";
const PROJECT = "/home/ubuntu/lumespos";

const API_BASE = "D:\\web pos\\Point-Of-Sale\\artifacts\\api-server";
const POS_BASE = "D:\\web pos\\Point-Of-Sale\\artifacts\\pos-app";

const backendFiles = [
  "artifacts/api-server/src/ai/programs/ceo-runtime.ts",
  "artifacts/api-server/src/ai/runtime/execution/execution-pipeline.ts",
  "artifacts/api-server/src/ai/runtime/execution/execution-driver.ts",
  "artifacts/api-server/src/ai/runtime/mission-background-engine.ts",
  "artifacts/api-server/src/ai/runtime/execution/execution-strategy.ts",
  "artifacts/api-server/src/ai/programs/cto-runtime.ts",
  "artifacts/api-server/src/ai/tools/tool-adapter.ts",
  "artifacts/api-server/src/routes/ai-prompts.ts",
  "artifacts/api-server/src/routes/ai.ts",
  "artifacts/api-server/src/ai/runtime/replay-engine.ts",
];

const frontendFiles = [
  "artifacts/pos-app/src/pages/executive.tsx",
  "artifacts/pos-app/src/components/active-missions.tsx",
  "artifacts/pos-app/src/components/mission-detail.tsx",
  "artifacts/pos-app/src/components/markdown-renderer.tsx",
  "artifacts/pos-app/src/index.css",
];

async function exec(client, cmd) {
  return new Promise((resolve, reject) => {
    client.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "", errOut = "";
      stream.on("data", d => out += d);
      stream.stderr.on("data", d => errOut += d);
      stream.on("close", code => {
        if (code !== 0) console.warn(`[WARN] exit code ${code}: ${errOut.slice(0,300)}`);
        resolve(out.trim());
      });
    });
  });
}

async function writeRemote(client, remotePath, content) {
  const b64 = Buffer.from(content).toString("base64");
  const dir = remotePath.substring(0, remotePath.lastIndexOf("/"));
  await exec(client, `mkdir -p "${dir}"`);
  // Write via base64 decode — safe for any content
  await exec(client, `echo "${b64}" | base64 -d > "${remotePath}"`);
}

const client = new Client();
client.on("ready", async () => {
  console.log("SSH connected");
  try {
      // 1. Upload backend files
    for (const f of backendFiles) {
      const localRel = f.replace("artifacts/api-server/src/", "src/");
      const localPath = join(API_BASE, localRel);
      const remotePath = `${PROJECT}/${f}`;
      const content = readFileSync(localPath, "utf8");
      console.log(`Uploading ${f} (${content.length} bytes)...`);
      await writeRemote(client, remotePath, content);
      console.log(`  OK`);
    }

    // 2. Upload frontend files
    const allFrontend = [
      ...frontendFiles,
      { local: "package.json", remote: "artifacts/pos-app/package.json" },
    ];
    for (const f of allFrontend) {
      const isSimple = typeof f === "string";
      const localRel = isSimple ? f.replace("artifacts/pos-app/src/", "src/") : f.local;
      const localPath = isSimple ? join(POS_BASE, localRel) : join(POS_BASE, f.local);
      const remotePath = isSimple ? `${PROJECT}/${f}` : `${PROJECT}/${f.remote}`;
      const content = readFileSync(localPath, "utf8");
      console.log(`Uploading ${isSimple ? f : f.remote} (${content.length} bytes)...`);
      await writeRemote(client, remotePath, content);
      console.log(`  OK`);
    }

    // 3.5 Install frontend dependencies
    console.log("Installing frontend dependencies...");
    await exec(client, `cd ${PROJECT}/artifacts/pos-app && pnpm install 2>&1`);

    // 4. Build API
    console.log("Building API...");
    const buildOut = await exec(client, `cd ${PROJECT}/artifacts/api-server && node build.mjs 2>&1`);
    console.log(buildOut || "(no output)");

    // 4. Build Frontend
    console.log("Building Frontend...");
    const feBuildOut = await exec(client, `cd ${PROJECT}/artifacts/pos-app && pnpm build 2>&1`);
    console.log(feBuildOut?.slice(0, 500) || "(no output)");

    // 5. Restart PM2
    console.log("Restarting PM2...");
    const restartOut = await exec(client, `pm2 restart pos-api`);
    console.log(restartOut);

    // 6. Quick verify
    console.log("Verifying...");
    const logOut = await exec(client, `pm2 logs pos-api --lines 3 --nostream`);
    console.log(logOut.slice(0, 500));

    console.log("\nDONE");
  } catch (e) {
    console.error("Error:", e.message);
  }
  client.end();
});
client.on("error", e => { console.error("SSH error:", e.message); process.exit(1); });
client.connect({ host: HOST, username: USER, password: PASS, readyTimeout: 30000 });
