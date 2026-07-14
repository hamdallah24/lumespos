import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

/** Resolve the Point-Of-Sale monorepo root */
export function repoRoot(): string {
  // When running from dist/: .../tools/dgps/dist/utils/paths.js
  // Go up: dist/utils/ → dist/ → dgps/ → tools/ → Point-Of-Sale/
  const self = dirname(fileURLToPath(import.meta.url));
  return resolve(self, "..", "..", "..", "..");
}

/** Resolved paths */
export function paths() {
  const root = repoRoot();
  return {
    root,
    docs: resolve(root, "docs"),
    aiDir: resolve(root, ".ai"),
    aiRegistry: resolve(root, ".ai", "registry"),
    aiGenerated: resolve(root, ".ai", "generated"),
    aiGeneratedRuntime: resolve(root, ".ai", "generated", "executive"),
    aiGeneratedExecutive: resolve(root, ".ai", "generated", "executive"),
    aiGeneratedFoundation: resolve(root, ".ai", "generated", "foundation"),
    aiGeneratedKnowledge: resolve(root, ".ai", "generated", "knowledge"),
    aiGeneratedPrompt: resolve(root, ".ai", "generated", "prompt"),
    aiGeneratedAdr: resolve(root, ".ai", "generated", "adr"),
    aiGeneratedGraphs: resolve(root, ".ai", "generated", "graphs"),
  };
}
