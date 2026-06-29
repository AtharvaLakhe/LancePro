import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  History,
  Inbox,
  Layers3,
  LibraryBig,
  LockKeyhole,
  MessageSquareText,
  Plus,
  RotateCcw,
  Save,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Split,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { analyzeChangeRequest, analyzeScopeText, getEvidenceCoverage, getProjectHealth } from "./analysis";
import { buildReportHtml } from "./report";
import { loadData, resetData, saveData } from "./storage";
import type {
  AppData,
  ChangeRequest,
  ClientProject,
  EvidenceItem,
  EvidenceType,
  ProjectHealth,
  RequestAnalysis,
  RequestStatus,
  ScopeItem,
  ScopeStatus,
} from "./types";
import { daysUntil, download, formatCurrency, formatDate, sha256, todayIso, uid } from "./utils";

type Pane = "command" | "scope" | "requests" | "evidence" | "reports" | "demo";

const channels = ["Email", "Slack", "WhatsApp", "Call", "Client portal"];
const evidenceTypes: EvidenceType[] = ["contract", "email", "chat", "call", "file", "invoice"];
const requestStatuses: RequestStatus[] = ["new", "approved", "billable", "declined", "absorbed"];

type CommandMetrics = {
  health: ProjectHealth;
  evidenceCoverage: number;
  openRequests: number;
  protectedRevenue: number;
  unapprovedHours: number;
  includedHours: number;
  riskAverage: number;
  exclusions: number;
};

const blankProjectContract = `Project includes:
- 

Excluded:
- 

Approval rule:
- Any new deliverable, integration, revision round, or deadline change requires written approval.`;

function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [activePane, setActivePane] = useState<Pane>("command");
  const [scopeSignals, setScopeSignals] = useState<string[]>([]);
  const [requestText, setRequestText] = useState(
    "Can you also add a client dashboard with login and payment history before launch?",
  );
  const [requester, setRequester] = useState("Client");
  const [channel, setChannel] = useState(channels[0]);
  const [requestAnalysis, setRequestAnalysis] = useState<RequestAnalysis | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState({
    title: "Approval note",
    source: "Email",
    excerpt: "Client confirmed any new integration will be handled as a separate change order.",
    type: "email" as EvidenceType,
  });
  const [manualScope, setManualScope] = useState({
    title: "",
    category: "Delivery",
    status: "included" as ScopeStatus,
    hours: 4,
  });
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClient, setNewProjectClient] = useState("");

  useEffect(() => {
    saveData(data);
  }, [data]);

  const selectedProject = data.projects.find((project) => project.id === data.selectedProjectId) ?? data.projects[0];

  const metrics = useMemo<CommandMetrics | null>(() => {
    if (!selectedProject) {
      return null;
    }
    const health = getProjectHealth(selectedProject);
    const evidenceCoverage = getEvidenceCoverage(selectedProject);
    const openRequests = selectedProject.requests.filter((request) => request.status === "new");
    const protectedRevenue = selectedProject.requests.reduce((total, request) => total + request.revenueImpact, 0);
    const unapprovedHours = openRequests.reduce((total, request) => total + request.estimatedHours, 0);
    const includedHours = selectedProject.scopeItems
      .filter((item) => item.status !== "excluded")
      .reduce((total, item) => total + item.hours, 0);
    const riskAverage = selectedProject.requests.length
      ? Math.round(
          selectedProject.requests.reduce((total, request) => total + request.riskScore, 0) /
            selectedProject.requests.length,
        )
      : 0;
    const exclusions = selectedProject.scopeItems.filter((item) => item.status === "excluded").length;
    return {
      health,
      evidenceCoverage,
      openRequests: openRequests.length,
      protectedRevenue,
      unapprovedHours,
      includedHours,
      riskAverage,
      exclusions,
    };
  }, [selectedProject]);

  function updateProject(projectId: string, updater: (project: ClientProject) => ClientProject) {
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === projectId ? updater(project) : project)),
    }));
  }

  function selectProject(projectId: string) {
    setData((current) => ({ ...current, selectedProjectId: projectId }));
    setRequestAnalysis(null);
    setScopeSignals([]);
  }

  function addProject() {
    const name = newProjectName.trim();
    const client = newProjectClient.trim();
    if (!name || !client) return;

    const project: ClientProject = {
      id: uid("project"),
      name,
      client,
      owner: "You",
      summary: "New fixed-scope engagement with written approval gates.",
      startDate: todayIso(),
      dueDate: todayIso(),
      rate: 75,
      currency: "USD",
      contractText: blankProjectContract,
      scopeItems: [],
      requests: [],
      evidence: [],
      milestones: [],
    };

    setData((current) => ({
      projects: [project, ...current.projects],
      selectedProjectId: project.id,
    }));
    setNewProjectName("");
    setNewProjectClient("");
    setActivePane("scope");
  }

  function runScopeExtraction() {
    if (!selectedProject) return;
    const extraction = analyzeScopeText(selectedProject.contractText);
    const existing = new Set(selectedProject.scopeItems.map((item) => item.description.toLowerCase()));
    const fresh = extraction.scopeItems.filter((item) => !existing.has(item.description.toLowerCase()));
    updateProject(selectedProject.id, (project) => ({
      ...project,
      scopeItems: [...project.scopeItems, ...fresh],
    }));
    setScopeSignals(extraction.signals.length ? extraction.signals : ["Scope text scanned"]);
  }

  function addManualScope() {
    if (!selectedProject || !manualScope.title.trim()) return;
    const item: ScopeItem = {
      id: uid("scope"),
      title: manualScope.title.trim(),
      description: manualScope.title.trim(),
      category: manualScope.category.trim() || "Delivery",
      status: manualScope.status,
      hours: Number(manualScope.hours) || 0,
      source: "Manual entry",
    };
    updateProject(selectedProject.id, (project) => ({
      ...project,
      scopeItems: [item, ...project.scopeItems],
    }));
    setManualScope({ title: "", category: "Delivery", status: "included", hours: 4 });
  }

  function removeScopeItem(scopeId: string) {
    if (!selectedProject) return;
    updateProject(selectedProject.id, (project) => ({
      ...project,
      scopeItems: project.scopeItems.filter((item) => item.id !== scopeId),
    }));
  }

  function runRequestAnalysis() {
    if (!selectedProject || !requestText.trim()) return;
    setRequestAnalysis(analyzeChangeRequest(selectedProject, requestText.trim()));
  }

  function saveRequest() {
    if (!selectedProject || !requestAnalysis) return;
    const request: ChangeRequest = {
      id: uid("request"),
      date: todayIso(),
      requester: requester.trim() || "Client",
      channel,
      status: "new",
      ...requestAnalysis,
    };
    updateProject(selectedProject.id, (project) => ({
      ...project,
      requests: [request, ...project.requests],
    }));
    setRequestAnalysis(null);
    setRequestText("");
    setActivePane("requests");
  }

  function updateRequestStatus(requestId: string, status: RequestStatus) {
    if (!selectedProject) return;
    updateProject(selectedProject.id, (project) => ({
      ...project,
      requests: project.requests.map((request) => (request.id === requestId ? { ...request, status } : request)),
    }));
  }

  async function addEvidence() {
    if (!selectedProject || !evidenceDraft.title.trim()) return;
    const excerpt = evidenceDraft.excerpt.trim();
    const evidence: EvidenceItem = {
      id: uid("evidence"),
      date: todayIso(),
      type: evidenceDraft.type,
      title: evidenceDraft.title.trim(),
      source: evidenceDraft.source.trim() || evidenceDraft.type,
      excerpt,
      hash: await sha256(`${evidenceDraft.title}|${evidenceDraft.source}|${excerpt}|${todayIso()}`),
    };
    updateProject(selectedProject.id, (project) => ({
      ...project,
      evidence: [evidence, ...project.evidence],
    }));
    setEvidenceDraft({ title: "", source: "", excerpt: "", type: "email" });
  }

  async function addFileEvidence(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedProject) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const hash = await sha256(await file.arrayBuffer());
    const evidence: EvidenceItem = {
      id: uid("evidence"),
      date: todayIso(),
      type: "file",
      title: file.name,
      source: file.type || "Local file",
      excerpt: `${file.name} | ${(file.size / 1024).toFixed(1)} KB`,
      hash,
    };
    updateProject(selectedProject.id, (project) => ({
      ...project,
      evidence: [evidence, ...project.evidence],
    }));
    event.currentTarget.value = "";
  }

  function exportReport() {
    if (!selectedProject) return;
    download(
      `${selectedProject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-scope-report.html`,
      buildReportHtml(selectedProject),
      "text/html",
    );
  }

  function exportJson() {
    if (!selectedProject) return;
    download(
      `${selectedProject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-scope-data.json`,
      JSON.stringify(selectedProject, null, 2),
      "application/json",
    );
  }

  function restoreDemo(nextPane: Pane = "command") {
    resetData();
    const restored = loadData();
    setData(restored);
    setActivePane(nextPane);
    setRequestAnalysis(null);
    setScopeSignals([]);
  }

  if (!selectedProject || !metrics) {
    return <div className="boot">LancePro</div>;
  }

  const healthCopy: Record<ProjectHealth, string> = {
    strong: "Protected",
    watch: "Needs review",
    risk: "At risk",
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span>Lance</span>
            <strong>Pro</strong>
          </div>
        </div>

        <div className="project-create">
          <input
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder="Project name"
          />
          <input
            value={newProjectClient}
            onChange={(event) => setNewProjectClient(event.target.value)}
            placeholder="Client"
          />
          <button className="icon-button primary" type="button" onClick={addProject} title="Create project">
            <Plus size={18} />
          </button>
        </div>

        <div className="project-list">
          {data.projects.map((project) => {
            const health = getProjectHealth(project);
            return (
              <button
                key={project.id}
                className={`project-tab ${project.id === selectedProject.id ? "active" : ""}`}
                type="button"
                onClick={() => selectProject(project.id)}
              >
                <span className={`health-dot ${health}`} />
                <span>
                  <strong>{project.name}</strong>
                  <small>{project.client}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </div>

        <nav className="pane-nav">
          <PaneButton icon={<Gauge size={18} />} label="Command" pane="command" activePane={activePane} setActivePane={setActivePane} />
          <PaneButton icon={<Layers3 size={18} />} label="Scope" pane="scope" activePane={activePane} setActivePane={setActivePane} />
          <PaneButton icon={<Inbox size={18} />} label="Requests" pane="requests" activePane={activePane} setActivePane={setActivePane} />
          <PaneButton icon={<Fingerprint size={18} />} label="Evidence" pane="evidence" activePane={activePane} setActivePane={setActivePane} />
          <PaneButton icon={<FileCheck2 size={18} />} label="Reports" pane="reports" activePane={activePane} setActivePane={setActivePane} />
          <PaneButton icon={<LibraryBig size={18} />} label="Demo" pane="demo" activePane={activePane} setActivePane={setActivePane} />
        </nav>

        <button className="sidebar-action" type="button" onClick={() => restoreDemo()}>
          <RotateCcw size={16} />
          Reset demo
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{selectedProject.client}</p>
            <h1>{selectedProject.name}</h1>
            <p>{selectedProject.summary}</p>
          </div>
          <div className={`health-pill ${metrics.health}`}>
            <ShieldCheck size={18} />
            {healthCopy[metrics.health]}
          </div>
        </header>

        {activePane === "command" && (
          <CommandCenter
            project={selectedProject}
            metrics={metrics}
            setActivePane={setActivePane}
            exportReport={exportReport}
          />
        )}

        {activePane === "scope" && (
          <ScopeRoom
            project={selectedProject}
            updateProject={updateProject}
            runScopeExtraction={runScopeExtraction}
            scopeSignals={scopeSignals}
            manualScope={manualScope}
            setManualScope={setManualScope}
            addManualScope={addManualScope}
            removeScopeItem={removeScopeItem}
          />
        )}

        {activePane === "requests" && (
          <RequestDesk
            project={selectedProject}
            requestText={requestText}
            setRequestText={setRequestText}
            requester={requester}
            setRequester={setRequester}
            channel={channel}
            setChannel={setChannel}
            analysis={requestAnalysis}
            runRequestAnalysis={runRequestAnalysis}
            saveRequest={saveRequest}
            updateRequestStatus={updateRequestStatus}
          />
        )}

        {activePane === "evidence" && (
          <EvidenceVault
            project={selectedProject}
            evidenceDraft={evidenceDraft}
            setEvidenceDraft={setEvidenceDraft}
            addEvidence={addEvidence}
            addFileEvidence={addFileEvidence}
          />
        )}

        {activePane === "reports" && (
          <ReportRoom project={selectedProject} exportReport={exportReport} exportJson={exportJson} />
        )}

        {activePane === "demo" && (
          <DemoRoom project={selectedProject} setActivePane={setActivePane} restoreDemo={() => restoreDemo("demo")} />
        )}
      </section>
    </main>
  );
}

function PaneButton({
  icon,
  label,
  pane,
  activePane,
  setActivePane,
}: {
  icon: React.ReactNode;
  label: string;
  pane: Pane;
  activePane: Pane;
  setActivePane: (pane: Pane) => void;
}) {
  return (
    <button className={activePane === pane ? "active" : ""} type="button" onClick={() => setActivePane(pane)}>
      {icon}
      {label}
    </button>
  );
}

function CommandCenter({
  project,
  metrics,
  setActivePane,
  exportReport,
}: {
  project: ClientProject;
  metrics: CommandMetrics;
  setActivePane: (pane: Pane) => void;
  exportReport: () => void;
}) {
  const dueDays = daysUntil(project.dueDate);
  const riskyRequests = project.requests.filter((request) => request.riskScore > 60);

  return (
    <div className="pane-grid command-grid">
      <section className="metric-strip">
        <MetricCard icon={<Inbox size={20} />} label="Open Requests" value={String(metrics.openRequests)} tone="amber" />
        <MetricCard
          icon={<BadgeDollarSign size={20} />}
          label="Protected Value"
          value={formatCurrency(metrics.protectedRevenue, project.currency)}
          tone="green"
        />
        <MetricCard icon={<Split size={20} />} label="Unapproved Hours" value={`${metrics.unapprovedHours}h`} tone="red" />
        <MetricCard icon={<Fingerprint size={20} />} label="Evidence Coverage" value={`${metrics.evidenceCoverage}%`} tone="ink" />
      </section>

      <section className="radar-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Scope Radar</p>
            <h2>Contract pressure</h2>
          </div>
          <button className="icon-button" type="button" onClick={exportReport} title="Export report">
            <Download size={18} />
          </button>
        </div>
        <div className="radar-body">
          <div className="radar-orbit">
            <div className="radar-ring one" />
            <div className="radar-ring two" />
            <div className="radar-score">{metrics.riskAverage}</div>
            <span className="radar-point point-a" />
            <span className="radar-point point-b" />
            <span className="radar-point point-c" />
          </div>
          <div className="radar-copy">
            <strong>{riskyRequests.length ? `${riskyRequests.length} request risk signals` : "No major request risk"}</strong>
            <p>
              {metrics.exclusions} exclusions, {metrics.includedHours} planned hours, and {project.evidence.length} evidence records are linked to this engagement.
            </p>
            <div className="mini-progress">
              <span style={{ width: `${metrics.evidenceCoverage}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="timeline-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Delivery</p>
            <h2>Milestone lane</h2>
          </div>
          <span className={dueDays < 5 ? "deadline hot" : "deadline"}>{dueDays >= 0 ? `${dueDays} days` : `${Math.abs(dueDays)} days late`}</span>
        </div>
        <div className="milestone-list">
          {project.milestones.map((milestone) => (
            <article className={`milestone ${milestone.status}`} key={milestone.id}>
              <span />
              <div>
                <strong>{milestone.title}</strong>
                <small>{formatDate(milestone.dueDate)}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="queue-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Action queue</h2>
          </div>
        </div>
        <div className="action-list">
          <ActionRow
            icon={<SearchCheck size={18} />}
            title="Triage new client message"
            detail={`${project.requests.filter((request) => request.status === "new").length} request waiting`}
            onClick={() => setActivePane("requests")}
          />
          <ActionRow
            icon={<Archive size={18} />}
            title="Attach latest approval proof"
            detail={`${project.evidence.length} evidence records`}
            onClick={() => setActivePane("evidence")}
          />
          <ActionRow
            icon={<ClipboardCheck size={18} />}
            title="Review scope register"
            detail={`${project.scopeItems.length} deliverables and exclusions`}
            onClick={() => setActivePane("scope")}
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "green" | "amber" | "red" | "ink";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ActionRow({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className="action-row" type="button" onClick={onClick}>
      <span>{icon}</span>
      <strong>{title}</strong>
      <small>{detail}</small>
      <ChevronRight size={16} />
    </button>
  );
}

function ScopeRoom({
  project,
  updateProject,
  runScopeExtraction,
  scopeSignals,
  manualScope,
  setManualScope,
  addManualScope,
  removeScopeItem,
}: {
  project: ClientProject;
  updateProject: (projectId: string, updater: (project: ClientProject) => ClientProject) => void;
  runScopeExtraction: () => void;
  scopeSignals: string[];
  manualScope: { title: string; category: string; status: ScopeStatus; hours: number };
  setManualScope: React.Dispatch<React.SetStateAction<{ title: string; category: string; status: ScopeStatus; hours: number }>>;
  addManualScope: () => void;
  removeScopeItem: (scopeId: string) => void;
}) {
  return (
    <div className="pane-grid scope-grid">
      <section className="document-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Source Brief</p>
            <h2>Contract language</h2>
          </div>
          <button className="icon-button primary" type="button" onClick={runScopeExtraction} title="Extract scope">
            <Sparkles size={18} />
          </button>
        </div>
        <textarea
          className="contract-area"
          value={project.contractText}
          onChange={(event) =>
            updateProject(project.id, (current) => ({
              ...current,
              contractText: event.target.value,
            }))
          }
        />
        {!!scopeSignals.length && (
          <div className="signal-strip">
            {scopeSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
        )}
      </section>

      <section className="scope-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Register</p>
            <h2>Scope ledger</h2>
          </div>
        </div>

        <div className="manual-scope">
          <input
            value={manualScope.title}
            onChange={(event) => setManualScope((current) => ({ ...current, title: event.target.value }))}
            placeholder="Add deliverable or exclusion"
          />
          <input
            value={manualScope.category}
            onChange={(event) => setManualScope((current) => ({ ...current, category: event.target.value }))}
            placeholder="Category"
          />
          <select
            value={manualScope.status}
            onChange={(event) => setManualScope((current) => ({ ...current, status: event.target.value as ScopeStatus }))}
          >
            <option value="included">Included</option>
            <option value="conditional">Conditional</option>
            <option value="excluded">Excluded</option>
          </select>
          <input
            type="number"
            min="0"
            value={manualScope.hours}
            onChange={(event) => setManualScope((current) => ({ ...current, hours: Number(event.target.value) }))}
            aria-label="Hours"
          />
          <button className="icon-button primary" type="button" onClick={addManualScope} title="Add scope item">
            <Plus size={18} />
          </button>
        </div>

        <div className="scope-table">
          {project.scopeItems.map((item) => (
            <article className={`scope-row ${item.status}`} key={item.id}>
              <span className="status-rail" />
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <small>
                  {item.category} | {item.source}
                </small>
              </div>
              <div className="scope-hours">{item.hours}h</div>
              <button className="ghost-icon" type="button" onClick={() => removeScopeItem(item.id)} title="Remove item">
                <X size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RequestDesk({
  project,
  requestText,
  setRequestText,
  requester,
  setRequester,
  channel,
  setChannel,
  analysis,
  runRequestAnalysis,
  saveRequest,
  updateRequestStatus,
}: {
  project: ClientProject;
  requestText: string;
  setRequestText: (value: string) => void;
  requester: string;
  setRequester: (value: string) => void;
  channel: string;
  setChannel: (value: string) => void;
  analysis: RequestAnalysis | null;
  runRequestAnalysis: () => void;
  saveRequest: () => void;
  updateRequestStatus: (requestId: string, status: RequestStatus) => void;
}) {
  return (
    <div className="pane-grid request-grid">
      <section className="triage-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Triage</p>
            <h2>Client message</h2>
          </div>
          <button className="icon-button primary" type="button" onClick={runRequestAnalysis} title="Analyze request">
            <SearchCheck size={18} />
          </button>
        </div>
        <div className="triage-meta">
          <input value={requester} onChange={(event) => setRequester(event.target.value)} placeholder="Requester" />
          <select value={channel} onChange={(event) => setChannel(event.target.value)}>
            {channels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="request-area"
          value={requestText}
          onChange={(event) => setRequestText(event.target.value)}
          placeholder="Paste a client request"
        />

        {analysis && (
          <article className={`analysis-card ${analysis.verdict}`}>
            <div className="analysis-top">
              <span>{analysis.verdict.replaceAll("-", " ")}</span>
              <strong>{analysis.confidence}%</strong>
            </div>
            <div className="analysis-stats">
              <span>
                <AlertTriangle size={15} /> {analysis.riskScore} risk
              </span>
              <span>
                <History size={15} /> {analysis.estimatedHours}h
              </span>
              <span>
                <WalletCards size={15} /> {formatCurrency(analysis.revenueImpact, project.currency)}
              </span>
            </div>
            <p>{analysis.recommendation}</p>
            <button className="solid-button" type="button" onClick={saveRequest}>
              <Save size={17} />
              Save to queue
            </button>
          </article>
        )}
      </section>

      <section className="request-ledger">
        <div className="section-head">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>Change requests</h2>
          </div>
        </div>
        <div className="request-list">
          {project.requests.map((request) => (
            <article className={`request-card ${request.verdict}`} key={request.id}>
              <div className="request-card-head">
                <div>
                  <strong>{request.requester}</strong>
                  <small>
                    {formatDate(request.date)} | {request.channel}
                  </small>
                </div>
                <span>{request.verdict.replaceAll("-", " ")}</span>
              </div>
              <p>{request.text}</p>
              <div className="request-card-stats">
                <span>{request.estimatedHours}h</span>
                <span>{request.riskScore} risk</span>
                <span>{formatCurrency(request.revenueImpact, project.currency)}</span>
              </div>
              <div className="status-pills">
                {requestStatuses.map((status) => (
                  <button
                    key={status}
                    className={request.status === status ? "active" : ""}
                    type="button"
                    onClick={() => updateRequestStatus(request.id, status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function EvidenceVault({
  project,
  evidenceDraft,
  setEvidenceDraft,
  addEvidence,
  addFileEvidence,
}: {
  project: ClientProject;
  evidenceDraft: { title: string; source: string; excerpt: string; type: EvidenceType };
  setEvidenceDraft: React.Dispatch<React.SetStateAction<{ title: string; source: string; excerpt: string; type: EvidenceType }>>;
  addEvidence: () => void;
  addFileEvidence: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="pane-grid evidence-grid">
      <section className="evidence-entry">
        <div className="section-head">
          <div>
            <p className="eyebrow">Ledger</p>
            <h2>Evidence capture</h2>
          </div>
          <button className="icon-button primary" type="button" onClick={addEvidence} title="Add evidence">
            <Plus size={18} />
          </button>
        </div>

        <div className="evidence-form">
          <input
            value={evidenceDraft.title}
            onChange={(event) => setEvidenceDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Title"
          />
          <div className="inline-fields">
            <select
              value={evidenceDraft.type}
              onChange={(event) => setEvidenceDraft((current) => ({ ...current, type: event.target.value as EvidenceType }))}
            >
              {evidenceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              value={evidenceDraft.source}
              onChange={(event) => setEvidenceDraft((current) => ({ ...current, source: event.target.value }))}
              placeholder="Source"
            />
          </div>
          <textarea
            value={evidenceDraft.excerpt}
            onChange={(event) => setEvidenceDraft((current) => ({ ...current, excerpt: event.target.value }))}
            placeholder="Excerpt"
          />
          <label className="file-drop">
            <Upload size={19} />
            <span>Hash file</span>
            <input type="file" onChange={addFileEvidence} />
          </label>
        </div>
      </section>

      <section className="evidence-timeline">
        <div className="section-head">
          <div>
            <p className="eyebrow">Proof</p>
            <h2>Timeline</h2>
          </div>
        </div>
        <div className="evidence-list">
          {project.evidence.map((evidence) => (
            <article className="evidence-card" key={evidence.id}>
              <div className="evidence-icon">
                <LockKeyhole size={18} />
              </div>
              <div>
                <div className="evidence-card-head">
                  <strong>{evidence.title}</strong>
                  <span>{formatDate(evidence.date)}</span>
                </div>
                <p>{evidence.excerpt}</p>
                <code>{evidence.hash}</code>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportRoom({
  project,
  exportReport,
  exportJson,
}: {
  project: ClientProject;
  exportReport: () => void;
  exportJson: () => void;
}) {
  const openRequests = project.requests.filter((request) => request.status === "new");
  const billable = project.requests.filter((request) => request.verdict !== "in-scope");
  const totalValue = billable.reduce((total, request) => total + request.revenueImpact, 0);

  return (
    <div className="pane-grid report-grid">
      <section className="report-preview">
        <div className="section-head">
          <div>
            <p className="eyebrow">Client Pack</p>
            <h2>Scope report</h2>
          </div>
          <div className="report-actions">
            <button className="icon-button" type="button" onClick={exportJson} title="Export JSON">
              <FileText size={18} />
            </button>
            <button className="icon-button primary" type="button" onClick={exportReport} title="Export HTML">
              <Download size={18} />
            </button>
          </div>
        </div>
        <div className="report-sheet">
          <div className="sheet-head">
            <ShieldCheck size={28} />
            <div>
              <h2>{project.name}</h2>
              <p>{project.client}</p>
            </div>
          </div>
          <div className="sheet-stats">
            <span>{project.scopeItems.length} scope entries</span>
            <span>{openRequests.length} open requests</span>
            <span>{formatCurrency(totalValue, project.currency)} billable exposure</span>
          </div>
          <p>{project.summary}</p>
          <div className="report-table">
            {project.requests.slice(0, 5).map((request) => (
              <div key={request.id}>
                <strong>{request.verdict.replaceAll("-", " ")}</strong>
                <span>{request.text}</span>
                <small>{request.recommendation}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="reply-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Client Reply</p>
            <h2>Message draft</h2>
          </div>
        </div>
        <div className="reply-box">
          <MessageSquareText size={22} />
          <p>
            Thanks for sending this over. I checked it against the approved scope for {project.name}. The requested work appears to require written approval before I start. I can add it as a change order and reserve time once you confirm the added estimate.
          </p>
          <p>
            Current open exposure: {formatCurrency(totalValue, project.currency)} across {openRequests.length} open request{openRequests.length === 1 ? "" : "s"}.
          </p>
        </div>
      </section>
    </div>
  );
}

function DemoRoom({
  project,
  setActivePane,
  restoreDemo,
}: {
  project: ClientProject;
  setActivePane: (pane: Pane) => void;
  restoreDemo: () => void;
}) {
  const demoSteps = [
    {
      icon: <Layers3 size={19} />,
      title: "Extract the signed scope",
      detail: "Open Scope, review the contract text, then run extraction to turn vague terms into included, conditional, and excluded items.",
      pane: "scope" as Pane,
    },
    {
      icon: <SearchCheck size={19} />,
      title: "Triage a client request",
      detail: "Open Requests, paste a new client message, and let the scoring model estimate risk, hours, and change-order value.",
      pane: "requests" as Pane,
    },
    {
      icon: <Fingerprint size={19} />,
      title: "Attach proof",
      detail: "Open Evidence, add a chat/email excerpt or hash a file so approvals and client messages become tamper-evident records.",
      pane: "evidence" as Pane,
    },
    {
      icon: <FileCheck2 size={19} />,
      title: "Export the client pack",
      detail: "Open Reports and export the HTML scope report for a client-ready summary of open requests, risk, and evidence.",
      pane: "reports" as Pane,
    },
  ];

  const pitchPoints = [
    "Problem: freelancers lose money when casual client messages quietly expand fixed-price scope.",
    "Solution: Scope Guard converts contract text, change requests, and proof into a controlled approval workflow.",
    "Demo data: Northstar Fitness asks for a booking/e-commerce flow that was explicitly excluded from the original website rebuild.",
    "Resume angle: local-first product, scope analysis, risk scoring, SHA-256 proof ledger, report export, responsive UI, and Playwright-tested flows.",
  ];

  return (
    <div className="pane-grid demo-grid">
      <section className="demo-hero-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Demo Mode</p>
            <h2>Walkthrough for {project.name}</h2>
          </div>
          <button className="solid-button" type="button" onClick={restoreDemo}>
            <RotateCcw size={17} />
            Reload sample
          </button>
        </div>
        <div className="demo-story">
          <div className="demo-badge">
            <BriefcaseBusiness size={22} />
            Freelancer protection workflow
          </div>
          <h3>Show how a small client message becomes a controlled change order instead of unpaid extra work.</h3>
          <p>
            Use the sample website rebuild to demonstrate the full product loop: signed scope, client request,
            automated verdict, evidence capture, and a client-ready report.
          </p>
          <div className="demo-facts">
            <span>
              <CalendarDays size={16} />
              {formatDate(project.startDate)} - {formatDate(project.dueDate)}
            </span>
            <span>
              <WalletCards size={16} />
              {formatCurrency(project.rate, project.currency)}/hr
            </span>
            <span>
              <FileText size={16} />
              {project.scopeItems.length} scope entries
            </span>
          </div>
        </div>
      </section>

      <section className="demo-script-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">What To Do</p>
            <h2>Live demo script</h2>
          </div>
        </div>
        <div className="demo-step-list">
          {demoSteps.map((step, index) => (
            <button className="demo-step" key={step.title} type="button" onClick={() => setActivePane(step.pane)}>
              <span className="demo-step-number">{index + 1}</span>
              <span className="demo-step-icon">{step.icon}</span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      </section>

      <section className="demo-notes-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Talk Track</p>
            <h2>Interview explanation</h2>
          </div>
        </div>
        <div className="talk-track">
          {pitchPoints.map((point) => (
            <div key={point}>
              <Check size={18} />
              <p>{point}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
