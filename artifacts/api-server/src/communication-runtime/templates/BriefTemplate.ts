import type { ExecutiveBrief } from "../../executive-runtime/core";

export function formatBriefMessage(brief: ExecutiveBrief): string {
  let msg = `*${brief.title}*\n`;
  msg += `*Date:* ${brief.date}\n`;
  msg += `*Summary:* ${brief.summary}\n\n`;

  for (const section of brief.sections) {
    msg += `*${section.title}*\n`;
    for (const item of section.items.slice(0, 5)) {
      msg += `→ ${item}\n`;
    }
    msg += "\n";
  }

  if (brief.actionItems.length > 0) {
    msg += `*Action Items (${brief.actionItems.length})*\n`;
    for (const item of brief.actionItems.slice(0, 5)) {
      msg += `☐ ${item}\n`;
    }
  }

  return msg;
}
