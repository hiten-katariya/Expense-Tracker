# Expense Tracker Overview

## 1. Project Overview

Expense Tracker is a full-stack financial tracking application for individuals, small teams, and families. It helps users record expenses, categorize spending, scan receipts, set budgets, receive alerts, and review insights through dashboards and reports.

### Key Goals

- Make expense entry fast and low-friction
- Support AI-assisted categorization and receipt scanning
- Provide clear monthly, category, and trend-based reporting
- Enable shared family expense tracking with combined totals
- Keep the system secure with authentication, RLS, and audit logging

### Core User Types

- Individual users tracking personal spending
- Families sharing a common expense pool
- Small business owners needing reports and exports
- Power users who want AI insights and anomaly detection

### Tech Stack

- Frontend: React 18 + Vite + Tailwind CSS
- Backend: Express.js + TypeScript
- Database: Supabase PostgreSQL
- Auth: Supabase Auth + JWT
- Storage: Supabase Storage
- AI: OpenAI GPT-4o
- OCR: Tesseract.js and AI post-processing

## 2. Architecture Diagram

```mermaid
graph LR
  U[User Browser] --> F[Frontend - React + Tailwind]
  F --> B[Backend API - Express.js]
  B --> D[(Supabase PostgreSQL)]
  B --> A[Supabase Auth]
  B --> S[Supabase Storage]
  B --> AI[OpenAI GPT-4o]
  B --> O[OCR Service]

  F -->|JWT / API Calls| B
  F -->|Auth Session| A
  F -->|Receipt Uploads| S
```

### Flow Summary

- The frontend handles the user interface and sends API requests.
- The backend verifies JWTs, applies business rules, and coordinates AI/OCR operations.
- PostgreSQL stores all relational application data.
- Supabase Auth manages sign-up, login, OAuth, and session handling.
- Supabase Storage stores receipt images and export files.

## 3. Class Diagram

```mermaid
classDiagram
  class User {
    +UUID id
    +string email
    +string fullName
    +string currencyCode
    +string role
  }

  class Workspace {
    +UUID id
    +string name
    +string defaultCurrencyCode
    +boolean isPersonal
  }

  class WorkspaceMember {
    +UUID id
    +string memberRole
    +datetime joinedAt
  }

  class Category {
    +UUID id
    +string name
    +string icon
    +string color
    +number monthlyLimit
  }

  class Expense {
    +UUID id
    +string title
    +number amount
    +date expenseDate
    +string paymentMethod
    +boolean isDeleted
  }

  class Budget {
    +UUID id
    +string budgetType
    +number amount
    +date startsOn
    +date endsOn
  }

  class Notification {
    +UUID id
    +string type
    +string title
    +string body
    +boolean readAt
  }

  class AuditLog {
    +UUID id
    +string entityType
    +string action
    +json beforeData
    +json afterData
  }

  class ReceiptOcrCache {
    +UUID id
    +string storagePath
    +string rawOcrText
    +json extractedJson
    +number confidenceScore
  }

  class FilterPreset {
    +UUID id
    +string name
    +json filters
    +json sortState
  }

  class AuthService {
    +register()
    +login()
    +refreshToken()
    +logout()
  }

  class ExpenseService {
    +createExpense()
    +updateExpense()
    +deleteExpense()
    +searchExpenses()
  }

  class CategoryService {
    +createCategory()
    +updateCategory()
    +mergeCategories()
  }

  class BudgetService {
    +createBudget()
    +evaluateThresholds()
  }

  class ReportService {
    +monthlySummary()
    +categoryBreakdown()
    +exportReport()
  }

  class AiService {
    +categorizeExpense()
    +generateInsights()
    +detectAnomalies()
  }

  User "1" --> "many" WorkspaceMember
  Workspace "1" --> "many" WorkspaceMember
  Workspace "1" --> "many" Category
  Workspace "1" --> "many" Expense
  Workspace "1" --> "many" Budget
  Workspace "1" --> "many" Notification
  Workspace "1" --> "many" AuditLog
  Workspace "1" --> "many" FilterPreset
  Category "1" --> "many" Expense
  Category "1" --> "many" Budget
  Expense "1" --> "many" ReceiptOcrCache
  Expense "1" --> "many" AuditLog

  AuthService ..> User
  ExpenseService ..> Expense
  CategoryService ..> Category
  BudgetService ..> Budget
  ReportService ..> Expense
  ReportService ..> Budget
  AiService ..> Expense
  AiService ..> ReceiptOcrCache
```

### Class Diagram Notes

- The domain model centers on workspace-scoped finance data.
- Services coordinate business logic rather than putting behavior inside the frontend.
- AI and OCR are treated as supporting services that enrich expense records.

## 4. ER Diagram

```mermaid
erDiagram
  profiles ||--o{ workspace_members : belongs_to
  workspaces ||--o{ workspace_members : has_members
  workspaces ||--o{ categories : owns
  workspaces ||--o{ expenses : contains
  workspaces ||--o{ budgets : contains
  workspaces ||--o{ notifications : generates
  workspaces ||--o{ audit_logs : records
  workspaces ||--o{ filter_presets : saves
  workspaces ||--o{ receipt_ocr_cache : stores
  workspaces ||--o{ exchange_rates : caches
  categories ||--o{ categories : parent_of
  categories ||--o{ expenses : assigned_to
  categories ||--o{ budgets : targeted_by
  expenses ||--o{ receipt_ocr_cache : extracted_from
  expenses ||--o{ audit_logs : tracked_by

  profiles {
    uuid id PK
    text email
    text full_name
    text avatar_url
    varchar currency_code
    text role
    boolean mfa_enabled
    timestamptz created_at
    timestamptz updated_at
  }

  workspaces {
    uuid id PK
    uuid owner_id FK
    text name
    text description
    varchar default_currency_code
    boolean is_personal
    timestamptz created_at
    timestamptz updated_at
  }

  workspace_members {
    uuid id PK
    uuid workspace_id FK
    uuid profile_id FK
    text member_role
    uuid invited_by FK
    timestamptz joined_at
    timestamptz created_at
  }

  categories {
    uuid id PK
    uuid workspace_id FK
    uuid created_by FK
    uuid parent_id FK
    text name
    text icon
    varchar color
    numeric monthly_limit
    boolean is_default
    integer sort_order
    timestamptz created_at
    timestamptz updated_at
  }

  expenses {
    uuid id PK
    uuid workspace_id FK
    uuid user_id FK
    uuid category_id FK
    text title
    text notes
    numeric amount
    varchar currency_code
    numeric amount_in_base_currency
    date expense_date
    text payment_method
    text tags
    text receipt_url
    text ai_category_suggestion
    numeric ai_confidence
    boolean is_recurring
    text recurring_interval
    boolean is_flagged
    boolean is_deleted
    timestamptz deleted_at
    timestamptz created_at
    timestamptz updated_at
  }

  budgets {
    uuid id PK
    uuid workspace_id FK
    uuid category_id FK
    uuid created_by FK
    text budget_type
    numeric amount
    varchar currency_code
    date starts_on
    date ends_on
    timestamptz created_at
    timestamptz updated_at
  }

  notifications {
    uuid id PK
    uuid workspace_id FK
    uuid user_id FK
    text type
    text title
    text body
    text channel
    timestamptz read_at
    timestamptz sent_at
    timestamptz created_at
  }

  audit_logs {
    uuid id PK
    uuid workspace_id FK
    uuid actor_id FK
    text entity_type
    uuid entity_id
    text action
    jsonb before_data
    jsonb after_data
    jsonb metadata
    timestamptz created_at
  }

  receipt_ocr_cache {
    uuid id PK
    uuid workspace_id FK
    uuid expense_id FK
    uuid uploaded_by FK
    text storage_path
    text raw_ocr_text
    jsonb extracted_json
    numeric confidence_score
    text status
    timestamptz created_at
    timestamptz processed_at
  }

  exchange_rates {
    uuid id PK
    date rate_date
    varchar base_currency_code
    varchar quote_currency_code
    numeric rate
    text source
    timestamptz fetched_at
  }

  filter_presets {
    uuid id PK
    uuid workspace_id FK
    uuid user_id FK
    text name
    jsonb filters
    jsonb sort_state
    timestamptz created_at
    timestamptz updated_at
  }
```

## 5. API List

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /auth/register | Register with email and password |
| POST | /auth/login | Login and return JWT plus refresh token |
| POST | /auth/verify-email | Verify account email |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout current session |
| POST | /auth/logout-all | Logout from all devices |
| POST | /auth/oauth/google | Google social sign-in |
| POST | /auth/oauth/github | GitHub social sign-in |

### User Profile

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /me | Get current user profile |
| PATCH | /me | Update name, avatar, currency, or budget |
| POST | /me/mfa/setup | Start MFA setup |
| POST | /me/mfa/verify | Confirm MFA token |

### Expenses

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /expenses | List expenses with filters and pagination |
| POST | /expenses | Create a new expense |
| GET | /expenses/:id | Get expense details |
| PATCH | /expenses/:id | Update an expense |
| DELETE | /expenses/:id | Soft-delete an expense |
| POST | /expenses/bulk-import | Import expenses from CSV |
| POST | /expenses/restore/:id | Restore a deleted expense |

### Categories

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /categories | List categories |
| POST | /categories | Create category |
| PATCH | /categories/:id | Update category |
| DELETE | /categories/:id | Delete category and reassign expenses |
| POST | /categories/merge | Merge one category into another |

### Budgets & Alerts

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /budgets | List budgets |
| POST | /budgets | Create budget |
| PATCH | /budgets/:id | Update budget |
| DELETE | /budgets/:id | Remove budget |
| GET | /alerts | List budget and anomaly alerts |

### Reports & Analytics

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /analytics/monthly-summary | Monthly totals and remaining budget |
| GET | /analytics/category-breakdown | Category-wise spending summary |
| GET | /analytics/trends | Month-over-month trend data |
| GET | /analytics/heatmap | Daily spending heatmap data |
| GET | /reports/export | Export PDF or CSV report |
| GET | /insights/monthly | AI-generated spending insights |

### AI & OCR

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /ai/categorize | Suggest a category for expense text |
| POST | /ai/scan-receipt | Extract receipt details from an image or PDF |
| POST | /ai/feedback | Store user feedback on AI suggestions |
| POST | /ai/anomalies/run | Trigger anomaly analysis |

### Notifications

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /notifications | List notifications |
| PATCH | /notifications/:id/read | Mark notification as read |
| POST | /notifications/mark-all-read | Mark all notifications as read |

### Family Scope

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /families | Create family group |
| POST | /families/invite | Invite a family member |
| POST | /families/invites/:token/accept | Accept invite |
| POST | /families/invites/:token/decline | Decline invite |
| GET | /families/:id | Get family details |
| GET | /families/:id/members | List family members |
| DELETE | /families/:id/members/:memberId | Remove a member |
| POST | /families/:id/leave | Leave family group |

## 6. Future Scope

The following items are important but can be scheduled after the core MVP:

- Mobile app using React Native or Expo
- Bank account sync and statement import
- Recurring expense auto-generation
- Advanced approval workflows for family or team expenses
- Budget recommendations using longer-term AI forecasting
- Custom report builder with drag-and-drop widgets
- Multi-tenant support for business teams and departments
- Offline expense entry with later synchronization
- Push notifications for mobile devices
- White-labeling and subscription plans
- Multi-language UI support
- Advanced tax and receipt compliance tools
- Scheduled monthly email digests with richer personalization

## 7. Summary

This overview captures the product structure, system architecture, core domain model, API surface, and future roadmap for Expense Tracker. It is intended as a high-level handoff document for planning, development, and project tracking.
