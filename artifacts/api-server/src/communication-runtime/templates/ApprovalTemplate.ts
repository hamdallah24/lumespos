import type { ApprovalRequest } from "../../executive-runtime/core";

export function formatApprovalMessage(approval: ApprovalRequest): string {
  let msg = `*${approval.title}*\n`;
  msg += `*Requested by:* ${approval.requestedBy}\n`;
  msg += `*Level:* ${approval.requiredLevel}\n`;
  msg += `*Impact:* ${approval.impact}\n\n`;
  msg += `${approval.description}\n\n`;
  msg += `*Options:*\n`;

  for (const opt of approval.options) {
    msg += `/${opt.id} — ${opt.label}: ${opt.description}\n`;
  }

  return msg;
}
