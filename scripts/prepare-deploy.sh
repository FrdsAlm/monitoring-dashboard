#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
echo "Building React app..."
cd "$ROOT/app/react"
npm ci
npm run build

echo "Building CAP project..."
cd "$ROOT"
npx cds build --production

echo "Copying React dist into app/ for CAP to serve..."
node "$ROOT/scripts/copy-react-dist.js"

echo "Prepare deploy complete. You can now run your MTA build or deploy gen/ to your platform."
