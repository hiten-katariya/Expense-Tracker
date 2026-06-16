# Expense Tracker — Project Plan & Requirements

**Document Version:** 1.1  
**Last Updated:** June 16, 2025  
**Prepared By:** Project Team

---

## 1. Project Setup & Collaboration

### GitHub Repository

**URL:** [https://github.com/hiten-katariya/Expense-Tracker](https://github.com/hiten-katariya/Expense-Tracker)

The repository has been shared with the team via the WhatsApp group for collaboration, code review, and issue tracking.

### Kanban Project Board

**URL:** [https://github.com/users/hiten-katariya/projects/1](https://github.com/users/hiten-katariya/projects/1)

## 1. GitHub Project Board Feature Backlog

Use these as GitHub Project cards. Suggested column flow: Backlog -> To Do -> In Progress -> In Review -> Done.

### 1.1 Epic: Authentication & User Management

- Set up Supabase auth integration
- Build email/password registration
- Add email verification flow
- Implement login and refresh tokens
- Add Google OAuth login
- Add GitHub OAuth login
- Add optional TOTP MFA setup
- Build profile settings page
- Support logout from current device
- Support logout from all devices

### 1.2 Epic: Expense Management

- Build add expense form
- Build edit expense form
- Add inline expense editing
- Add soft delete for expenses
- Build trash and restore flow
- Build paginated expense list
- Add expense sorting options
- Add expense filtering options
- Add bulk CSV import
- Add duplicate expense detection

### 1.3 Epic: Category Management

- Seed default categories
- Build category list view
- Add custom category creation
- Add category edit flow
- Add category delete and reassignment flow
- Add category icons and color picker
- Add subcategory support
- Add per-category budget limits
- Add category merge flow

### 1.4 Epic: Budgets & Alerts

- Build overall budget creation
- Build category budget creation
- Add budget progress bars
- Add 50 percent budget alert
- Add 80 percent budget alert
- Add 100 percent budget alert
- Add predictive overspend alerts
- Build monthly overspend summary

### 1.5 Epic: Reports & Analytics

- Build monthly summary dashboard
- Add category breakdown chart
- Add sortable category summary table
- Add month-over-month comparison
- Add daily spending heatmap
- Add top spending categories view
- Add average daily spend metric
- Add projected month-end total metric
- Add PDF export
- Add CSV export

### 1.6 Epic: Search & Filters

- Add category filter
- Add date range filter
- Add payment method filter
- Add amount range filter
- Add tags filter
- Add recurring expense filter
- Add full-text search across expenses
- Add saved filter presets
- Persist filter state in URL
- Add sorting by date, amount, category, and payment method

### 1.7 Epic: AI & Automation

- Add AI expense categorization
- Store AI confidence score
- Auto-apply high-confidence category suggestions
- Add manual accept or dismiss flow for AI suggestions
- Add receipt upload flow
- Add OCR text extraction
- Prefill expense form from receipt data
- Cache OCR results
- Add anomaly detection flagging
- Add monthly AI insights report

### 1.8 Epic: Notifications

- Build in-app notifications center
- Send budget breach notifications
- Send anomaly notifications
- Send monthly summary notifications
- Send email verification notifications
- Send monthly report emails

### 1.9 Epic: Family Expense Management

- Build family group creation
- Add family invite by email
- Add shareable family invite link
- Add invite acceptance flow
- Add invite decline flow
- Build family members list
- Add remove family member action
- Add leave family action
- Add family expense entry flow
- Build combined family expense list
- Build family total summary dashboard
- Build family category breakdown view
- Add personal vs family expense scope switch
- Add family budget alerts

### 1.10 Epic: Security, Platform, and Quality

- Enforce RLS on all user-facing tables
- Protect all API routes with JWT middleware
- Add signed receipt URL storage
- Add rate limiting for API and uploads
- Add audit log for expense changes
- Add GDPR export and delete flow
- Add loading skeletons for all data fetches
- Add responsive mobile-first UI behavior
- Add accessibility pass for WCAG 2.1 AA
- Add performance monitoring and optimization

### 1.11 Suggested MVP Order

1. Authentication & User Management
2. Expense Management
3. Category Management
4. Budgets & Alerts
5. Reports & Analytics
6. Search & Filters
7. Security, Platform, and Quality
8. AI & Automation
9. Notifications
10. Family Expense Management

---

## 2. Project Overview

### 2.1 What Problem Does It Solve?

Managing personal and small-business finances is difficult when spending is scattered across cash, cards, UPI, and receipts. Spreadsheets and basic note apps are time-consuming, error-prone, and provide limited insight into spending patterns.

**Expense Tracker** is a full-stack web application that enables users to:

- Log expenses quickly with minimal friction
- Automatically categorize spending using AI
- Scan receipts via OCR to auto-fill expense details
- Set category budgets and receive overspending alerts
- View monthly summaries, trends, and AI-generated financial insights
- Export reports for record-keeping and tax preparation
- Connect family members so each person can log expenses and view combined family totals

The application combines smart automation (AI categorization, anomaly detection, receipt scanning) with actionable analytics (charts, heatmaps, budget alerts) and shared family expense tracking in a secure, modern platform.

**Tech Stack:** React 18, Express.js, Supabase (PostgreSQL)

### 2.2 Who Are the Users?

| User Type | Description | Primary Needs |
|-----------|-------------|---------------|
| Individual users | Students, professionals, freelancers tracking personal spending | Fast expense entry, category breakdown, monthly budget control |
| Small business owners | Shop owners, consultants, startup teams | Audit logs, exportable reports, expense tracking |
| Budget-conscious households | Families managing shared household expenses | Connect family members, shared expense logging, total family spend, category budgets, alerts |
| Power users | Users seeking deep spending insights | AI insights, anomaly detection, CSV/PDF export, advanced filters |

Users access the application via modern web browsers on desktop and mobile. Default currency is INR, with multi-currency support (USD, EUR, GBP, AED).

---

## 3. Functional Requirements

### 3.1 Authentication & User Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | User Registration — Register with email and password; send verification link (valid 24 hours) | High |
| FR-02 | User Login — Login with email/password; issue JWT access token and refresh token | High |
| FR-03 | Social OAuth Login — Sign in with Google and GitHub | Medium |
| FR-04 | Email Verification — Verify email before creating expenses; resend with rate limiting | High |
| FR-05 | Multi-Factor Authentication (MFA) — Optional TOTP via authenticator app | Medium |
| FR-06 | User Profile Management — Update name, avatar, preferred currency, monthly budget | High |
| FR-07 | Logout & Session Management — Logout from current or all devices | High |

### 3.2 Expense Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-08 | Add Expense — Create expense with title, amount, date, category, payment method, notes | High |
| FR-09 | Edit Expense — Update expense fields inline or via form | High |
| FR-10 | Delete Expense — Soft-delete with 30-day recovery from trash | High |
| FR-11 | View Expenses — Paginated expense list with sort and filter | High |
| FR-12 | Bulk Import — Import expenses from CSV with column mapping | Medium |
| FR-13 | Duplicate Detection — Warn when similar expense added within 24 hours | Low |

### 3.3 Category Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-14 | View Categories — List default and custom categories | High |
| FR-15 | Add Category — Create custom category with icon and color | High |
| FR-16 | Edit / Delete Category — Update or remove category with expense reassignment | High |
| FR-17 | Sub-categories — Hierarchical categories (e.g., Food → Restaurants) | Medium |
| FR-18 | Category Budget Limits — Set per-category monthly spending cap | High |

### 3.4 Budgets & Alerts

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-19 | Set Budget — Define monthly/yearly budget per category or overall | High |
| FR-20 | Budget Progress — Visual progress bars with threshold indicators | High |
| FR-21 | Budget Alerts — Notify at 50%, 80%, and 100% of budget limit | Medium |
| FR-22 | Predictive Alerts — Warn mid-month if spending trend will exceed budget | Low |

### 3.5 Reports & Analytics

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-23 | Monthly Summary Dashboard — Total spent, remaining budget, recent activity | High |
| FR-24 | Category Breakdown — Doughnut chart and sortable table by category | High |
| FR-25 | Spending Trends — Month-over-month comparison with percentage deltas | High |
| FR-26 | Daily Spending Heatmap — Calendar-style heatmap of daily spend | Medium |
| FR-27 | Export Reports — Download PDF or CSV with date range and category filters | Medium |

### 3.6 Search & Filters

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-28 | Filter Expenses — By category, date range, payment method, amount, tags | High |
| FR-29 | Search Expenses — Full-text search across title, notes, and tags | High |
| FR-30 | Saved Filter Presets — Save and reuse custom filter combinations | Low |

### 3.7 AI & Automation Features

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-31 | AI Categorization — GPT-4o suggests category with confidence score; auto-apply above 0.85 | Medium |
| FR-32 | Receipt Scanner (OCR) — Upload receipt image; extract merchant, amount, date | Medium |
| FR-33 | Anomaly Detection — Flag expenses deviating from historical spending patterns | Low |
| FR-34 | AI Monthly Insights — Natural-language spending summary and saving opportunities | Low |

### 3.8 Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-35 | In-App Notifications — Budget breaches, anomalies, monthly summaries | Medium |
| FR-36 | Email Notifications — Verification, alerts, and monthly report emails | Medium |

### 3.9 Family Expense Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-37 | Create Family — User creates a family group with a name and optional monthly budget | High |
| FR-38 | Invite Family Members — Send invite via email or shareable link; invite expires after 7 days | High |
| FR-39 | Accept / Decline Invite — Invited user accepts or declines to join the family | High |
| FR-40 | View Family Members — List all connected members with name, role, and join date | High |
| FR-41 | Remove Family Member — Family admin removes a member; member retains personal expenses | Medium |
| FR-42 | Add Family Expense — Each member logs expenses tagged to the family pool | High |
| FR-43 | View Family Expenses — Combined expense list from all family members with member attribution | High |
| FR-44 | Family Total Summary — Dashboard shows total family spend for the month, remaining family budget, and per-member breakdown | High |
| FR-45 | Family Category Breakdown — Aggregate spending by category across all family members | High |
| FR-46 | Switch Expense Scope — Toggle between personal and family view when adding or viewing expenses | High |
| FR-47 | Family Budget Alerts — Notify all members when family budget reaches 50%, 80%, and 100% | Medium |
| FR-48 | Leave Family — Member can leave a family group voluntarily | Medium |

---

## 4. Non-Functional Requirements

### 4.1 Security

| ID | Requirement |
|----|-------------|
| NFR-01 | All API routes (except `/auth/*`) require a valid JWT in the Authorization header |
| NFR-02 | Supabase Row-Level Security (RLS) enforced on all user-facing tables |
| NFR-03 | Passwords hashed; JWT access tokens expire in 15 minutes; refresh tokens in 7 days |
| NFR-04 | HTTPS enforced; HSTS headers set on all responses |
| NFR-05 | Input validation with Zod on frontend and backend |
| NFR-06 | Receipt images stored in private Supabase Storage with signed URLs (1-hour expiry) |
| NFR-07 | Rate limiting: 100 API requests/minute per IP; 10 receipt uploads/hour per user |
| NFR-08 | Audit log for all expense create, update, and delete operations |
| NFR-09 | OWASP Top 10 compliance; monthly dependency vulnerability audit |
| NFR-10 | GDPR support: user data export and deletion on request within 30 days |
| NFR-23 | Family data isolated via RLS — members access only families they belong to |
| NFR-24 | Family invite tokens are single-use, expire after 7 days, and are invalidated on acceptance |

### 4.2 Performance

| ID | Requirement |
|----|-------------|
| NFR-11 | Dashboard initial load under 2 seconds |
| NFR-12 | API response time (p95) under 200 ms for standard CRUD operations |
| NFR-13 | Charts and reports render within 500 ms for 12 months of data |
| NFR-14 | Expense entry flow completable in under 15 seconds |
| NFR-15 | Skeleton loading states for all data-fetch operations |
| NFR-16 | AI categorization and OCR run asynchronously with optimistic UI |

### 4.3 Scalability

| ID | Requirement |
|----|-------------|
| NFR-17 | Architecture supports 10,000 concurrent users |
| NFR-18 | Supabase connection pooling via PgBouncer |
| NFR-19 | Frontend on Vercel; backend on Railway with autoscaling |
| NFR-20 | Stateless Express API for horizontal scaling |
| NFR-21 | Exchange rates and OCR results cached to reduce external API calls |
| NFR-22 | 99.9% uptime SLA; daily database backups with 30-day retention |

### 4.4 Other Requirements

| Category | Requirement |
|----------|-------------|
| Accessibility | WCAG 2.1 AA — keyboard navigation, ARIA labels, color contrast ≥ 4.5:1 |
| Browser Support | Chrome 110+, Firefox 110+, Safari 16+, Edge 110+; iOS Safari 16+, Android Chrome 110+ |
| Internationalization | INR default; multi-currency display (USD, EUR, GBP, AED); Indian date format (dd/mm/yyyy) |
| Reliability | Graceful fallback when OpenAI API is unavailable |
| Maintainability | TypeScript across frontend and backend; shared types in monorepo |

---

## 5. Assumptions & Constraints

### 5.1 Assumptions

| # | Assumption |
|---|------------|
| A-01 | Users have a stable internet connection and a modern web browser |
| A-02 | Users are comfortable with email-based registration and verification |
| A-03 | OpenAI GPT-4o API is available and within budget for AI features |
| A-04 | Supabase tier is sufficient for initial launch (up to ~500 monthly active users) |
| A-05 | Receipt images are legible (JPEG, PNG, PDF); OCR accuracy depends on image quality |
| A-06 | Default user locale is India (INR currency, dd/mm/yyyy date format) |
| A-07 | Development team is familiar with React, Express.js, and Supabase |
| A-08 | MVP launches as a responsive web application; native mobile app is deferred |
| A-09 | Third-party services (SendGrid, OpenAI, Supabase) maintain their published SLAs |
| A-10 | Family members each maintain their own account; one user may belong to one family group in MVP |

### 5.2 Constraints

| # | Constraint |
|---|------------|
| C-01 | Tech stack: React 18 + Vite + Tailwind CSS (frontend), Express.js + TypeScript (backend), Supabase PostgreSQL (database) |
| C-02 | OpenAI API usage must be monitored; AI features may use phased rollout via feature flags |
| C-03 | Target general availability in Q2 2025 |
| C-04 | Small team (2–5 developers); scope prioritized accordingly |
| C-05 | No native mobile app in v1.0; responsive web only |
| C-06 | API keys must not be exposed to the frontend; all AI calls proxied through Express |
| C-07 | Unverified users can browse the app but cannot create expenses until email is verified |
| C-08 | Expenses use soft-delete; hard delete after 30 days via scheduled job |
| C-09 | Each user may belong to one family group in MVP; multi-family support deferred to a later phase |
| C-10 | Family expenses are stored with a `family_id`; personal expenses remain private to the individual |

---

## 6. Supporting Documents

| Document | Location |
|----------|----------|
| Product Requirements Document | `Docs/PRD.md` |
| Database Schema | `Docs/Schema.md` |
| Technical Architecture | `Docs/Tech.md` |
| UI Design Document | `Docs/Design.md` |

---

## 7. GitHub Project Board Feature Backlog

Use these as GitHub Project cards. Suggested column flow: Backlog -> To Do -> In Progress -> In Review -> Done.

### 7.1 Epic: Authentication & User Management

- Set up Supabase auth integration
- Build email/password registration
- Add email verification flow
- Implement login and refresh tokens
- Add Google OAuth login
- Add GitHub OAuth login
- Add optional TOTP MFA setup
- Build profile settings page
- Support logout from current device
- Support logout from all devices

### 7.2 Epic: Expense Management

- Build add expense form
- Build edit expense form
- Add inline expense editing
- Add soft delete for expenses
- Build trash and restore flow
- Build paginated expense list
- Add expense sorting options
- Add expense filtering options
- Add bulk CSV import
- Add duplicate expense detection

### 7.3 Epic: Category Management

- Seed default categories
- Build category list view
- Add custom category creation
- Add category edit flow
- Add category delete and reassignment flow
- Add category icons and color picker
- Add subcategory support
- Add per-category budget limits
- Add category merge flow

### 7.4 Epic: Budgets & Alerts

- Build overall budget creation
- Build category budget creation
- Add budget progress bars
- Add 50 percent budget alert
- Add 80 percent budget alert
- Add 100 percent budget alert
- Add predictive overspend alerts
- Build monthly overspend summary

### 7.5 Epic: Reports & Analytics

- Build monthly summary dashboard
- Add category breakdown chart
- Add sortable category summary table
- Add month-over-month comparison
- Add daily spending heatmap
- Add top spending categories view
- Add average daily spend metric
- Add projected month-end total metric
- Add PDF export
- Add CSV export

### 7.6 Epic: Search & Filters

- Add category filter
- Add date range filter
- Add payment method filter
- Add amount range filter
- Add tags filter
- Add recurring expense filter
- Add full-text search across expenses
- Add saved filter presets
- Persist filter state in URL
- Add sorting by date, amount, category, and payment method

### 7.7 Epic: AI & Automation

- Add AI expense categorization
- Store AI confidence score
- Auto-apply high-confidence category suggestions
- Add manual accept or dismiss flow for AI suggestions
- Add receipt upload flow
- Add OCR text extraction
- Prefill expense form from receipt data
- Cache OCR results
- Add anomaly detection flagging
- Add monthly AI insights report

### 7.8 Epic: Notifications

- Build in-app notifications center
- Send budget breach notifications
- Send anomaly notifications
- Send monthly summary notifications
- Send email verification notifications
- Send monthly report emails

### 7.9 Epic: Family Expense Management

- Build family group creation
- Add family invite by email
- Add shareable family invite link
- Add invite acceptance flow
- Add invite decline flow
- Build family members list
- Add remove family member action
- Add leave family action
- Add family expense entry flow
- Build combined family expense list
- Build family total summary dashboard
- Build family category breakdown view
- Add personal vs family expense scope switch
- Add family budget alerts

### 7.10 Epic: Security, Platform, and Quality

- Enforce RLS on all user-facing tables
- Protect all API routes with JWT middleware
- Add signed receipt URL storage
- Add rate limiting for API and uploads
- Add audit log for expense changes
- Add GDPR export and delete flow
- Add loading skeletons for all data fetches
- Add responsive mobile-first UI behavior
- Add accessibility pass for WCAG 2.1 AA
- Add performance monitoring and optimization

### 7.11 Suggested MVP Order

1. Authentication & User Management
2. Expense Management
3. Category Management
4. Budgets & Alerts
5. Reports & Analytics
6. Search & Filters
7. Security, Platform, and Quality
8. AI & Automation
9. Notifications
10. Family Expense Management
