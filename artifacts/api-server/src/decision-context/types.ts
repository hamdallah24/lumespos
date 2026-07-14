export interface DecisionContext {
  id: string;
  generatedAt: string;
  businessState: BusinessState;
  resources: ResourceState;
  strategicContext: StrategicContext;
  operationalContext: OperationalContext;
  riskProfile: RiskProfile;
}

export interface BusinessState {
  cashAvailable: number;
  activeBranches: number;
  activeEmployees: number;
  currentWorkload: number;
  operatingHours: number;
}

export interface ResourceState {
  inventoryAvailability: number;
  productionCapacity: number;
  logisticsCapacity: number;
  availableBudget: number;
}

export interface StrategicContext {
  activeCampaigns: string[];
  currentQuarterGoals: string[];
  northStarWeights: Record<string, number>;
  founderPriority: string[];
}

export interface OperationalContext {
  weather?: string;
  holidays?: boolean;
  cityEvents?: string[];
  seasonality?: string;
}

export interface RiskProfile {
  riskTolerance: "low" | "medium" | "high";
  maximumBudgetExposure: number;
  currentOperationalRisk: number;
}

export type BusinessStateCollector = () => BusinessState | Promise<BusinessState>;
export type ResourceAnalyzer = () => ResourceState | Promise<ResourceState>;
export type StrategicContextBuilder = () => StrategicContext | Promise<StrategicContext>;
export type OperationalContextBuilder = () => OperationalContext | Promise<OperationalContext>;
export type RiskProfileAnalyzer = () => RiskProfile | Promise<RiskProfile>;
