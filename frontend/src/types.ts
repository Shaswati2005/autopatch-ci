export type { StreamStatus } from './components/ConnectionStatus';

export interface TraceStep {
  step_id: string;
  stage: string;
  timestamp: string;
  title: string;
  detail: string;
  payload?: {
    diff?: string;
    target_file?: string;
    explanation?: string;
    test_output?: string;
    passed?: boolean | string;
    duration_s?: number | string;
    pr_url?: string;
    pr_number?: number | string;
    branch?: string;
    repo?: string;
    [key: string]: unknown;
  };
}
