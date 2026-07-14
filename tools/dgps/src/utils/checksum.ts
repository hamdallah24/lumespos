import { createHash } from "crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf-8").digest("hex");
}

export function fileChecksum(content: string): string {
  return sha256(content);
}

export function objectChecksum(obj: unknown): string {
  return sha256(JSON.stringify(obj));
}
