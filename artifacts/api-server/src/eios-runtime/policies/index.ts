import { PolicyRegistry } from "../internal/runtime-policy/PolicyRegistry";
import { parseComponentId } from "../contracts/ComponentId";

const NS = "eios.core";

function policyId(name: string) {
  return parseComponentId(`${NS}:policy:${name}@1.0.0`);
}

PolicyRegistry.register({
  id: policyId("max_parallelism"),
  condition: "pipeline.concurrent < 5",
  action: "allow",
  priority: 100,
});

PolicyRegistry.register({
  id: policyId("stage_timeout"),
  condition: "stage.duration < 30000",
  action: "enforce_timeout",
  priority: 200,
});

PolicyRegistry.register({
  id: policyId("retry_limit"),
  condition: "stage.retries < 4",
  action: "allow_retry",
  priority: 150,
});
