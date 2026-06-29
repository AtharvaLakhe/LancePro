# LancePro

LancePro is a local-first web app for freelancers who need to control scope creep. It turns contract language, client messages, and evidence into a clear approval workflow.

## What It Does

- Extracts included, conditional, and excluded scope items from project terms.
- Scores new client requests as in-scope, out-of-scope, or approval-needed.
- Estimates hours, risk, and potential change-order revenue.
- Stores evidence records with SHA-256 hashes.
- Exports a client-ready HTML scope report and raw JSON project data.
- Runs fully in the browser using local storage.

## Demo Flow

1. Open `http://127.0.0.1:5173`.
2. Go to `Demo` and use the live walkthrough.
3. Open `Scope`, review the sample contract, and run scope extraction.
4. Open `Requests`, paste a client request, and analyze it.
5. Save the request to the queue.
6. Open `Evidence`, add a note or hash a file.
7. Open `Reports` and export the client scope pack.

Sample request to paste:

```text
Can you also add ecommerce checkout, subscriptions, and a customer dashboard before launch?
```

## Resume Pitch

Built a local-first freelancer scope protection platform with contract parsing, change-request risk scoring, SHA-256 evidence capture, responsive SaaS UI, HTML report export, and Playwright-tested desktop/mobile workflows.

## Commands

```bash
npm install
npm run dev
npm run build
npm run test:e2e
```

## Tech

React, TypeScript, Vite, localStorage, Web Crypto API, Lucide icons, and Playwright.
