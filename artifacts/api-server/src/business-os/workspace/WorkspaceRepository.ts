import type { ExecutiveWorkspaceState } from "./WorkspaceTypes";
import { serializeWorkspace, deserializeWorkspace } from "./WorkspaceSerializer";

const workspaces = new Map<string, ExecutiveWorkspaceState>();

export function save(workspace: ExecutiveWorkspaceState): void {
  workspace.updatedAt = new Date().toISOString();
  workspaces.set(workspace.executive, workspace);
}

export function get(executive: string): ExecutiveWorkspaceState | undefined {
  return workspaces.get(executive);
}

export function getAll(): ExecutiveWorkspaceState[] {
  return Array.from(workspaces.values());
}

export function exists(executive: string): boolean {
  return workspaces.has(executive);
}

export function remove(executive: string): boolean {
  return workspaces.delete(executive);
}

export function clear(): void {
  workspaces.clear();
}

export function size(): number {
  return workspaces.size;
}

export function getExecutives(): string[] {
  return Array.from(workspaces.keys());
}

export function serializeAll(): string {
  const obj: Record<string, ExecutiveWorkspaceState> = {};
  for (const [exec, state] of workspaces) {
    obj[exec] = state;
  }
  return JSON.stringify(obj, null, 2);
}

export function deserializeAll(json: string): void {
  const obj = JSON.parse(json) as Record<string, ExecutiveWorkspaceState>;
  for (const [exec, state] of Object.entries(obj)) {
    workspaces.set(exec, state);
  }
}

export function loadFromDisk(filePath: string): void {
  try {
    const fs = require("fs");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      deserializeAll(data);
    }
  } catch { }
}

export function saveToDisk(filePath: string): void {
  try {
    const fs = require("fs");
    const data = serializeAll();
    const dir = require("path").dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, data, "utf-8");
  } catch { }
}
