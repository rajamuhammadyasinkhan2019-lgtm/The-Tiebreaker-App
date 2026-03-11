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

export interface ProsConsResult {
  pros: string[];
  cons: string[];
  verdict: string;
}

export interface ComparisonResult {
  headers: string[];
  rows: { [key: string]: string }[];
  verdict: string;
}

export interface SWOTResult {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  verdict: string;
}

export type AnalysisResult = ProsConsResult | ComparisonResult | SWOTResult;
