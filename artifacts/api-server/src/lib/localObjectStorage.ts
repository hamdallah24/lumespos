import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), "uploads");

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
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}/api/local-upload/${objectId}`;
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
    const buffer = fs.readFileSync(filePath);
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