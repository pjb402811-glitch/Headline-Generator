export interface UserInput {
  nationalObjective: string;
  strategicInitiative: string;
  nationalTask: string;
  evaluationCategory: string;
  evaluationIndicator: string;
  evaluationDetailIndicator: string;
  coreActivity: string;
  innovativeMeans: string;
  organizationalPerformance: string;
  beneficiaryPerformance: string;
}

export interface Headline {
  title: string;
  strategy: string;
}

export interface HeadlineResult {
  type: string;
  headlines: Headline[];
}

export type AppView = 'intro' | 'loading' | 'results' | 'error';