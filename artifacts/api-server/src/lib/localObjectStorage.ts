import { randomUUID } from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Pastikan folder uploads ada
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
  }
}

export class ObjectStorageService {
  async getObjectEntityUploadURL(): Promise<string> {
  const objectId = randomUUID();
  return `/api/local-upload/${objectId}`;
}

  normalizeObjectEntityPath(rawPath: string): string {
  // Ekstrak objectId dari URL penuh
  const match = rawPath.match(/\/local-upload\/([^/?]+)/);
  if (match) {
    return `/objects/${match[1]}`;
  }
  return rawPath;
}

  async getObjectEntityFile(objectPath: string): Promise<string> {
    const filename = objectPath.replace("/objects/", "");
    const fullPath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      throw new ObjectNotFoundError();
    }
    return fullPath;
  }

  async downloadObject(filePath: string): Promise<Response> {
    const stat = await fsp.stat(filePath);
    if (stat.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${stat.size} bytes (max ${MAX_FILE_SIZE})`);
    }
    const buffer = await fsp.readFile(filePath);
    const ext = path.extname(filePath).slice(1) || "jpeg";
    return new Response(buffer, {
      headers: {
        "Content-Type": `image/${ext}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  async searchPublicObject(_filePath: string): Promise<string | null> {
    return null;
  }

  async trySetObjectEntityAclPolicy(rawPath: string): Promise<string> {
    return rawPath;
  }

  async canAccessObjectEntity(): Promise<boolean> {
    return true;
  }
}
