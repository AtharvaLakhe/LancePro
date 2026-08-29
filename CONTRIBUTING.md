# Contributing to LancePro

## Local-first is the constraint

LancePro runs entirely in the browser using localStorage and the Web Crypto API. There is no server and no account. A freelancer can point it at a client contract without that contract leaving their machine.

Do not add a backend, a sync service, or telemetry. If a feature cannot work offline, it does not belong here.

## Running it

    npm install
    npm run dev      # http://127.0.0.1:5173
    npm run build
    npm run test:e2e

## Evidence integrity

Evidence records are hashed with SHA-256 via the Web Crypto API. The hash is the point: it is what lets a freelancer show a client that a note or file predates a disputed request. Changes that weaken or bypass hashing will be rejected.

## What the app decides

Scope items are classified as included, conditional, or excluded. Incoming requests are scored in scope, out of scope, or approval needed. If you change the scoring, say in your pull request how you validated it against the sample contract - a change that quietly reclassifies requests is the most damaging kind of regression here.

## Tests

The Playwright suite covers desktop and mobile flows. Run it before opening a pull request:

    npm run test:e2e