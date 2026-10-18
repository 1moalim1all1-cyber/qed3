#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Install Node.js LTS from https://nodejs.org/'; exit 1; }
npx --yes firebase-tools login
npx --yes firebase-tools deploy --only hosting,firestore --project qed3-2a2d8
echo 'Uploaded. NOT live-sales-ready: configure secure phone/password backend, admin and real inventory first.'
