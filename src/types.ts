export type ScopeStatus = "included" | "excluded" | "conditional";

export type RequestStatus = "new" | "approved" | "billable" | "declined" | "absorbed";

export type EvidenceType = "contract" | "email" | "chat" | "call" | "file" | "invoice";

export type ProjectHealth = "strong" | "watch" | "risk";

export type ScopeItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: ScopeStatus;
  hours: number;
  source: string;
};

export type ChangeRequest = {
  id: string;
  date: string;
  requester: string;
  channel: string;
  text: string;
  status: RequestStatus;
  verdict: "in-scope" | "out-of-scope" | "needs-approval";
  confidence: number;
  riskScore: number;
  estimatedHours: number;
  revenueImpact: number;
  matchedScopeIds: string[];
  recommendation: string;
};

export type EvidenceItem = {
  id: string;
  date: string;
  type: EvidenceType;
  title: string;
  source: string;
  excerpt: string;
  hash: string;
};

export type Milestone = {
  id: string;
  title: string;
  dueDate: string;
  status: "not-started" | "active" | "done" | "blocked";
};

export type ClientProject = {
  id: string;
  name: string;
  client: string;
  owner: string;
  summary: string;
  startDate: string;
  dueDate: string;
  rate: number;
  currency: string;
  contractText: string;
  scopeItems: ScopeItem[];
  requests: ChangeRequest[];
  evidence: EvidenceItem[];
  milestones: Milestone[];
};

export type AppData = {
  projects: ClientProject[];
  selectedProjectId: string;
};

export type ScopeExtraction = {
  scopeItems: ScopeItem[];
  signals: string[];
};

export type RequestAnalysis = Omit<ChangeRequest, "id" | "date" | "requester" | "channel" | "status">;
