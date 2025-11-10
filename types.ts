export interface UserInput {
  nationalObjective: string;
  strategicInitiative: string;
  nationalTask: string;
  evaluationCategory: string;
  evaluationIndicator: string;
  evaluationDetailIndicator: string;
  coreActivity: string;
  innovativeMeans: string;
  existingProblems: string; 
  goals: string; 
  processCharacteristics: string; 
  
  internalCustomer: string;
  externalCustomer: string;
  
  organizationalPerformance: string;
  customerPerformance: string;

  sampleReportText?: string;
  sampleFile?: {
    name: string;
    mimeType: string;
    data: string; // base64 encoded data
  };
}

export interface Headline {
  title: string;
  strategy: string;
}

export interface HeadlineResult {
  type: string;
  headlines: Headline[];
}

export type AppView = 'intro' | 'loading' | 'results' | 'error' | 'drafting' | 'draft';