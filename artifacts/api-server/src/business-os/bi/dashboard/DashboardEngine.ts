import type { KPIValue, KPIAlert, ForecastResult, HealthScoreResult, NarrativeInsight, ExecutiveDashboard } from "../types";
import { CEOBoard } from "./CEOBoard";
import { COOBoard } from "./COOBoard";
import { CFOBoard } from "./CFOBoard";
import { CHROBoard } from "./CHROBoard";
import { CMOBoard } from "./CMOBoard";
import { CAIOBoard } from "./CAIOBoard";
import { CKOBoard } from "./CKOBoard";
import { FounderBoard } from "./FounderBoard";

type BoardConstructor<T> = new () => T;

interface ExecBoardMap {
  ceo: CEOBoard;
  coo: COOBoard;
  cfo: CFOBoard;
  chro: CHROBoard;
  cmo: CMOBoard;
  caio: CAIOBoard;
  cko: CKOBoard;
  founder: FounderBoard;
}

const EXECUTIVE_META: Record<string, { title: string; requiresForecast: boolean; requiresHealth: boolean; requiresNarratives: boolean }> = {
  CEO: { title: "CEO Dashboard", requiresForecast: true, requiresHealth: true, requiresNarratives: false },
  COO: { title: "COO Dashboard", requiresForecast: true, requiresHealth: false, requiresNarratives: false },
  CFO: { title: "CFO Dashboard", requiresForecast: true, requiresHealth: false, requiresNarratives: false },
  CHRO: { title: "CHRO Dashboard", requiresForecast: false, requiresHealth: false, requiresNarratives: false },
  CMO: { title: "CMO Dashboard", requiresForecast: true, requiresHealth: false, requiresNarratives: false },
  CAIO: { title: "CAIO Dashboard", requiresForecast: false, requiresHealth: false, requiresNarratives: false },
  CKO: { title: "CKO Dashboard", requiresForecast: false, requiresHealth: false, requiresNarratives: false },
};

const EXECUTIVE_BOARDS: Record<string, keyof ExecBoardMap> = {
  CEO: "ceo",
  COO: "coo",
  CFO: "cfo",
  CHRO: "chro",
  CMO: "cmo",
  CAIO: "caio",
  CKO: "cko",
};

export class DashboardEngine {
  ceo: CEOBoard;
  coo: COOBoard;
  cfo: CFOBoard;
  chro: CHROBoard;
  cmo: CMOBoard;
  caio: CAIOBoard;
  cko: CKOBoard;
  founder: FounderBoard;

  constructor() {
    this.ceo = new CEOBoard();
    this.coo = new COOBoard();
    this.cfo = new CFOBoard();
    this.chro = new CHROBoard();
    this.cmo = new CMOBoard();
    this.caio = new CAIOBoard();
    this.cko = new CKOBoard();
    this.founder = new FounderBoard();
  }

  buildForExecutive(
    executive: string,
    kpis: KPIValue[],
    alerts: KPIAlert[],
    forecasts: ForecastResult[],
    health: HealthScoreResult,
    narratives: NarrativeInsight[],
  ): ExecutiveDashboard {
    const meta = EXECUTIVE_META[executive];
    if (!meta) {
      throw new Error(`Unknown executive: ${executive}. Valid values: ${Object.keys(EXECUTIVE_META).join(", ")}`);
    }

    const boardKey = EXECUTIVE_BOARDS[executive];
    const board = this[boardKey] as any;

    let sections: any[];
    switch (executive) {
      case "CEO":
        sections = board.build(kpis, alerts, forecasts, health);
        break;
      case "COO":
      case "CFO":
      case "CMO":
        sections = board.build(kpis, alerts, forecasts);
        break;
      case "CHRO":
      case "CAIO":
      case "CKO":
        sections = board.build(kpis, alerts);
        break;
      default:
        throw new Error(`No build handler for executive: ${executive}`);
    }

    return {
      executive,
      title: meta.title,
      sections,
      generatedAt: new Date().toISOString(),
    };
  }

  buildFounderDashboard(
    health: HealthScoreResult,
    kpis: KPIValue[],
    alerts: KPIAlert[],
    forecasts: ForecastResult[],
    narratives: NarrativeInsight[],
  ): ExecutiveDashboard {
    const sections = this.founder.build(health, kpis, alerts, forecasts, narratives);

    return {
      executive: "Founder",
      title: "Founder Dashboard",
      sections,
      generatedAt: new Date().toISOString(),
    };
  }

  buildAll(
    kpis: KPIValue[],
    alerts: KPIAlert[],
    forecasts: ForecastResult[],
    health: HealthScoreResult,
    narratives: NarrativeInsight[],
  ): ExecutiveDashboard[] {
    const dashboards: ExecutiveDashboard[] = [];

    for (const executive of Object.keys(EXECUTIVE_META)) {
      const dashboard = this.buildForExecutive(executive, kpis, alerts, forecasts, health, narratives);
      dashboards.push(dashboard);
    }

    dashboards.push(this.buildFounderDashboard(health, kpis, alerts, forecasts, narratives));

    return dashboards;
  }
}
