import yaml from "js-yaml";

export function parseMetadata(content: string): { metadata: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata: {}, body: content };

  const yamlBlock = match[1];
  const body = content.slice(match[0].length);

  try {
    const metadata = yaml.load(yamlBlock) as Record<string, unknown> || {};
    return { metadata, body };
  } catch {
    return { metadata: {}, body: content };
  }
}
