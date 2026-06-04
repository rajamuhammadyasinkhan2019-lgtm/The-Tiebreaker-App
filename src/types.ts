export enum AnalysisType {
  PROS_CONS = 'PROS_CONS',
  COMPARISON = 'COMPARISON',
  SWOT = 'SWOT'
}

export interface DecisionInput {
  topic: string;
  context?: string;
  options?: string[];
  type: AnalysisType;
}

export interface SuccessProbability {
  option: string;
  probability: number; // 0 - 100
  rationale: string;
}

export interface BaseResult {
  verdict: string;
  confidenceScore: number; // 0 - 100
  successProbabilities?: SuccessProbability[];
}

export interface ProsConsResult extends BaseResult {
  pros: string[];
  cons: string[];
}

export interface ComparisonResult extends BaseResult {
  headers: string[];
  rows: { [key: string]: string }[];
}

export interface SWOTResult extends BaseResult {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export type AnalysisResult = ProsConsResult | ComparisonResult | SWOTResult;

