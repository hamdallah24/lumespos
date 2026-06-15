import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cwd = __dirname;
const dotenvPath = fileURLToPath(new URL("./.env", import.meta.url));
const env = {
  ...process.env,
  NODE_ENV: "development",
  DOTENV_CONFIG_PATH: dotenvPath,
};

function runNodeScript(args) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runNodeScript(["./build.mjs"]);
runNodeScript(["-r", "dotenv/config", "--enable-source-maps", "./dist/index.mjs"]);
