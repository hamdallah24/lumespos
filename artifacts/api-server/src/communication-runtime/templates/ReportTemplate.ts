interface ReportData {
  title: string;
  period: string;
  sections: { heading: string; content: string; metrics?: Record<string, string | number> }[];
}

export function formatReport(data: ReportData): string {
  let msg = `*${data.title}*\n`;
  msg += `Period: ${data.period}\n\n`;

  for (const section of data.sections) {
    msg += `*${section.heading}*\n`;
    msg += `${section.content}\n`;

    if (section.metrics) {
      for (const [key, value] of Object.entries(section.metrics)) {
        msg += `  ${key}: ${value}\n`;
      }
    }
    msg += "\n";
  }

  return msg;
}
