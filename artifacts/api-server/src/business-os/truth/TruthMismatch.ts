export type MismatchType =
  | 'WRONG_PERIOD'
  | 'INVENTED_NUMBER'
  | 'INVENTED_DATE'
  | 'INVENTED_BRANCH'
  | 'INVENTED_PRODUCT'
  | 'INVENTED_SUPPLIER'
  | 'INVENTED_KPI'
  | 'WRONG_BRANCH'
  | 'UNSUPPORTED_CLAIM'
  | 'INVENTED_ENTITY'
  | 'MISSING_DATA_CLAIM';

export type MismatchSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TruthMismatch {
  id: string;
  executive: string;
  type: MismatchType;
  statement: string;
  expected?: string;
  actual: string;
  severity: MismatchSeverity;
  contextPath?: string;
  confidence: number;
  timestamp: string;
}

export function makeMismatch(
  executive: string,
  type: MismatchType,
  statement: string,
  actual: string,
  expected?: string,
  contextPath?: string,
  severity?: MismatchSeverity,
): TruthMismatch {
  const sevMap: Record<MismatchType, MismatchSeverity> = {
    WRONG_PERIOD: 'CRITICAL',
    INVENTED_NUMBER: 'CRITICAL',
    INVENTED_DATE: 'CRITICAL',
    INVENTED_BRANCH: 'HIGH',
    INVENTED_PRODUCT: 'HIGH',
    INVENTED_SUPPLIER: 'HIGH',
    INVENTED_KPI: 'CRITICAL',
    WRONG_BRANCH: 'HIGH',
    UNSUPPORTED_CLAIM: 'MEDIUM',
    INVENTED_ENTITY: 'HIGH',
    MISSING_DATA_CLAIM: 'HIGH',
  };
  return {
    id: `mm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    executive,
    type,
    statement,
    expected,
    actual,
    severity: severity || sevMap[type],
    contextPath,
    confidence: 1.0,
    timestamp: new Date().toISOString(),
  };
}
