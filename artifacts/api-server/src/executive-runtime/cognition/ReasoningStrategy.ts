import type {
  ExecutiveIntent,
  ThinkingModeSelection,
  MentalModelRef,
  FrameworkRef,
  ReasoningPlan,
  ReasoningStep,
} from "./CognitiveContracts";

const STRATEGY_TEMPLATES: Record<string, readonly ReasoningStep[]> = {
  "decision": [
    { order: 1, action: "clarify", description: "Clarify the decision context and constraints", inputType: "intent", outputType: "refined_intent", dependsOn: [] },
    { order: 2, action: "gather_evidence", description: "Collect relevant evidence from all sources", inputType: "refined_intent", outputType: "evidence", dependsOn: [1] },
    { order: 3, action: "generate_options", description: "Generate decision alternatives", inputType: "evidence", outputType: "alternatives", dependsOn: [2] },
    { order: 4, action: "evaluate_tradeoffs", description: "Evaluate pros and cons of each alternative", inputType: "alternatives", outputType: "evaluation", dependsOn: [3] },
    { order: 5, action: "select", description: "Select the best alternative", inputType: "evaluation", outputType: "decision", dependsOn: [4] },
    { order: 6, action: "validate", description: "Validate decision against constraints", inputType: "decision", outputType: "validated_decision", dependsOn: [5] },
    { order: 7, action: "recommend", description: "Produce recommendation with confidence", inputType: "validated_decision", outputType: "recommendation", dependsOn: [6] },
  ],
  "analysis": [
    { order: 1, action: "scope", description: "Define analysis scope and boundaries", inputType: "intent", outputType: "scoped_question", dependsOn: [] },
    { order: 2, action: "collect_data", description: "Gather relevant data points", inputType: "scoped_question", outputType: "data", dependsOn: [1] },
    { order: 3, action: "identify_patterns", description: "Find patterns and relationships", inputType: "data", outputType: "patterns", dependsOn: [2] },
    { order: 4, action: "draw_insights", description: "Extract actionable insights", inputType: "patterns", outputType: "insights", dependsOn: [3] },
    { order: 5, action: "conclude", description: "Formulate conclusion and implications", inputType: "insights", outputType: "conclusion", dependsOn: [4] },
  ],
  "diagnosis": [
    { order: 1, action: "symptom_collection", description: "Collect all observable symptoms", inputType: "intent", outputType: "symptoms", dependsOn: [] },
    { order: 2, action: "hypothesis_generation", description: "Generate possible root cause hypotheses", inputType: "symptoms", outputType: "hypotheses", dependsOn: [1] },
    { order: 3, action: "hypothesis_testing", description: "Test each hypothesis against evidence", inputType: "hypotheses", outputType: "test_results", dependsOn: [2] },
    { order: 4, action: "root_cause_id", description: "Identify most likely root cause", inputType: "test_results", outputType: "root_cause", dependsOn: [3] },
    { order: 5, action: "remediation", description: "Propose remediation plan", inputType: "root_cause", outputType: "remediation", dependsOn: [4] },
  ],
  "planning": [
    { order: 1, action: "assess_current", description: "Assess current state and constraints", inputType: "intent", outputType: "current_state", dependsOn: [] },
    { order: 2, action: "define_goals", description: "Define clear goals and success criteria", inputType: "current_state", outputType: "goals", dependsOn: [1] },
    { order: 3, action: "identify_paths", description: "Identify possible paths to achieve goals", inputType: "goals", outputType: "paths", dependsOn: [2] },
    { order: 4, action: "evaluate_paths", description: "Evaluate each path for feasibility and risk", inputType: "paths", outputType: "evaluation", dependsOn: [3] },
    { order: 5, action: "select_path", description: "Select optimal path", inputType: "evaluation", outputType: "selected_path", dependsOn: [4] },
    { order: 6, action: "detail_plan", description: "Detail the plan with milestones", inputType: "selected_path", outputType: "plan", dependsOn: [5] },
  ],
  "evaluation": [
    { order: 1, action: "define_criteria", description: "Define evaluation criteria and weights", inputType: "intent", outputType: "criteria", dependsOn: [] },
    { order: 2, action: "collect_evidence", description: "Collect evidence against criteria", inputType: "criteria", outputType: "evidence", dependsOn: [1] },
    { order: 3, action: "score", description: "Score against each criterion", inputType: "evidence", outputType: "scores", dependsOn: [2] },
    { order: 4, action: "weigh", description: "Apply weights to scores", inputType: "scores", outputType: "weighted_scores", dependsOn: [3] },
    { order: 5, action: "conclude", description: "Draw evaluation conclusion", inputType: "weighted_scores", outputType: "conclusion", dependsOn: [4] },
  ],
  "design": [
    { order: 1, action: "requirements", description: "Gather and analyze requirements", inputType: "intent", outputType: "requirements", dependsOn: [] },
    { order: 2, action: "constraints", description: "Identify constraints and boundaries", inputType: "requirements", outputType: "constraints", dependsOn: [1] },
    { order: 3, action: "ideate", description: "Generate design alternatives", inputType: "constraints", outputType: "alternatives", dependsOn: [2] },
    { order: 4, action: "evaluate_design", description: "Evaluate designs against requirements", inputType: "alternatives", outputType: "evaluation", dependsOn: [3] },
    { order: 5, action: "select_design", description: "Select optimal design", inputType: "evaluation", outputType: "design", dependsOn: [4] },
    { order: 6, action: "specify", description: "Detail the design specification", inputType: "design", outputType: "specification", dependsOn: [5] },
  ],
  "optimization": [
    { order: 1, action: "measure", description: "Establish current baseline measurement", inputType: "intent", outputType: "baseline", dependsOn: [] },
    { order: 2, action: "identify_bottlenecks", description: "Identify bottlenecks and inefficiencies", inputType: "baseline", outputType: "bottlenecks", dependsOn: [1] },
    { order: 3, action: "generate_improvements", description: "Generate improvement options", inputType: "bottlenecks", outputType: "improvements", dependsOn: [2] },
    { order: 4, action: "evaluate_improvements", description: "Evaluate improvement impact vs effort", inputType: "improvements", outputType: "evaluation", dependsOn: [3] },
    { order: 5, action: "implement", description: "Select and plan implementation", inputType: "evaluation", outputType: "implementation_plan", dependsOn: [4] },
  ],
  "troubleshooting": [
    { order: 1, action: "identify_symptoms", description: "Identify and document symptoms", inputType: "intent", outputType: "symptoms", dependsOn: [] },
    { order: 2, action: "isolate", description: "Isolate the affected area", inputType: "symptoms", outputType: "scope", dependsOn: [1] },
    { order: 3, action: "diagnose", description: "Diagnose root cause", inputType: "scope", outputType: "root_cause", dependsOn: [2] },
    { order: 4, action: "fix", description: "Propose and apply fix", inputType: "root_cause", outputType: "fix", dependsOn: [3] },
    { order: 5, action: "verify", description: "Verify fix resolves the issue", inputType: "fix", outputType: "verification", dependsOn: [4] },
  ],
  "forecast": [
    { order: 1, action: "historical_analysis", description: "Analyze historical data and trends", inputType: "intent", outputType: "trends", dependsOn: [] },
    { order: 2, action: "identify_drivers", description: "Identify key drivers and variables", inputType: "trends", outputType: "drivers", dependsOn: [1] },
    { order: 3, action: "model", description: "Build forecast model", inputType: "drivers", outputType: "model", dependsOn: [2] },
    { order: 4, action: "scenario", description: "Run multiple scenarios", inputType: "model", outputType: "scenarios", dependsOn: [3] },
    { order: 5, action: "project", description: "Produce forecast projection", inputType: "scenarios", outputType: "forecast", dependsOn: [4] },
  ],
  "strategy": [
    { order: 1, action: "assess_environment", description: "Assess external environment and trends", inputType: "intent", outputType: "environment", dependsOn: [] },
    { order: 2, action: "assess_internal", description: "Assess internal capabilities and resources", inputType: "environment", outputType: "internal_state", dependsOn: [1] },
    { order: 3, action: "define_vision", description: "Define strategic vision and objectives", inputType: "internal_state", outputType: "vision", dependsOn: [2] },
    { order: 4, action: "generate_strategies", description: "Generate strategic options", inputType: "vision", outputType: "strategies", dependsOn: [3] },
    { order: 5, action: "evaluate_strategies", description: "Evaluate and select strategy", inputType: "strategies", outputType: "selected_strategy", dependsOn: [4] },
    { order: 6, action: "roadmap", description: "Create strategic roadmap", inputType: "selected_strategy", outputType: "roadmap", dependsOn: [5] },
  ],
};

export function buildReasoningPlan(
  intent: ExecutiveIntent,
  thinkingMode: ThinkingModeSelection,
  mentalModels: readonly MentalModelRef[],
  frameworks: readonly FrameworkRef[],
): ReasoningPlan {
  const template = STRATEGY_TEMPLATES[intent.problemType] ?? STRATEGY_TEMPLATES["decision"];
  const steps = template.map((step) => ({
    ...step,
    dependsOn: [...step.dependsOn],
  }));

  const estimatedComplexity = Math.round(
    steps.length * 10 +
    mentalModels.length * 5 +
    frameworks.length * 5 +
    intent.constraints.length * 3
  );

  return {
    intent: { ...intent, secondary: [...intent.secondary], constraints: [...intent.constraints] },
    thinkingMode: { ...thinkingMode },
    mentalModels: [...mentalModels],
    frameworks: [...frameworks],
    steps,
    estimatedComplexity,
  };
}
