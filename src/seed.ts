import type { AppData, ClientProject } from "./types";

const demoContract = `Project includes a responsive marketing website with five core pages: Home, Services, About, Case Studies, and Contact.
Deliver wireframes and high-fidelity UI design in Figma for the approved page list.
Build the frontend in React and integrate the contact form with the client's existing CRM endpoint.
Include two rounds of revisions after the first complete design presentation.
Provide basic SEO metadata, page titles, and launch checklist documentation.
Maintenance after launch is not included and requires a separate quote.
E-commerce, payment processing, booking flows, and custom dashboards are excluded from the initial fixed price.
Client provides brand assets, final copy, product photography, and CRM API credentials before development starts.
Any new page, integration, or revision round beyond the included items requires written approval.`;

export const seedProject: ClientProject = {
  id: "project_demo",
  name: "Launch Site Rebuild",
  client: "Northstar Fitness Studio",
  owner: "Avery Chen",
  summary: "Fixed-price website rebuild with strict approval gates for integrations, extra pages, and post-launch support.",
  startDate: "2026-06-03",
  dueDate: "2026-07-12",
  rate: 95,
  currency: "USD",
  contractText: demoContract,
  scopeItems: [
    {
      id: "scope_pages",
      title: "Five-page responsive marketing website",
      description: "Responsive marketing website with Home, Services, About, Case Studies, and Contact pages.",
      category: "Development",
      status: "included",
      hours: 42,
      source: "Signed proposal",
    },
    {
      id: "scope_figma",
      title: "Wireframes and Figma UI design",
      description: "Wireframes and high-fidelity UI design in Figma for approved page list.",
      category: "Design",
      status: "included",
      hours: 18,
      source: "Signed proposal",
    },
    {
      id: "scope_crm",
      title: "Contact form CRM endpoint",
      description: "Integrate contact form with the client's existing CRM endpoint.",
      category: "Development",
      status: "included",
      hours: 8,
      source: "Signed proposal",
    },
    {
      id: "scope_revisions",
      title: "Two revision rounds",
      description: "Two rounds of revisions after the first complete design presentation.",
      category: "Revision",
      status: "conditional",
      hours: 6,
      source: "Signed proposal",
    },
    {
      id: "scope_maintenance",
      title: "Post-launch maintenance",
      description: "Maintenance after launch is not included and requires a separate quote.",
      category: "Support",
      status: "excluded",
      hours: 0,
      source: "Signed proposal",
    },
    {
      id: "scope_payments",
      title: "E-commerce and payment processing",
      description: "E-commerce, payment processing, booking flows, and custom dashboards are excluded from the initial fixed price.",
      category: "Development",
      status: "excluded",
      hours: 0,
      source: "Signed proposal",
    },
  ],
  requests: [
    {
      id: "request_booking",
      date: "2026-06-21",
      requester: "Mira Patel",
      channel: "WhatsApp",
      text: "Can you also add a booking flow so members can reserve classes from the new site? It should be quick.",
      status: "new",
      verdict: "out-of-scope",
      confidence: 89,
      riskScore: 86,
      estimatedHours: 18,
      revenueImpact: 1710,
      matchedScopeIds: ["scope_payments"],
      recommendation:
        "Create a paid change order for approximately 18 hours before starting. Booking flows are excluded from the initial fixed price.",
    },
    {
      id: "request_copy",
      date: "2026-06-18",
      requester: "Mira Patel",
      channel: "Email",
      text: "Please update the Services page copy after our final content review.",
      status: "approved",
      verdict: "in-scope",
      confidence: 76,
      riskScore: 24,
      estimatedHours: 2,
      revenueImpact: 0,
      matchedScopeIds: ["scope_pages"],
      recommendation: "Accept as part of the current engagement and confirm timing.",
    },
  ],
  evidence: [
    {
      id: "ev_contract",
      date: "2026-06-03",
      type: "contract",
      title: "Signed website rebuild proposal",
      source: "Proposal PDF",
      excerpt:
        "Any new page, integration, or revision round beyond the included items requires written approval.",
      hash: "b2d64c19e3c83e44f8c6b6b0d169a2e6f8f482701cc402f03b3a6d23ad6a5402",
    },
    {
      id: "ev_booking_chat",
      date: "2026-06-21",
      type: "chat",
      title: "Booking flow request",
      source: "WhatsApp export",
      excerpt:
        "Can you also add a booking flow so members can reserve classes from the new site?",
      hash: "fbb0da8cf0f301b62893b8f5f7c88054901f5945fb2122beaf29515c7eb7e529",
    },
  ],
  milestones: [
    { id: "mile_design", title: "Design sign-off", dueDate: "2026-06-25", status: "done" },
    { id: "mile_build", title: "Frontend build", dueDate: "2026-07-04", status: "active" },
    { id: "mile_launch", title: "Launch handoff", dueDate: "2026-07-12", status: "not-started" },
  ],
};

export const seedData: AppData = {
  projects: [seedProject],
  selectedProjectId: seedProject.id,
};
