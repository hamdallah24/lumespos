import { mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { scanDocuments } from "../scanner/scanner.js";
import { compileDirectives } from "../compiler/directive-compiler.js";
import { compileFoundation } from "../compiler/foundation-compiler.js";
import { compileKnowledge } from "../compiler/knowledge-compiler.js";
import { compilePrompts } from "../compiler/prompt-compiler.js";
import { compileAdrs } from "../compiler/adr-compiler.js";
import { paths } from "../utils/paths.js";

export async function runCompile(_args: string[]): Promise<void> {
  const sources = scanDocuments();
  console.log(`[DGPS] Compiling ${sources.length} documents...`);

  const directives = compileDirectives(sources);
  const foundations = compileFoundation(sources);
  const knowledges = compileKnowledge(sources);
  const prompts = compilePrompts(sources);
  const adrs = compileAdrs(sources);

  const allAssets = [...directives, ...foundations, ...knowledges, ...prompts, ...adrs];
  console.log(`[DGPS] Compiled ${allAssets.length} assets`);

  // Write generated assets
  const p = paths();
  ensureDir(p.aiGeneratedExecutive);
  ensureDir(p.aiGeneratedFoundation);
  ensureDir(p.aiGeneratedKnowledge);
  ensureDir(p.aiGeneratedPrompt);
  ensureDir(p.aiGeneratedAdr);

  for (const asset of directives) {
    const file = resolve(p.aiGeneratedExecutive, `${asset.id}.directive.json`);
    writeFileSync(file, JSON.stringify(asset, null, 2), "utf-8");
  }

  for (const asset of foundations) {
    const file = resolve(p.aiGeneratedFoundation, `${asset.id}.json`);
    writeFileSync(file, JSON.stringify(asset, null, 2), "utf-8");
  }

  for (const asset of knowledges) {
    const file = resolve(p.aiGeneratedKnowledge, `${asset.id}.json`);
    writeFileSync(file, JSON.stringify(asset, null, 2), "utf-8");
  }

  for (const asset of prompts) {
    const file = resolve(p.aiGeneratedPrompt, `${asset.id}.json`);
    writeFileSync(file, JSON.stringify(asset, null, 2), "utf-8");
  }

  for (const asset of adrs) {
    const file = resolve(p.aiGeneratedAdr, `${asset.id}.json`);
    writeFileSync(file, JSON.stringify(asset, null, 2), "utf-8");
  }

  console.log(`[DGPS] Assets written to ${p.aiGenerated}/`);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
