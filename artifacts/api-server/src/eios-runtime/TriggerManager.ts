import { TriggerEngine } from "./public/TriggerEngine";

export type TriggerHandler = (ctx: any) => Promise<any>;

export function setTriggerHandler(_handler: TriggerHandler): void {}

export async function fire(trigger: string, _branchId?: number, _executiveScope?: string[]): Promise<any> {
  await TriggerEngine.fire(trigger);
  return null;
}

export const TriggerManager = { setTriggerHandler, fire };
