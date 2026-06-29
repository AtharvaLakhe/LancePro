import type { ClientProject } from "./types";
import { escapeHtml, formatCurrency, formatDate } from "./utils";

export function buildReportHtml(project: ClientProject) {
  const openRequests = project.requests.filter((request) => request.status === "new");
  const addedValue = project.requests.reduce((total, request) => total + request.revenueImpact, 0);
  const scopeRows = project.scopeItems
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${item.hours}</td>
          <td>${escapeHtml(item.source)}</td>
        </tr>`,
    )
    .join("");

  const requestRows = project.requests
    .map(
      (request) => `
        <tr>
          <td>${formatDate(request.date)}</td>
          <td>${escapeHtml(request.requester)}</td>
          <td>${escapeHtml(request.verdict)}</td>
          <td>${request.estimatedHours}</td>
          <td>${formatCurrency(request.revenueImpact, project.currency)}</td>
          <td>${escapeHtml(request.recommendation)}</td>
        </tr>`,
    )
    .join("");

  const evidenceRows = project.evidence
    .map(
      (evidence) => `
        <tr>
          <td>${formatDate(evidence.date)}</td>
          <td>${escapeHtml(evidence.type)}</td>
          <td>${escapeHtml(evidence.title)}</td>
          <td><code>${escapeHtml(evidence.hash.slice(0, 18))}...</code></td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(project.name)} Scope Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #17201b; margin: 40px; line-height: 1.5; }
    h1, h2 { margin: 0 0 12px; }
    h1 { font-size: 32px; }
    h2 { margin-top: 32px; font-size: 18px; text-transform: uppercase; letter-spacing: 0.08em; }
    .meta { color: #5b645f; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
    .tile { border: 1px solid #d8ded7; padding: 16px; border-radius: 8px; }
    .label { font-size: 11px; color: #69726d; text-transform: uppercase; letter-spacing: 0.08em; }
    .value { font-size: 24px; font-weight: 700; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border-bottom: 1px solid #d8ded7; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { background: #f4f6f1; color: #3d4640; }
    code { font-size: 12px; }
    @media print { body { margin: 18mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(project.name)}</h1>
  <div class="meta">${escapeHtml(project.client)} | ${formatDate(project.startDate)} to ${formatDate(project.dueDate)}</div>
  <p>${escapeHtml(project.summary)}</p>

  <section class="summary">
    <div class="tile"><div class="label">Scope Items</div><div class="value">${project.scopeItems.length}</div></div>
    <div class="tile"><div class="label">Open Requests</div><div class="value">${openRequests.length}</div></div>
    <div class="tile"><div class="label">Potential Value</div><div class="value">${formatCurrency(addedValue, project.currency)}</div></div>
    <div class="tile"><div class="label">Evidence</div><div class="value">${project.evidence.length}</div></div>
  </section>

  <h2>Scope Register</h2>
  <table>
    <thead><tr><th>Item</th><th>Category</th><th>Status</th><th>Hours</th><th>Source</th></tr></thead>
    <tbody>${scopeRows}</tbody>
  </table>

  <h2>Change Requests</h2>
  <table>
    <thead><tr><th>Date</th><th>Requester</th><th>Verdict</th><th>Hours</th><th>Value</th><th>Recommendation</th></tr></thead>
    <tbody>${requestRows}</tbody>
  </table>

  <h2>Evidence Ledger</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Title</th><th>SHA-256</th></tr></thead>
    <tbody>${evidenceRows}</tbody>
  </table>
</body>
</html>`;
}
