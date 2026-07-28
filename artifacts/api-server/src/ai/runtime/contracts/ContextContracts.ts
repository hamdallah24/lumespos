export interface FieldRequirement {
  name: string;
  module: string;
  required: boolean;
}

export interface ContextContract {
  executive: string;
  fields: FieldRequirement[];
}

const contracts: ContextContract[] = [
  {
    executive: "COO",
    fields: [
      { name: "branches", module: "grounding", required: true },
      { name: "inventory", module: "erp", required: true },
      { name: "sales", module: "erp", required: true },
      { name: "production", module: "erp", required: false },
      { name: "suppliers", module: "erp", required: false },
    ],
  },
  {
    executive: "CFO",
    fields: [
      { name: "finance", module: "erp", required: true },
      { name: "sales", module: "erp", required: false },
      { name: "branches", module: "grounding", required: false },
    ],
  },
  {
    executive: "CMO",
    fields: [
      { name: "sales", module: "erp", required: false },
      { name: "branches", module: "grounding", required: false },
    ],
  },
  {
    executive: "CHRO",
    fields: [
      { name: "people", module: "erp", required: true },
      { name: "branches", module: "grounding", required: false },
    ],
  },
  {
    executive: "CAIO",
    fields: [
      { name: "knowledgeStats", module: "erp", required: false },
      { name: "confidence", module: "verification", required: false },
    ],
  },
  {
    executive: "CEO",
    fields: [
      { name: "finance", module: "erp", required: true },
      { name: "inventory", module: "erp", required: false },
      { name: "branches", module: "grounding", required: false },
    ],
  },
  {
    executive: "CKO",
    fields: [
      { name: "memory", module: "grounding", required: true },
    ],
  },
  {
    executive: "CTO",
    fields: [
      { name: "repository", module: "grounding", required: true },
      { name: "confidence", module: "verification", required: false },
      { name: "tools", module: "planning", required: false },
    ],
  },
];

export function getContract(executive: string): ContextContract | undefined {
  return contracts.find(c => c.executive === executive);
}

export function getRequiredFields(executive: string): string[] {
  const contract = getContract(executive);
  if (!contract) return [];
  return contract.fields.filter(f => f.required).map(f => f.name);
}

export function getOptionalFields(executive: string): string[] {
  const contract = getContract(executive);
  if (!contract) return [];
  return contract.fields.filter(f => !f.required).map(f => f.name);
}
