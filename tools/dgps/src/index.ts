#!/usr/bin/env node
import { runValidate } from "./commands/validate.js";
import { runCompile } from "./commands/compile.js";
import { runPublish } from "./commands/publish.js";
import { runVerify } from "./commands/verify.js";
import { runDoctor } from "./commands/doctor.js";
import { runExplain } from "./commands/explain.js";
import { runDiff } from "./commands/diff.js";
import { runVerifyRuntime } from "./commands/verify-runtime.js";
import { runInspect } from "./commands/inspect.js";
import { runVisualize } from "./commands/visualize.js";

const commands: Record<string, { fn: (args: string[]) => Promise<void>; desc: string }> = {
  validate:        { fn: runValidate, desc: "Validate all docs/ markdown files" },
  compile:         { fn: runCompile, desc: "Compile docs/ → .ai/generated/" },
  publish:         { fn: runPublish, desc: "Full pipeline: scan→validate→compile→registry→verify→runtime→doctor" },
  verify:          { fn: runVerify, desc: "Verify generated asset integrity" },
  doctor:          { fn: runDoctor, desc: "Full health report" },
  explain:         { fn: runExplain, desc: "Trace asset ID → source → compile chain" },
  diff:            { fn: runDiff, desc: "Version diff for an asset" },
  "verify-runtime":{ fn: runVerifyRuntime, desc: "Auto-load 8 executives, verify no docs/ access" },
  inspect:         { fn: runInspect, desc: "Runtime-focused asset inspection" },
  visualize:       { fn: runVisualize, desc: "Generate 5 SVG graphs" },
};

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || "help";

  if (cmd === "help" || !commands[cmd]) {
    console.log("DGPS — Documentation Graph Publishing System v1.0.0");
    console.log("");
    console.log("Usage: dgps <command> [options]");
    console.log("");
    console.log("Commands:");
    for (const [name, { desc }] of Object.entries(commands)) {
      console.log(`  ${name.padEnd(18)} ${desc}`);
    }
    console.log("");
    console.log("Examples:");
    console.log("  dgps publish");
    console.log("  dgps doctor");
    console.log("  dgps explain ceo-directive");
    console.log("  dgps diff cto-directive");
    console.log("  dgps inspect coo-directive");
    return;
  }

  try {
    await commands[cmd].fn(args.slice(1));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[DGPS] Error: ${msg}`);
    process.exit(1);
  }
}

main();
