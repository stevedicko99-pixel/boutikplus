#!/bin/bash
# scripts/perf-audit.sh
# Quick performance audit using Lighthouse
# -------------------------------------------------
# 1. Build the Expo web production bundle
# 2. Serve the static `dist` folder on localhost:3000
# 3. Run Lighthouse (mobile preset) and output:
#    - HTML report (reports/audit.html)
#    - JSON results (reports/audit.json)
# -------------------------------------------------

set -e

# Ensure the reports directory exists
mkdir -p reports

# Build the web assets
echo "🔨 Building production bundle..."
npm run build:web

# Serve the `dist` directory (quiet, single-page app fallback)
echo "🚀 Starting static server on http://localhost:3000"
npx http-server dist -s -c -f -p 3000 > /dev/null 2>&1 &
SERVER_PID=$!

# Wait until the server is ready (timeout after 30s)
echo "⏳ Waiting for server to be ready..."
npx wait-on http://localhost:3000 --timeout=30s

# Run Lighthouse (mobile preset) and store reports
echo "📊 Running Lighthouse audit..."
npx lighthouse http://localhost:3000 \
  --preset=mobile \
  --disable-console \
  --output=html > reports/audit.html \
  --output=json > reports/audit.json \
  --collector-project=BoutikPlus-Performance-Audit

# Kill the static server
kill $SERVER_PID 2>/dev/null || true
echo "✅ Audit complete! Reports saved in ./reports"