import type { ClientProject, ProjectHealth, RequestAnalysis, ScopeExtraction, ScopeItem, ScopeStatus } from "./types";
import { clamp, uid } from "./utils";

const categoryRules: Array<[string, RegExp]> = [
  ["Design", /\b(design|figma|wireframe|prototype|brand|visual|ui|ux)\b/i],
  ["Development", /\b(develop|build|implement|api|frontend|backend|integration|database|dashboard)\b/i],
  ["Content", /\b(copy|content|article|email|landing page|seo|text)\b/i],
  ["Support", /\b(support|maintenance|bug|training|handover|documentation)\b/i],
  ["Revision", /\b(revision|round|iteration|feedback|change)\b/i],
  ["Commercial", /\b(payment|invoice|rate|budget|deposit|approval|sign-off|scope)\b/i],
];

const excludedSignals = /\b(excluded|not included|out of scope|client provides|future phase|separate quote)\b/i;
const conditionalSignals = /\b(up to|maximum|limit|requires approval|after approval|subject to|only if)\b/i;
const includedSignals = /\b(include|deliver|build|create|provide|design|develop|setup|integrate|migrate|write)\b/i;
const requestExpansionSignals = /\b(also|just add|extra|new|instead|can you add|while you're|quick|urgent|asap|free|small change|unlimited)\b/i;

export function analyzeScopeText(text: string): ScopeExtraction {
  const lines = text
    .split(/\r?\n|(?<=\.)\s+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 12);

  const candidates = lines.filter((line) => {
    return includedSignals.test(line) || excludedSignals.test(line) || conditionalSignals.test(line);
  });

  const scopeItems = candidates.slice(0, 18).map((line, index) => {
    const status: ScopeStatus = excludedSignals.test(line)
      ? "excluded"
      : conditionalSignals.test(line)
        ? "conditional"
        : "included";
    const category = inferCategory(line);
    const hours = estimateHours(line, category, status);
    return {
      id: uid("scope"),
      title: titleFromLine(line, index),
      description: line,
      category,
      status,
      hours,
      source: "Brief analysis",
    };
  });

  return {
    scopeItems,
    signals: buildScopeSignals(text, scopeItems),
  };
}

export function analyzeChangeRequest(project: ClientProject, requestText: string): RequestAnalysis {
  const requestTokens = tokenize(requestText);
  const scoredMatches = project.scopeItems
    .filter((item) => item.status !== "excluded")
    .map((item) => ({
      item,
      score: overlapScore(requestTokens, tokenize(`${item.title} ${item.description} ${item.category}`)),
    }))
    .sort((a, b) => b.score - a.score);

  const topMatches = scoredMatches.filter((match) => match.score > 0.1).slice(0, 3);
  const topScore = topMatches[0]?.score ?? 0;
  const hasExpansionLanguage = requestExpansionSignals.test(requestText);
  const excludedHit = project.scopeItems.some((item) => {
    return item.status === "excluded" && overlapScore(requestTokens, tokenize(item.description)) > 0.16;
  });

  let verdict: RequestAnalysis["verdict"] = "needs-approval";
  if (excludedHit || (hasExpansionLanguage && topScore < 0.34)) {
    verdict = "out-of-scope";
  } else if (topScore > 0.42 && !hasExpansionLanguage) {
    verdict = "in-scope";
  }

  const estimatedHours = estimateRequestHours(requestText, topMatches.map((match) => match.item));
  const riskScore = clamp(
    Math.round((hasExpansionLanguage ? 25 : 0) + (excludedHit ? 30 : 0) + (1 - topScore) * 42 + estimatedHours * 2.6),
    8,
    96,
  );
  const confidence = clamp(Math.round((topScore * 88 + (excludedHit ? 18 : 0)) * 1.04), 35, 94);
  const revenueImpact = verdict === "in-scope" ? 0 : Math.round(estimatedHours * project.rate);

  return {
    text: requestText,
    verdict,
    confidence,
    riskScore,
    estimatedHours,
    revenueImpact,
    matchedScopeIds: topMatches.map((match) => match.item.id),
    recommendation: buildRecommendation(verdict, estimatedHours, revenueImpact, topMatches.map((match) => match.item)),
  };
}

export function getProjectHealth(project: ClientProject): ProjectHealth {
  const openRisk = project.requests.filter((request) => request.status === "new" && request.riskScore > 62).length;
  const unapprovedHours = project.requests
    .filter((request) => request.status === "new" || request.status === "billable")
    .reduce((total, request) => total + request.estimatedHours, 0);
  const evidenceCoverage = getEvidenceCoverage(project);

  if (openRisk >= 3 || unapprovedHours >= 24 || evidenceCoverage < 45) {
    return "risk";
  }
  if (openRisk > 0 || unapprovedHours >= 10 || evidenceCoverage < 72) {
    return "watch";
  }
  return "strong";
}

export function getEvidenceCoverage(project: ClientProject) {
  const total = project.scopeItems.length + project.requests.length;
  if (!total) {
    return 0;
  }
  const evidenceWeight = project.evidence.length * 2 + project.requests.filter((request) => request.matchedScopeIds.length).length;
  return clamp(Math.round((evidenceWeight / (total * 1.6)) * 100), 0, 100);
}

function inferCategory(line: string) {
  return categoryRules.find(([, rule]) => rule.test(line))?.[0] ?? "Delivery";
}

function estimateHours(line: string, category: string, status: ScopeStatus) {
  const baseByCategory: Record<string, number> = {
    Design: 8,
    Development: 14,
    Content: 5,
    Support: 4,
    Revision: 3,
    Commercial: 2,
    Delivery: 7,
  };
  const explicit = line.match(/(\d+)\s*(hours|hrs|h|days|weeks)/i);
  if (explicit) {
    const amount = Number(explicit[1]);
    const unit = explicit[2].toLowerCase();
    if (unit.startsWith("day")) return amount * 8;
    if (unit.startsWith("week")) return amount * 40;
    return amount;
  }
  return Math.round((baseByCategory[category] ?? 7) * (status === "excluded" ? 0 : status === "conditional" ? 0.65 : 1));
}

function titleFromLine(line: string, index: number) {
  const clean = line
    .replace(/\b(include|includes|deliver|delivers|build|create|provide|design|develop|setup|integrate)\b/i, "")
    .trim();
  const sentence = clean.split(/[.;:]/)[0].trim();
  const words = sentence.split(/\s+/).slice(0, 8).join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : `Scope item ${index + 1}`;
}

function buildScopeSignals(text: string, scopeItems: ScopeItem[]) {
  const signals = [];
  if (/revision|round|feedback/i.test(text)) signals.push("Revision language detected");
  if (/approval|sign-off|signed/i.test(text)) signals.push("Approval dependency detected");
  if (/not included|excluded|out of scope/i.test(text)) signals.push("Exclusions captured");
  if (/maintenance|support/i.test(text)) signals.push("Support window mentioned");
  if (scopeItems.some((item) => item.status === "conditional")) signals.push("Conditional deliverables need explicit acceptance");
  return signals.slice(0, 5);
}

function tokenize(text: string) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "you",
    "can",
    "just",
    "our",
    "are",
    "from",
    "into",
    "have",
    "will",
    "need",
    "make",
    "please",
  ]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  );
}

function overlapScore(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  a.forEach((token) => {
    if (b.has(token)) overlap += 1;
  });
  return overlap / Math.sqrt(a.size * b.size);
}

function estimateRequestHours(text: string, matches: ScopeItem[]) {
  const explicit = text.match(/(\d+)\s*(hours|hrs|h|days|weeks)/i);
  if (explicit) {
    const amount = Number(explicit[1]);
    const unit = explicit[2].toLowerCase();
    if (unit.startsWith("day")) return amount * 8;
    if (unit.startsWith("week")) return amount * 40;
    return amount;
  }

  const base = matches[0]?.hours ? Math.max(2, Math.round(matches[0].hours * 0.45)) : 6;
  const modifiers =
    (/\b(integration|dashboard|backend|payment|migration|automation)\b/i.test(text) ? 5 : 0) +
    (/\b(copy|text|color|small|quick)\b/i.test(text) ? -2 : 0) +
    (/\b(new|extra|also|redesign|replace)\b/i.test(text) ? 4 : 0);
  return clamp(base + modifiers, 1, 80);
}

function buildRecommendation(
  verdict: RequestAnalysis["verdict"],
  estimatedHours: number,
  revenueImpact: number,
  matches: ScopeItem[],
) {
  const reference = matches[0]?.title ? ` It appears closest to "${matches[0].title}".` : "";
  if (verdict === "in-scope") {
    return `Accept as part of the current engagement and confirm delivery timing.${reference}`;
  }
  if (verdict === "out-of-scope") {
    return `Create a paid change order for approximately ${estimatedHours} hours before starting. Estimated added value: ${revenueImpact.toLocaleString()}.${reference}`;
  }
  return `Pause for written approval. Estimate ${estimatedHours} hours, clarify priority, and record whether this replaces or extends existing scope.${reference}`;
}
