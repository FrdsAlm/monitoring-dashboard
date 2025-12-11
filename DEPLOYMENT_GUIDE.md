# GPS Central Monitoring Dashboard - Deployment Walkthrough

## ✅ Final Working State

- **Dashboard URL**: `https://54a097c8trial-dev-monitoring-dashboard-srv.cfapps.us10-001.hana.ondemand.com`
- **API URL**: `https://54a097c8trial-dev-monitoring-dashboard-srv.cfapps.us10-001.hana.ondemand.com/error-service/ErrorLogs`
- **Status**: Both CAP backend and React frontend deployed and working

---

## Project Architecture

```
monitoring-dashboard/
├── app/react/          # React + UI5 frontend (Vite build)
├── db/                 # CAP data model
│   ├── schema.cds      # Entity definitions (moved from db/src/)
│   └── data/           # CSV seed data
├── srv/                # CAP services
│   ├── service.cds     # OData service definition
│   └── server.js       # Custom express middleware for static files
├── mta.yaml            # MTA deployment descriptor
└── package.json        # Root dependencies + CDS config
```

---

## Issues Encountered & Resolutions

### Issue 1: HDI Deployer Failure - `.hdiignore` and `.cds` files

**Error**: `Configuration does not define a build plugin for file suffix "hdiignore"`

**Root Cause**:

- `db/src/.hdiignore` was being deployed to HANA but HDI has no plugin for it
- `db/src/schema.cds` was being deployed as raw CDS (should only deploy compiled `.hdbtable`)

**Fix**:

- Deleted entire `db/src/` folder
- Moved `schema.cds` to `db/` root (standard CAP location)
- Updated `srv/service.cds` import: `using {monitoring as db} from '../db/schema';`

---

### Issue 2: React Static Files Not Served (404 on root URL)

**Error**: `GET / 404 (Not Found)`

**Root Cause**:

- CAP doesn't automatically serve static files in production
- React build output (`app/react/dist/`) wasn't being included in deployed srv module
- The `before-all` copy command ran before `gen/srv/` existed

**Fix**:

1. Created `srv/server.js` with Express static middleware:

```javascript
const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

cds.on('bootstrap', app => {
    const appDir = path.join(__dirname, 'app');
    app.use('/', express.static(appDir));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/error-service') || req.path.startsWith('/$')) {
            return next();
        }
        res.sendFile(path.join(appDir, 'index.html'));
    });
});

module.exports = cds.server;
```

2. Updated `mta.yaml` build order (critical!):

```yaml
before-all:
  - builder: custom
    commands:
      - npm ci
      - bash -c "cd app/react && npm ci && npm run build"  # 1. Build React
      - npx cds build --production                          # 2. Creates gen/srv/
      - bash -c "mkdir -p gen/srv/app && cp -r app/react/dist/* gen/srv/app/"  # 3. Copy static files
      - bash -c "cp srv/server.js gen/srv/"                 # 4. Copy custom server
```

---

### Issue 3: xs-app.json Validation Error (Approuter)

**Error**: `html5-apps-repo-rt service not bound`

**Root Cause**: Tried using `approuter.nodejs` module which requires additional services not available in trial.

**Fix**: Removed approuter entirely. CAP srv now serves both API and static files directly.

---

### Issue 4: Authentication Failure  

**Error**: `401 Unauthorized` or XSUAA errors

**Fix**: Added dummy auth for trial environment in `package.json`:

```json
"cds": {
  "requires": {
    "production": { "auth": { "kind": "dummy" } }
  }
}
```

---

## Key Files Modified

| File | Change |
|------|--------|
| [mta.yaml](file:///Users/firdousalam/monitoring-dashboard/mta.yaml) | Proper build order with static file copy |
| [srv/server.js](file:///Users/firdousalam/monitoring-dashboard/srv/server.js) | Express static file serving |
| [srv/service.cds](file:///Users/firdousalam/monitoring-dashboard/srv/service.cds) | Updated import path |
| [db/schema.cds](file:///Users/firdousalam/monitoring-dashboard/db/schema.cds) | Moved from db/src/ |
| [package.json](file:///Users/firdousalam/monitoring-dashboard/package.json) | Added dummy auth config |

---

## Deployment Commands (SAP BAS)

```bash
# Build and deploy
mbt build
cf deploy mta_archives/monitoring-dashboard_1.0.0.mtar

# View logs
cf logs monitoring-dashboard-srv --recent
cf logs monitoring-dashboard-db-deployer --recent

# Restart if needed
cf restart monitoring-dashboard-srv
```

---

## Things That Do NOT Work in Trial

1. **XSUAA authentication** - Use `dummy` auth instead
2. **html5-apps-repo-rt service** - Don't use approuter, serve from CAP
3. **Raw .cds files in gen/db** - Must compile to .hdbtable

---

## For Future Development

When adding features, just edit the React app in `app/react/` and run the same deploy commands. The build pipeline will automatically:

1. Build React → `app/react/dist/`
2. Build CAP → `gen/srv/`
3. Copy React to `gen/srv/app/`
4. Package and deploy

**No more deployment fixes needed!** 🚀
