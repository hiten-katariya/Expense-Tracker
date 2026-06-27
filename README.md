# 🚀 Expenso — Intelligent Omnichannel Expense Tracker

Expenso is a premium, feature-rich, high-performance financial intelligence platform built using a modern **React (Vite) + Node.js/Express.js + TypeScript** stack, backed by **Supabase (PostgreSQL)** and integrated with **Google Gemini AI**. 

It provides seamless multi-workspace expense logging, real-time shared family budgets, transactional email queues, automated audits, GDPR compliance, and deep AI-driven insights including OCR receipt scanning and semantic search.

---

## ✨ Features

### 🧠 Gemini-Powered Financial AI
*   **Smart Semantic Search:** Query your expenses using natural language (e.g. *"Show me times I spent on dinners near downtown"*). Uses vector embeddings and Gemini.
*   **Real-time OCR Receipt Scanning:** Upload receipts (PNG, JPEG, PDF) to automatically extract merchant, amount, date, and predict categories. Powered by Tesseract.js and Gemini OCR.
*   **Interactive AI Chatbot:** Get personalized answers about your spending trends, queries, and financial health.
*   **Predictive Categorization:** Dynamically suggests category classifications during entry creation based on user patterns and titles.
*   **Budget Recommendations:** Generates automated budget guidelines and suggestions tailored to past cash-flow habits.

### 👥 Premium Family Hub
*   **Shared Financial Rooms:** Create synced family groups with shared monthly caps and visual progress rings.
*   **Role-Based Access Control:** Manage members as *Owner*, *Admin*, or *Member* with specialized permission sets.
*   **Two-Way Joining Pipeline:** Securely invite members via email (expiring in 7 days, powered by Resend) or directly via unique alphanumeric Invite Codes.
*   **Family Asset Overview:** View aggregated records, partner wallets, and track combine family assets.
*   **Family Trash & Recovery:** Recover or permanently purge deleted family records with standard cascade protection.

### 🔒 Privacy, Audits & GDPR Compliance
*   **GDPR Data Export:** Single-click compiles all user profile data, logs, and expenses into a secure downloadable ZIP archive.
*   **Soft Deletion Safeguards:** Set up account deletion requests with a 30-day grace period. Background sweep workers automatically manage sweep cycles.
*   **Centralized Audit Logs:** Secure audit log pipelines capturing sensitive user configurations, deletion triggers, and authentication logs.

### 📨 Transactional Emails & Notifications
*   **Centralized Notification Pipeline:** Real-time push alerts within the client matching email configurations.
*   **Resend Email Queue System:** High-reliability background worker checks database-backed transactional tables to queue and dispatch emails (welcome cycle, invitations, budget alerts, monthly digests).
*   **Automated Budget Alerts:** Notifies owners and members when shared budgets cross critical thresholds (80%, 90%, 100%).

### 📊 Admin Panel & System Health
*   **Interactive Dashboard:** Track global active signups, database query latency, and AI usage statistics.
*   **Diagnostics Portal:** Diagnostics metrics covering memory usage, event loops, database ping times, and CPU load.

---

## 🛠️ Tech Stack

### Frontend (Web)
*   **Core:** React 18, Vite, TypeScript
*   **State Management:** Zustand
*   **Data Fetching:** TanStack React Query v5
*   **Styling:** Tailwind CSS (Vanilla CSS & Tailwind hybrid grid layouts)
*   **Forms:** React Hook Form + Zod resolvers
*   **Icons:** Lucide React
*   **Animations:** Framer Motion

### Backend (API)
*   **Core:** Node.js, Express.js (v5), TypeScript, `tsx` runner
*   **Validation:** Zod schemas
*   **Security:** Helmet, Express Rate Limit (custom endpoint limits), CORS
*   **AI Integration:** `@google/genai` (Gemini Flash/Pro)
*   **Mailing:** Resend API client

### Database & Auth
*   **Provider:** Supabase
*   **Database:** PostgreSQL (with pgvector, migrations, custom triggers, and functions)
*   **Security:** Row-Level Security (RLS) policies enforcing user isolation across all tables.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   NPM
*   Supabase Account/Local CLI
*   Resend API Key (for transactional emails)
*   Gemini API Key (for AI capabilities)

### Step 1: Clone the Repository & Install Dependencies
```bash
git clone https://github.com/hiten-katariya/Expense-Tracker.git
cd Expense-Tracker
npm install
```

### Step 2: Set Up Environment Variables
Create a `.env.local` file in the root directory:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# APIs
GEMINI_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key

# App Paths
APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001
PORT=3001

### Step 3: Run Database Migrations
Deploy the sql migration files

### Step 4: Run the Application Locally

Start the backend Express server:
```bash
npm run server
```

In a separate terminal, start the frontend Vite development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` and the backend will run on `http://localhost:3001`.

---

## 📂 Project Structure
```text
Expense-Tracker/
├── server/               # Express backend application
│   ├── email/            # Resend transaction queue workers & services
│   ├── services/         # AI, Embedding, GDPR, and Audit Log services
│   └── index.ts          # Express entrypoint
├── src/                  # React Vite frontend application
│   ├── api/              # API Client (Axios interceptors setup)
│   ├── components/       # Shared UI Cards, Modals, Buttons, Layouts
│   ├── hooks/            # TanStack Queries and customized state hooks
│   ├── lib/              # Supabase clients & utility configurations
│   ├── pages/            # View components (Dashboard, Family Hub, Settings, etc.)
│   └── stores/           # Zustand Auth & UI state stores
├── supabase/
│   └── migrations/       # PostgreSQL DB schema migrations
├── package.json          # Monorepo scripts
└── tsconfig.json         # TypeScript configuration
```

---

## 🌎 Deployment

### Frontend (e.g. Vercel)
Deploy your frontend app to Vercel. Ensure you add your production env values:
*   `VITE_SUPABASE_URL`
*   `VITE_SUPABASE_ANON_KEY`
*   `VITE_API_URL` (Points to your Express app URL on Render)

### Backend (e.g. Render)
Deploy your backend Express application to Render (Web Service). 
*   **Build Command:** `npm install`
*   **Start Command:** `npm run server`
*   Make sure to configure the CORS origin array in [server/index.ts](file:///c:/Users/sharm/OneDrive/Desktop/Expense-Tracker/server/index.ts) to permit your Vercel client URL, or set your production client domain as `APP_URL`.

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.
