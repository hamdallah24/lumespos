export type PipelineStage = string;

export function registerStage(_name: string, _handler: (ctx: any) => Promise<any>): void {}

export function getStageHandler(_name: string): ((ctx: any) => Promise<any>) | undefined {
  return undefined;
}

export function clearStages(): void {}
