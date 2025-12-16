# GPS Central Monitoring Dashboard

A centralized dashboard for monitoring Interface Logs (CPI, MuleSoft, Ivalua) and Procurement Statistics, built with **SAP Cloud Application Programming Model (CAP)** and **React**.

## 🏗️ Architecture

* **Frontend**: React (Vite) + SAP UI5 Web Components
* **Backend**: Node.js (CAP Framework)
* **Database**: SAP HANA Cloud
* **Deployment**: SAP BTP (Cloud Foundry)

---

## 📋 Infrastructure Requirements

### 1. Development Prerequisites (Current/Demo)

*Required to run the current 'Feature' branch.*

* **Tools**:
  * **SAP Business Application Studio (BAS)** (or VS Code with BTP extensions).
* **BTP Services**:
  * **SAP HANA Cloud** (Database instance).
  * **SAP HANA Schemas & HDI Containers** (Plan: `hdi-shared`).
* **Security**:
  * **None (Mocked)**: Uses `dummy` authentication for local/demo purposes.

### 2. Production Requirements (Go-Live)

*Required when merging to 'Main' for production.*

* **Mandatory Services**:
  * **Authorization & Trust Management (XSUAA)** (Plan: `application`).
    * *Action*: Create `xs-security.json`, bind to service, remove `dummy` auth.
* **Recommended Services**:
  * **Application Logging**: For persistent error tracking in BTP Cockpit.

---

## 💻 How to Run Locally

To run the full application (React Frontend + CAP Backend) on your machine/BAS:

### Step 1: Build the Frontend

Compile the React application. Run this whenever you modify frontend code.

```bash
cd app/react
npm install      # Run once
npm run build    # Compiles to app/react/dist
cd ../..         # Return to root
```

### Step 2: Prepare the Server

Copy the compiled frontend assets to the server's static folder.

```bash
mkdir -p srv/app
cp -r app/react/dist/* srv/app/
```

### Step 3: Start the CAP Server

Start the backend. It serves the API and the static React files.

```bash
npx cds watch
```

* Access the Dashboard at: **<http://localhost:4004>**
* *Note: Backend changes hot-reload automatically. Frontend changes require repeating Steps 1 & 2.*

---

## ☁️ How to Deploy (SAP BTP)

Deployment is handled via the Multi-Target Application (MTA) builder.

1. **Build the Archive (.mtar)**

    ```bash
    mbt build
    ```

    *This automatically builds the React app, compiles the CAP service, and packages them.*

2. **Deploy to Cloud Foundry**

    ```bash
    cf deploy mta_archives/monitoring-dashboard_1.0.0.mtar
    ```

---

## 🔄 Refresh Mechanism

* **Charts**: **Client-Side (Instant)**. Loads 2,000 logs once, filters in-memory.
* **Logs Table**: **Server-Side (Time Range)** / **Client-Side (Others)**.
* **Procurement Stats**: **Server-Side**. Fetches fresh data on period change.
