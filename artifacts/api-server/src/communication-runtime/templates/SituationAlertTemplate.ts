import type { OperationalSituation } from "../../operational-decision-engine/core/types";

export function formatSituationAlert(situation: OperationalSituation): string {
  let msg = `*Situation Alert: ${situation.title}*\n`;
  msg += `Severity: ${situation.severity.toUpperCase()}\n`;
  msg += `Domain: ${situation.domain}\n`;
  msg += `${situation.description}\n`;

  if (situation.financialImpact) {
    msg += `\nFinancial Impact: ${situation.financialImpact.estimatedLoss} ${situation.financialImpact.currency}`;
  }
  if (situation.operationalImpact) {
    msg += `\nOperational Impact: ${situation.operationalImpact.description}`;
  }

  msg += `\n\n*Action Required*`;
  return msg;
}
