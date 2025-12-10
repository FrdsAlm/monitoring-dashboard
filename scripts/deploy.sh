#!/usr/bin/env bash
set -euo pipefail

# deploy.sh - helper to build MTA and deploy the generated .mtar to Cloud Foundry
# Usage: ./scripts/deploy.sh --mtar mta_archives/monitoring-dashboard_1.0.0.mtar \
#             --cf-api https://api.cf.<region>.hana.ondemand.com \
#             --cf-org ORG --cf-space SPACE --cf-user USER
# The script will run `mbt build` if no --mtar is provided, then run `cf deploy`.

MTAR_PATH=""
CF_API=""
CF_ORG=""
CF_SPACE=""
CF_USER=""

print_usage(){
  cat <<EOF
Usage: $0 [--mtar <path>] [--cf-api <api>] [--cf-org <org>] [--cf-space <space>] [--cf-user <user>]

If --mtar is not provided, the script runs 'mbt build' and uses the generated file
from the 'mta_archives' directory.

Example:
  ./scripts/deploy.sh --cf-api https://api.cf.eu10.hana.ondemand.com --cf-org myOrg --cf-space dev --cf-user me

EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mtar) MTAR_PATH="$2"; shift 2;;
    --cf-api) CF_API="$2"; shift 2;;
    --cf-org) CF_ORG="$2"; shift 2;;
    --cf-space) CF_SPACE="$2"; shift 2;;
    --cf-user) CF_USER="$2"; shift 2;;
    -h|--help) print_usage; exit 0;;
    *) echo "Unknown arg: $1"; print_usage; exit 1;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "$MTAR_PATH" ]]; then
  echo "No --mtar provided — running 'mbt build' to create .mtar..."
  (cd "$ROOT_DIR" && mbt build)
  # pick the newest mtar in mta_archives
  MTAR_PATH=$(ls -1t "$ROOT_DIR"/mta_archives/*.mtar 2>/dev/null | head -n1 || true)
  if [[ -z "$MTAR_PATH" ]]; then
    echo "ERROR: no .mtar was created in $ROOT_DIR/mta_archives" >&2
    exit 1
  fi
  echo "Using generated mtar: $MTAR_PATH"
else
  echo "Using provided mtar: $MTAR_PATH"
fi

if [[ -z "$CF_API" || -z "$CF_ORG" || -z "$CF_SPACE" || -z "$CF_USER" ]]; then
  echo "NOTE: --cf-api, --cf-org, --cf-space and --cf-user are recommended to be set." >&2
  echo "You will be prompted to login if not already authenticated with 'cf login'." >&2
fi

echo "You can login now (interactive) if needed:"
echo "  cf login -a ${CF_API:-<api>} -u ${CF_USER:-<user>} -o ${CF_ORG:-<org>} -s ${CF_SPACE:-<space>}"
read -p "Press Enter to continue with cf deploy (or CTRL-C to cancel) ..."

echo "Deploying $MTAR_PATH to Cloud Foundry using 'cf deploy'..."
cf deploy "$MTAR_PATH"

echo "Deployment started. Use 'cf apps' and 'cf logs <app-name> --recent' to monitor." 
