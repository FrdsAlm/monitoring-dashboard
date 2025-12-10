React monitoring dashboard

Run locally:

cd app/react
npm install
npm run dev

The Vite dev server proxies API calls to the local CAP backend (`/error-service/*`).

Build:

npm run build

Then copy `dist` contents to `app/` if you want to serve the built files from the CAP server.
