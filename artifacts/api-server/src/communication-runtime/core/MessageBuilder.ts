import type { ExecutiveBrief } from "../../executive-runtime/core";
import type { ApprovalRequest } from "../../executive-runtime/core";

export const MessageBuilder = {
  fromBrief(brief: ExecutiveBrief, channel: string): string {
    switch (channel) {
      case "whatsapp":
        return this.whatsAppBrief(brief);
      case "telegram":
        return this.telegramBrief(brief);
      case "email":
        return this.emailBrief(brief);
      case "dashboard":
        return JSON.stringify(brief);
      default:
        return brief.summary;
    }
  },

  fromApproval(approval: ApprovalRequest, channel: string): string {
    const header = `*${approval.title}*\n${approval.description}\n\n`;
    const options = approval.options.map(o => `- ${o.label}: ${o.description}`).join("\n");
    const body = `${header}Impact: ${approval.impact}\nRequired level: ${approval.requiredLevel}\n\nOptions:\n${options}`;

    switch (channel) {
      case "whatsapp":
        return body;
      case "telegram":
        return body;
      case "email":
        return `<h2>${approval.title}</h2><p>${approval.description}</p><ul>${approval.options.map(o => `<li><b>${o.label}</b>: ${o.description}</li>`).join("")}</ul>`;
      default:
        return body;
    }
  },

  fromAlert(title: string, message: string, channel: string): string {
    switch (channel) {
      case "whatsapp":
        return `*${title}*\n${message}`;
      case "telegram":
        return `**${title}**\n${message}`;
      case "email":
        return `<h2>${title}</h2><p>${message}</p>`;
      default:
        return `${title}: ${message}`;
    }
  },

  whatsAppBrief(brief: ExecutiveBrief): string {
    let msg = `*${brief.title}*\n_${brief.date}_\n\n`;
    msg += `*Summary:* ${brief.summary}\n\n`;
    for (const section of brief.sections.slice(0, 3)) {
      msg += `*${section.title}*\n`;
      for (const item of section.items.slice(0, 3)) {
        msg += `- ${item.slice(0, 80)}\n`;
      }
      msg += "\n";
    }
    if (brief.actionItems.length > 0) {
      msg += `*Action Items:* ${brief.actionItems.length} pending\n`;
      for (const item of brief.actionItems.slice(0, 3)) {
        msg += `- ${item.slice(0, 60)}\n`;
      }
    }
    return msg;
  },

  telegramBrief(brief: ExecutiveBrief): string {
    let msg = `**${brief.title}**\n_${brief.date}_\n\n`;
    msg += `**Summary:** ${brief.summary}\n\n`;
    for (const section of brief.sections.slice(0, 3)) {
      msg += `**${section.title}**\n`;
      for (const item of section.items.slice(0, 3)) {
        msg += `- ${item.slice(0, 80)}\n`;
      }
      msg += "\n";
    }
    return msg;
  },

  emailBrief(brief: ExecutiveBrief): string {
    let html = `<h1>${brief.title}</h1><p><em>${brief.date}</em></p>`;
    html += `<p><strong>Summary:</strong> ${brief.summary}</p>`;
    for (const section of brief.sections) {
      html += `<h2>${section.title}</h2><ul>`;
      for (const item of section.items) {
        html += `<li>${item}</li>`;
      }
      html += `</ul>`;
    }
    return html;
  },
};
