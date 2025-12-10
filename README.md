# Getting Started

Welcome to your new project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`package.json` | project metadata and configuration
`readme.md` | this getting started guide


## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start adding content, for example, a [db/schema.cds](db/schema.cds).

React UI:
- A React + Vite app is added at `app/react/` using `@ui5/webcomponents-react` and `recharts`.
- To run it locally:
	- `cd app/react && npm install && npm run dev`
	- The Vite dev server proxies API requests to the CAP backend at `http://localhost:4004`.
	- To deploy the built assets to the CAP server, run `npm run build` and copy `app/react/dist/*` into `app/`.

Deployment
----------

This project packages a CAP service and a static React UI. The following helper scripts prepare the project for deployment.

Build & prepare for deployment (local):

1. From project root run:

```bash
npm run prepare-deploy
```

This will:
- build the React app under `app/react` and produce `app/react/dist`
- run `cds build --production` to generate `gen/` artifacts for deployment
- copy the React `dist` contents into `app/` so the CAP server serves the static UI

2. Create the MTA archive or deploy as you normally do (e.g., `mbt build` or `cf deploy` depending on your platform). The `mta.yaml` is configured to pick up `gen/` modules for deployment.

Deploying to a local sqlite for testing:

```bash
npx cds deploy --to sqlite:db.sqlite
cds watch
```



## Learn More

Learn more at https://cap.cloud.sap/docs/get-started/.
