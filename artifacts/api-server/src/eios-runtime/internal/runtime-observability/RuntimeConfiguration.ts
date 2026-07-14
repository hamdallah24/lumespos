export type DeploymentEnvironment = "development" | "testing" | "staging" | "production";

interface EnvConfig {
  logLevel: string;
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  profilingEnabled: boolean;
  circuitBreakerEnabled: boolean;
  backpressureMode: string;
  healthEndpointEnabled: boolean;
  performanceBudgetEnabled: boolean;
  governanceIntervalMs: number;
  memoryLeakDetectionEnabled: boolean;
}

const configs: Record<DeploymentEnvironment, EnvConfig> = {
  development: {
    logLevel: "DEBUG",
    metricsEnabled: false,
    tracingEnabled: true,
    profilingEnabled: true,
    circuitBreakerEnabled: false,
    backpressureMode: "queue",
    healthEndpointEnabled: true,
    performanceBudgetEnabled: false,
    governanceIntervalMs: 120000,
    memoryLeakDetectionEnabled: false,
  },
  testing: {
    logLevel: "INFO",
    metricsEnabled: true,
    tracingEnabled: true,
    profilingEnabled: true,
    circuitBreakerEnabled: true,
    backpressureMode: "queue",
    healthEndpointEnabled: true,
    performanceBudgetEnabled: true,
    governanceIntervalMs: 60000,
    memoryLeakDetectionEnabled: true,
  },
  staging: {
    logLevel: "INFO",
    metricsEnabled: true,
    tracingEnabled: true,
    profilingEnabled: true,
    circuitBreakerEnabled: true,
    backpressureMode: "throttle",
    healthEndpointEnabled: true,
    performanceBudgetEnabled: true,
    governanceIntervalMs: 60000,
    memoryLeakDetectionEnabled: true,
  },
  production: {
    logLevel: "WARN",
    metricsEnabled: true,
    tracingEnabled: true,
    profilingEnabled: true,
    circuitBreakerEnabled: true,
    backpressureMode: "throttle",
    healthEndpointEnabled: true,
    performanceBudgetEnabled: true,
    governanceIntervalMs: 30000,
    memoryLeakDetectionEnabled: true,
  },
};

let current: DeploymentEnvironment = "development";

export const RuntimeConfiguration = {
  setEnvironment(env: DeploymentEnvironment): void { current = env; },
  getEnvironment(): DeploymentEnvironment { return current; },
  get(): EnvConfig { return { ...configs[current] }; },
  merge(overrides: Partial<EnvConfig>): void {
    configs[current] = { ...configs[current], ...overrides };
  },
};
