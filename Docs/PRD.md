const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak, PageNumberElement, Header, Footer, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

const BLUE_DARK = "1E3A5F";
const BLUE_MID = "2E75B6";
const BLUE_LIGHT = "D6E4F0";
const BLUE_ACCENT = "4A90D9";
const GRAY_LIGHT = "F5F7FA";
const GRAY_TEXT = "555555";
const GREEN = "27AE60";
const ORANGE = "E67E22";
const RED = "E74C3C";
const WHITE = "FFFFFF";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE_MID, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: BLUE_DARK })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: BLUE_MID })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: BLUE_DARK })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: GRAY_TEXT, ...opts })]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: GRAY_TEXT })]
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function sectionBadge(text, color = BLUE_ACCENT) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: noBorders,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        children: [new Paragraph({
          children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: WHITE })]
        })]
      })]
    })]
  });
}

function infoBox(text, color = BLUE_LIGHT) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: BLUE_ACCENT },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          left: { style: BorderStyle.SINGLE, size: 12, color: BLUE_ACCENT },
          right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 200, right: 200 },
        children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 21, color: BLUE_DARK })] })]
      })]
    })]
  });
}

function spacer(pts = 120) {
  return new Paragraph({ spacing: { before: 0, after: pts }, children: [new TextRun("")] });
}

function makeHeaderRow(cells, colWidths) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((text, i) => new TableCell({
      borders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: BLUE_DARK, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold: true, color: WHITE })] })]
    }))
  });
}

function makeDataRow(cells, colWidths, shade = false) {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: shade ? GRAY_LIGHT : WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: text || "", font: "Arial", size: 20, color: GRAY_TEXT })] })]
    }))
  });
}

// ─────────────────────────────────────────
// DOCUMENT
// ─────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ]
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Arial", color: BLUE_DARK }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: BLUE_MID }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: "Arial", color: BLUE_DARK }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE_MID, space: 4 } },
          children: [
            new TextRun({ text: "EXPENSE TRACKER  |  Product Requirements Document", font: "Arial", size: 18, color: BLUE_MID }),
            new TextRun({ text: "    v1.0  |  Confidential", font: "Arial", size: 18, color: "AAAAAA" }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE_MID, space: 4 } },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: "© 2025 Expense Tracker App. All rights reserved.", font: "Arial", size: 18, color: "AAAAAA" }),
            new TextRun({ text: "\tPage", font: "Arial", size: 18, color: BLUE_MID }),
          ]
        })]
      })
    },
    children: [

      // ── COVER PAGE ──────────────────────────────────
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({
          children: [new TableCell({
            borders: noBorders,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: BLUE_DARK, type: ShadingType.CLEAR },
            margins: { top: 600, bottom: 600, left: 400, right: 400 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "EXPENSE TRACKER", font: "Arial", size: 56, bold: true, color: WHITE })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: "Product Requirements Document", font: "Arial", size: 30, color: "B0C8E8" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Full-Stack Application  |  React + Express.js + Supabase", font: "Arial", size: 22, color: "8AAED4" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Version 1.0  |  2025", font: "Arial", size: 20, color: "7A9EC4" })] }),
            ]
          })]
        })]
      }),

      spacer(400),

      // Meta table
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2400, 6960],
        rows: [
          makeDataRow(["Document Version", "1.0 — Initial Release"], [2400, 6960]),
          makeDataRow(["Status", "Draft — For Review"], [2400, 6960], true),
          makeDataRow(["Product Name", "Expense Tracker"], [2400, 6960]),
          makeDataRow(["Tech Stack", "React 18 + Tailwind CSS, Express.js, Supabase (PostgreSQL)"], [2400, 6960], true),
          makeDataRow(["Target Release", "Q2 2025"], [2400, 6960]),
          makeDataRow(["Prepared By", "Product Team"], [2400, 6960], true),
        ]
      }),

      pageBreak(),

      // ── 1. EXECUTIVE SUMMARY ──
      h1("1. Executive Summary"),
      para("The Expense Tracker is a full-stack web application designed to help individuals, families, and small teams intelligently track, categorize, and analyze their spending. Powered by React 18 and Tailwind CSS on the frontend, an Express.js REST API on the backend, and Supabase (PostgreSQL) as the database layer, the application delivers a modern, responsive experience with advanced AI-driven automation, smart receipt scanning, budget alerts, family expense sharing, and comprehensive financial reporting."),
      spacer(80),
      para("Unlike basic expense-logging tools, this product incorporates AI categorization, anomaly detection, multi-currency support, family group collaboration with combined expense totals, and real-time collaborative features — making it equally suitable for personal finance management, household budgeting, and small-business bookkeeping."),
      spacer(200),

      // ── 2. GOALS ──
      h1("2. Product Goals & Objectives"),
      h2("2.1 Primary Goals"),
      bullet("Provide a fast, intuitive interface for logging daily expenses with minimal friction"),
      bullet("Automate categorization using AI to reduce manual effort by 80%"),
      bullet("Deliver actionable monthly and yearly financial summaries and insights"),
      bullet("Support multi-user collaboration with role-based access control"),
      bullet("Enable family groups where members log shared expenses and view combined family totals"),
      bullet("Ensure data security and compliance with financial data best practices"),
      spacer(120),
      h2("2.2 Success Metrics"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3500, 2930, 2930],
        rows: [
          makeHeaderRow(["Metric", "Target", "Measurement"], [3500, 2930, 2930]),
          makeDataRow(["Expense entry time", "< 15 seconds", "UX benchmark"], [3500, 2930, 2930]),
          makeDataRow(["AI categorization accuracy", "> 92%", "Weekly audit"], [3500, 2930, 2930], true),
          makeDataRow(["Monthly active users (Month 3)", "500+", "Analytics"], [3500, 2930, 2930]),
          makeDataRow(["API response time (p95)", "< 200ms", "APM monitoring"], [3500, 2930, 2930], true),
          makeDataRow(["Receipt OCR accuracy", "> 95%", "Batch testing"], [3500, 2930, 2930]),
        ]
      }),

      pageBreak(),

      // ── 3. TECH STACK ──
      h1("3. Technology Stack"),
      spacer(80),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 3580, 3580],
        rows: [
          makeHeaderRow(["Layer", "Technology", "Purpose"], [2200, 3580, 3580]),
          makeDataRow(["Frontend", "React 18 + Vite", "SPA, component-based UI"], [2200, 3580, 3580]),
          makeDataRow(["Styling", "Tailwind CSS v3", "Utility-first responsive design"], [2200, 3580, 3580], true),
          makeDataRow(["State Management", "Zustand + React Query", "Global state + server caching"], [2200, 3580, 3580]),
          makeDataRow(["Backend", "Node.js + Express.js", "REST API, middleware, auth"], [2200, 3580, 3580], true),
          makeDataRow(["Database", "Supabase (PostgreSQL)", "Relational DB + Realtime + Auth"], [2200, 3580, 3580]),
          makeDataRow(["Authentication", "Supabase Auth + JWT", "OAuth2, email/password, MFA"], [2200, 3580, 3580], true),
          makeDataRow(["AI/ML", "OpenAI GPT-4o API", "Categorization, insights, anomaly detection"], [2200, 3580, 3580]),
          makeDataRow(["File Storage", "Supabase Storage", "Receipt images, exports"], [2200, 3580, 3580], true),
          makeDataRow(["Charts", "Recharts + D3.js", "Interactive financial charts"], [2200, 3580, 3580]),
          makeDataRow(["Email", "Nodemailer + SendGrid", "Alerts, reports, verification"], [2200, 3580, 3580], true),
          makeDataRow(["Deployment", "Vercel (FE) + Railway (BE)", "CI/CD, serverless, autoscale"], [2200, 3580, 3580]),
        ]
      }),

      pageBreak(),

      // ── 4. DATABASE SCHEMA ──
      h1("4. Database Schema"),
      para("All tables are hosted in Supabase (PostgreSQL). Row-Level Security (RLS) is enabled on all user-facing tables. The schema supports family groups, multi-user workspaces, recurring expenses, budgets, and AI metadata."),
      spacer(120),

      h2("4.1 Users Table"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2100, 1800, 1300, 4160],
        rows: [
          makeHeaderRow(["Column", "Type", "Constraint", "Description"], [2100, 1800, 1300, 4160]),
          makeDataRow(["id", "UUID", "PK, default uuid_generate_v4()", "Primary user identifier"], [2100, 1800, 1300, 4160]),
          makeDataRow(["email", "TEXT", "UNIQUE, NOT NULL", "User email address"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["full_name", "TEXT", "", "Display name"], [2100, 1800, 1300, 4160]),
          makeDataRow(["avatar_url", "TEXT", "", "Profile picture URL (Supabase Storage)"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["currency", "VARCHAR(3)", "DEFAULT 'INR'", "Preferred display currency"], [2100, 1800, 1300, 4160]),
          makeDataRow(["monthly_budget", "NUMERIC(12,2)", "", "Overall monthly spending limit"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["is_email_verified", "BOOLEAN", "DEFAULT false", "Email verification status"], [2100, 1800, 1300, 4160]),
          makeDataRow(["mfa_enabled", "BOOLEAN", "DEFAULT false", "Multi-factor auth flag"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["role", "TEXT", "CHECK (role IN ('admin','member','viewer'))", "RBAC role"], [2100, 1800, 1300, 4160]),
          makeDataRow(["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Account creation timestamp"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["updated_at", "TIMESTAMPTZ", "DEFAULT now()", "Last profile update"], [2100, 1800, 1300, 4160]),
        ]
      }),
      spacer(200),

      h2("4.2 Families Table"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2100, 1800, 1300, 4160],
        rows: [
          makeHeaderRow(["Column", "Type", "Constraint", "Description"], [2100, 1800, 1300, 4160]),
          makeDataRow(["id", "UUID", "PK", "Family group identifier"], [2100, 1800, 1300, 4160]),
          makeDataRow(["owner_id", "UUID", "FK → users(id), NOT NULL", "Family creator and admin"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["name", "TEXT", "NOT NULL", "Family display name"], [2100, 1800, 1300, 4160]),
          makeDataRow(["monthly_budget", "NUMERIC(12,2)", "", "Combined monthly family spending limit"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["currency", "VARCHAR(3)", "DEFAULT 'INR'", "Family reporting currency"], [2100, 1800, 1300, 4160]),
          makeDataRow(["invite_code", "TEXT", "UNIQUE", "Shareable join code"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Creation timestamp"], [2100, 1800, 1300, 4160]),
        ]
      }),
      spacer(200),

      h2("4.3 Family Members Table"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2100, 1800, 1300, 4160],
        rows: [
          makeHeaderRow(["Column", "Type", "Constraint", "Description"], [2100, 1800, 1300, 4160]),
          makeDataRow(["id", "UUID", "PK", "Membership identifier"], [2100, 1800, 1300, 4160]),
          makeDataRow(["family_id", "UUID", "FK → families(id), NOT NULL", "Linked family group"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["user_id", "UUID", "FK → users(id), NOT NULL", "Family member"], [2100, 1800, 1300, 4160]),
          makeDataRow(["member_role", "TEXT", "CHECK IN ('admin','member')", "Access role within family"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["display_name", "TEXT", "", "Optional nickname in family views"], [2100, 1800, 1300, 4160]),
          makeDataRow(["joined_at", "TIMESTAMPTZ", "DEFAULT now()", "When member joined"], [2100, 1800, 1300, 4160], true),
        ]
      }),
      spacer(200),

      h2("4.4 Family Invites Table"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2100, 1800, 1300, 4160],
        rows: [
          makeHeaderRow(["Column", "Type", "Constraint", "Description"], [2100, 1800, 1300, 4160]),
          makeDataRow(["id", "UUID", "PK", "Invite identifier"], [2100, 1800, 1300, 4160]),
          makeDataRow(["family_id", "UUID", "FK → families(id), NOT NULL", "Target family group"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["invited_email", "TEXT", "NOT NULL", "Invitee email address"], [2100, 1800, 1300, 4160]),
          makeDataRow(["invited_by", "UUID", "FK → users(id), NOT NULL", "User who sent invite"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["invite_token", "TEXT", "UNIQUE, NOT NULL", "Single-use secure token"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["status", "TEXT", "DEFAULT 'pending'", "pending, accepted, declined, expired"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["expires_at", "TIMESTAMPTZ", "NOT NULL", "Invite expiry (7 days)"], [2100, 1800, 1300, 4160]),
        ]
      }),
      spacer(200),

      h2("4.5 Categories Table"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2100, 1800, 1300, 4160],
        rows: [
          makeHeaderRow(["Column", "Type", "Constraint", "Description"], [2100, 1800, 1300, 4160]),
          makeDataRow(["id", "UUID", "PK", "Category identifier"], [2100, 1800, 1300, 4160]),
          makeDataRow(["user_id", "UUID", "FK → users(id), NOT NULL", "Owner of the category"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["name", "TEXT", "NOT NULL", "Category name (e.g., Food, Travel)"], [2100, 1800, 1300, 4160]),
          makeDataRow(["icon", "TEXT", "", "Emoji or icon identifier"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["color", "VARCHAR(7)", "", "Hex color for UI badges"], [2100, 1800, 1300, 4160]),
          makeDataRow(["monthly_limit", "NUMERIC(12,2)", "", "Per-category budget cap"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["is_default", "BOOLEAN", "DEFAULT false", "System-provided default category"], [2100, 1800, 1300, 4160]),
          makeDataRow(["parent_id", "UUID", "FK → categories(id)", "For sub-categories (hierarchical)"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Creation timestamp"], [2100, 1800, 1300, 4160]),
        ]
      }),
      spacer(200),

      h2("4.6 Expenses Table"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2100, 1800, 1300, 4160],
        rows: [
          makeHeaderRow(["Column", "Type", "Constraint", "Description"], [2100, 1800, 1300, 4160]),
          makeDataRow(["id", "UUID", "PK", "Expense identifier"], [2100, 1800, 1300, 4160]),
          makeDataRow(["user_id", "UUID", "FK → users(id), NOT NULL", "Member who logged the expense"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["family_id", "UUID", "FK → families(id)", "Family pool when expense is shared"], [2100, 1800, 1300, 4160]),
          makeDataRow(["expense_scope", "TEXT", "DEFAULT 'personal'", "personal or family"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["category_id", "UUID", "FK → categories(id)", "Linked category"], [2100, 1800, 1300, 4160]),
          makeDataRow(["amount", "NUMERIC(12,2)", "NOT NULL, CHECK (amount > 0)", "Expense amount"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["currency", "VARCHAR(3)", "DEFAULT 'INR'", "Currency of the transaction"], [2100, 1800, 1300, 4160]),
          makeDataRow(["amount_inr", "NUMERIC(12,2)", "", "Normalized INR amount (for reporting)"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["title", "TEXT", "NOT NULL", "Short expense description"], [2100, 1800, 1300, 4160]),
          makeDataRow(["notes", "TEXT", "", "Additional notes"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["expense_date", "DATE", "NOT NULL", "Date of the transaction"], [2100, 1800, 1300, 4160]),
          makeDataRow(["receipt_url", "TEXT", "", "Supabase Storage receipt image URL"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["ai_category_suggestion", "TEXT", "", "AI-suggested category name"], [2100, 1800, 1300, 4160]),
          makeDataRow(["ai_confidence", "NUMERIC(4,3)", "CHECK (0 <= ai_confidence <= 1)", "AI categorization confidence score"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["is_recurring", "BOOLEAN", "DEFAULT false", "Recurring expense flag"], [2100, 1800, 1300, 4160]),
          makeDataRow(["recurring_interval", "TEXT", "CHECK IN ('daily','weekly','monthly','yearly')", "Recurrence frequency"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["payment_method", "TEXT", "CHECK IN ('cash','card','upi','netbanking','other')", "Payment channel"], [2100, 1800, 1300, 4160]),
          makeDataRow(["tags", "TEXT[]", "", "Array of user-defined tags"], [2100, 1800, 1300, 4160], true),
          makeDataRow(["is_flagged", "BOOLEAN", "DEFAULT false", "Anomaly/suspicious flag"], [2100, 1800, 1300, 4160]),
          makeDataRow(["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Record creation time"], [2100, 1800, 1300, 4160], true),
        ]
      }),
      spacer(200),

      h2("4.7 Supporting Tables"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          makeHeaderRow(["Table", "Purpose"], [2600, 6760]),
          makeDataRow(["budgets", "Monthly/yearly budget targets per category, family, or overall"], [2600, 6760]),
          makeDataRow(["notifications", "In-app alerts for budget breaches, anomalies, summaries"], [2600, 6760], true),
          makeDataRow(["audit_logs", "Immutable log of all create/update/delete actions for compliance"], [2600, 6760]),
          makeDataRow(["exchange_rates", "Daily cached forex rates for multi-currency normalization"], [2600, 6760], true),
          makeDataRow(["workspace_members", "Maps users to shared workspaces with roles"], [2600, 6760]),
          makeDataRow(["family_members", "Maps users to family groups with roles"], [2600, 6760], true),
          makeDataRow(["family_invites", "Pending and completed family invitation records"], [2600, 6760]),
          makeDataRow(["receipts_ocr_cache", "Stores extracted OCR text from receipts to avoid re-processing"], [2600, 6760], true),
        ]
      }),

      pageBreak(),

      // ── 5. CORE FEATURES ──
      h1("5. Core Features"),
      spacer(80),

      sectionBadge("5.1 — Expense Management", BLUE_DARK),
      spacer(100),
      h3("Add / Edit / Delete Expenses"),
      bullet("Quick-add form with title, amount, date, category, payment method, and notes"),
      bullet("Bulk import via CSV upload with column mapping wizard"),
      bullet("Duplicate detection: warn when similar expense (same amount + date + category) is added within 24 hours"),
      bullet("Soft-delete with 30-day recovery from trash"),
      bullet("Inline editing from the expense list without navigating away"),
      spacer(140),

      sectionBadge("5.2 — Category Management", BLUE_MID),
      spacer(100),
      h3("Categorize Spending"),
      bullet("Default system categories: Food, Transport, Housing, Health, Entertainment, Shopping, Education, Utilities, Others"),
      bullet("Create custom categories with icon (emoji picker) and brand color"),
      bullet("Hierarchical sub-categories (e.g., Food > Restaurants, Food > Groceries)"),
      bullet("Per-category monthly budget limits with visual progress bars"),
      bullet("Merge categories: reassign all expenses from one category to another"),
      spacer(140),

      sectionBadge("5.3 — Monthly Summary & Reports", GREEN),
      spacer(100),
      h3("Reporting & Analytics"),
      bullet("Month-over-month spending comparison with percentage delta badges"),
      bullet("Category breakdown: doughnut chart + sortable table"),
      bullet("Daily spending heatmap calendar (like GitHub contributions)"),
      bullet("Top 5 spending categories for each month"),
      bullet("Average daily spend and projected end-of-month total"),
      bullet("Export reports as PDF or CSV with date range and category filters"),
      spacer(140),

      sectionBadge("5.4 — Filter & Search", ORANGE),
      spacer(100),
      h3("Advanced Filtering"),
      bullet("Filter by: category, date range, payment method, amount range, tags, recurring flag"),
      bullet("Full-text search across title, notes, and tags"),
      bullet("Save custom filter presets (e.g., 'Last month UPI transactions')"),
      bullet("URL-based filter state so searches can be bookmarked and shared"),
      bullet("Sort by: date, amount, category, payment method"),
      spacer(140),

      sectionBadge("5.5 — Family Expense Management", "0077B6"),
      spacer(100),
      h3("Connect Family & Track Combined Spending"),
      bullet("Create a family group with a name and optional combined monthly budget"),
      bullet("Invite family members via email or shareable invite link (expires in 7 days)"),
      bullet("Each connected member logs their own expenses tagged as personal or family"),
      bullet("Family dashboard shows total family spend for the month, remaining budget, and per-member breakdown"),
      bullet("Combined expense list displays all family expenses with member name attribution"),
      bullet("Category breakdown aggregates spending across all family members"),
      bullet("Family admin can remove members; members can leave the group voluntarily"),
      bullet("Budget alerts notify all family members at 50%, 80%, and 100% of the family limit"),
      bullet("Toggle between Personal and Family views on dashboard and expense screens"),

      pageBreak(),

      // ── 6. ADVANCED FEATURES ──
      h1("6. Advanced Features"),
      spacer(80),

      sectionBadge("6.1 — AI-Powered Categorization", "7B2FBE"),
      spacer(100),
      h2("How It Works"),
      para("When a user adds or edits an expense, the title and notes are sent to GPT-4o with a structured prompt. The model returns a suggested category and confidence score (0–1). If confidence is above 0.85, the category is auto-applied silently. Below 0.85, a suggestion pill is shown that the user can accept or dismiss with one click."),
      spacer(100),
      bullet("Model: OpenAI GPT-4o via secure Express.js proxy (API key never exposed to frontend)"),
      bullet("Context: The prompt includes the user's existing category names to ensure suggestions map to real categories"),
      bullet("Batch mode: when importing CSV, all rows are categorized in a single batched API call"),
      bullet("Feedback loop: user overrides are logged and used to periodically fine-tune system prompts"),
      bullet("Offline fallback: rule-based keyword matching if OpenAI API is unavailable"),
      spacer(140),

      sectionBadge("6.2 — Receipt Scanner (OCR)", "0077B6"),
      spacer(100),
      h2("Automated Receipt Extraction"),
      para("Users can upload a photo of a receipt (JPEG/PNG/PDF). The image is sent to the backend, processed via Tesseract.js OCR, and GPT-4o extracts structured fields including merchant name, total amount, date, line items, and category hint."),
      spacer(100),
      bullet("Drag-and-drop or camera capture on mobile browsers"),
      bullet("Supported formats: JPEG, PNG, HEIC, PDF (first page)"),
      bullet("Extracted data pre-fills the add-expense form — user reviews and confirms"),
      bullet("Raw OCR text and extracted JSON stored in receipts_ocr_cache for audit"),
      bullet("Confidence warnings shown when extraction is ambiguous"),
      spacer(140),

      sectionBadge("6.3 — Anomaly Detection", RED),
      spacer(100),
      h2("AI Anomaly & Fraud Detection"),
      para("A background job runs nightly and analyzes each user's expense history. Statistical baselines are computed per category per day-of-week. Expenses that deviate more than 2.5 standard deviations from the baseline are flagged."),
      spacer(100),
      bullet("Flagged expenses appear with a warning badge in the expense list"),
      bullet("Push notification + email alert sent immediately for anomalies above 3x the category average"),
      bullet("Monthly anomaly report included in summary email"),
      bullet("User can dismiss a flag with a reason (e.g., 'one-time purchase') — this teaches the model"),
      bullet("Duplicate transaction detection across close timestamps"),
      spacer(140),

      sectionBadge("6.4 — Smart Budget Alerts", ORANGE),
      spacer(100),
      h2("Proactive Budget Management"),
      bullet("Threshold alerts: notify when a category reaches 50%, 80%, and 100% of its monthly limit"),
      bullet("Predictive alert: if spending trend indicates budget will be exceeded before month-end, alert is sent mid-month"),
      bullet("Budget suggestions: AI recommends budget values based on 3-month average spend per category"),
      bullet("Overspend summary sent on the 1st of each month showing which categories were exceeded"),
      spacer(140),

      sectionBadge("6.5 — AI Financial Insights", GREEN),
      spacer(100),
      h2("Monthly AI Report"),
      para("On the last day of each month, the system generates a personalized insight report using GPT-4o. The report is available in-app and sent via email."),
      spacer(100),
      bullet("Natural-language summary: 'You spent 23% more on Food this month vs last month, mostly on weekends'"),
      bullet("Top saving opportunity: identifies the one category with most reduction potential"),
      bullet("Spending pattern insights: time-of-day, day-of-week, and week-of-month trends"),
      bullet("Year-to-date comparison if data is available"),

      pageBreak(),

      // ── 7. AUTH & SECURITY ──
      h1("7. Authentication & Security"),
      spacer(80),

      h2("7.1 Authentication Flow"),
      bullet("Email + password registration with mandatory email verification link"),
      bullet("OAuth2 social login: Google, GitHub"),
      bullet("Optional TOTP-based Multi-Factor Authentication (MFA) via authenticator app"),
      bullet("JWT access tokens (15 min TTL) + refresh tokens (7 days) stored in httpOnly cookies"),
      bullet("Session invalidation on password change or manual logout from all devices"),
      spacer(140),

      h2("7.2 Email Verification"),
      bullet("Registration sends a verification link valid for 24 hours"),
      bullet("Unverified accounts can browse the app but cannot create expenses (banner CTA shown)"),
      bullet("Resend verification with 60-second cooldown and 5 resends per day rate limit"),
      bullet("Verification status displayed in account settings with a badge"),
      spacer(140),

      h2("7.3 Data Security"),
      bullet("Supabase Row-Level Security (RLS) policies ensure users can only access their own data"),
      bullet("All API routes protected by Express middleware verifying Supabase JWT"),
      bullet("Receipt images stored in private Supabase Storage bucket (signed URLs, 1-hour expiry)"),
      bullet("HTTPS enforced everywhere; HSTS headers set"),
      bullet("Input validation with Zod on both frontend and backend"),
      bullet("Rate limiting: 100 requests/minute per IP on API; 10 receipt uploads/hour per user"),
      bullet("Audit log: every expense create/update/delete recorded with user_id, timestamp, and changed fields"),

      pageBreak(),

      // ── 8. API DESIGN ──
      h1("8. API Design (Express.js REST)"),
      spacer(80),
      infoBox("Base URL: https://api.expensetracker.app/v1  |  All endpoints require Authorization: Bearer <JWT> header except /auth/*"),
      spacer(160),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1400, 3200, 4760],
        rows: [
          makeHeaderRow(["Method", "Endpoint", "Description"], [1400, 3200, 4760]),
          // Auth
          makeDataRow(["POST", "/auth/register", "Register with email + password"], [1400, 3200, 4760]),
          makeDataRow(["POST", "/auth/login", "Login, returns JWT + refresh token"], [1400, 3200, 4760], true),
          makeDataRow(["POST", "/auth/verify-email", "Verify email with token"], [1400, 3200, 4760]),
          makeDataRow(["POST", "/auth/refresh", "Refresh JWT using refresh token"], [1400, 3200, 4760], true),
          makeDataRow(["POST", "/auth/logout", "Invalidate refresh token"], [1400, 3200, 4760]),
          // Expenses
          makeDataRow(["GET", "/expenses", "List expenses (pagination + filters)"], [1400, 3200, 4760], true),
          makeDataRow(["POST", "/expenses", "Create a new expense"], [1400, 3200, 4760]),
          makeDataRow(["GET", "/expenses/:id", "Get single expense detail"], [1400, 3200, 4760], true),
          makeDataRow(["PATCH", "/expenses/:id", "Update expense fields"], [1400, 3200, 4760]),
          makeDataRow(["DELETE", "/expenses/:id", "Soft-delete expense"], [1400, 3200, 4760], true),
          makeDataRow(["POST", "/expenses/bulk-import", "Import expenses from CSV"], [1400, 3200, 4760]),
          // Categories
          makeDataRow(["GET", "/categories", "List user's categories"], [1400, 3200, 4760], true),
          makeDataRow(["POST", "/categories", "Create custom category"], [1400, 3200, 4760]),
          makeDataRow(["PATCH", "/categories/:id", "Update category"], [1400, 3200, 4760], true),
          makeDataRow(["DELETE", "/categories/:id", "Delete (with reassign option)"], [1400, 3200, 4760]),
          // Analytics
          makeDataRow(["GET", "/analytics/monthly-summary", "Aggregated monthly stats"], [1400, 3200, 4760], true),
          makeDataRow(["GET", "/analytics/category-breakdown", "Spending by category"], [1400, 3200, 4760]),
          makeDataRow(["GET", "/analytics/trends", "Spending trends over N months"], [1400, 3200, 4760], true),
          makeDataRow(["GET", "/analytics/ai-insights", "GPT-generated monthly insight"], [1400, 3200, 4760]),
          // AI
          makeDataRow(["POST", "/ai/categorize", "AI categorize single expense text"], [1400, 3200, 4760], true),
          makeDataRow(["POST", "/ai/scan-receipt", "Upload receipt image, extract fields"], [1400, 3200, 4760]),
          // Reports
          makeDataRow(["GET", "/reports/export", "Export to PDF or CSV"], [1400, 3200, 4760], true),
          // Budget
          makeDataRow(["GET", "/budgets", "List user budgets"], [1400, 3200, 4760]),
          makeDataRow(["POST", "/budgets", "Set budget for category/month"], [1400, 3200, 4760], true),
          // Family
          makeDataRow(["POST", "/families", "Create a new family group"], [1400, 3200, 4760]),
          makeDataRow(["GET", "/families/:id", "Get family details and members"], [1400, 3200, 4760], true),
          makeDataRow(["POST", "/families/:id/invite", "Send family invite via email"], [1400, 3200, 4760]),
          makeDataRow(["POST", "/families/invites/:token/accept", "Accept a family invite"], [1400, 3200, 4760], true),
          makeDataRow(["DELETE", "/families/:id/members/:userId", "Remove a family member (admin only)"], [1400, 3200, 4760]),
          makeDataRow(["GET", "/families/:id/expenses", "List all family expenses from all members"], [1400, 3200, 4760], true),
          makeDataRow(["GET", "/families/:id/summary", "Total family spend, budget remaining, per-member totals"], [1400, 3200, 4760]),
        ]
      }),

      pageBreak(),

      // ── 9. FRONTEND PAGES ──
      h1("9. Frontend Pages & Components"),
      spacer(80),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 3000, 3760],
        rows: [
          makeHeaderRow(["Page / Route", "Key Components", "Primary Actions"], [2600, 3000, 3760]),
          makeDataRow(["/login, /register", "AuthForm, SocialOAuthButtons", "Sign in, Sign up, OAuth"], [2600, 3000, 3760]),
          makeDataRow(["/verify-email", "VerifyBanner, ResendButton", "Verify, Resend link"], [2600, 3000, 3760], true),
          makeDataRow(["/dashboard", "SummaryCards, SpendingChart, RecentExpenses", "Quick-add, View reports"], [2600, 3000, 3760]),
          makeDataRow(["/expenses", "ExpenseTable, FilterBar, SearchInput", "CRUD, Filter, Export"], [2600, 3000, 3760], true),
          makeDataRow(["/expenses/new", "ExpenseForm, ReceiptUploader, AIBadge", "Add expense, Scan receipt"], [2600, 3000, 3760]),
          makeDataRow(["/categories", "CategoryGrid, BudgetProgressBar", "Manage categories, Set budgets"], [2600, 3000, 3760], true),
          makeDataRow(["/reports", "MonthPicker, CategoryDonut, HeatmapCal", "View, Export PDF/CSV"], [2600, 3000, 3760]),
          makeDataRow(["/budgets", "BudgetCard, AlertToggle", "Set limits, Configure alerts"], [2600, 3000, 3760], true),
          makeDataRow(["/insights", "AIInsightCard, AnomalyList", "View AI analysis, Dismiss flags"], [2600, 3000, 3760]),
          makeDataRow(["/settings", "ProfileForm, MFASetup, CurrencyPicker", "Update profile, Enable MFA"], [2600, 3000, 3760], true),
          makeDataRow(["/family", "FamilyDashboard, MemberList, InviteForm, FamilyExpenseTable", "Create family, Invite members, View family total"], [2600, 3000, 3760]),
        ]
      }),
      spacer(200),

      h2("9.1 Design System"),
      bullet("Component library built on Tailwind CSS + shadcn/ui primitives"),
      bullet("Dark mode support via Tailwind's class-based dark mode strategy"),
      bullet("Responsive: Mobile-first, tested at 375px, 768px, 1280px breakpoints"),
      bullet("Accessibility: WCAG 2.1 AA — keyboard navigation, ARIA labels, color contrast ≥ 4.5:1"),
      bullet("Loading states: skeleton screens (not spinners) for all data-fetch operations"),
      bullet("Toast notifications for all CRUD actions and AI events"),

      pageBreak(),

      // ── 10. NON-FUNCTIONAL ──
      h1("10. Non-Functional Requirements"),
      spacer(80),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          makeHeaderRow(["Category", "Requirement"], [2600, 6760]),
          makeDataRow(["Performance", "Dashboard initial load < 2s (LCP). API p95 latency < 200ms. Charts render < 500ms for 12-month data."], [2600, 6760]),
          makeDataRow(["Scalability", "Architecture supports 10,000 concurrent users. Supabase connection pooling via PgBouncer."], [2600, 6760], true),
          makeDataRow(["Reliability", "99.9% uptime SLA. Supabase managed DB backups (daily, 30-day retention)."], [2600, 6760]),
          makeDataRow(["Security", "OWASP Top 10 compliance. Penetration test before v1 launch. Dependency audit monthly."], [2600, 6760], true),
          makeDataRow(["Compliance", "GDPR: data export and deletion on request within 30 days."], [2600, 6760]),
          makeDataRow(["Accessibility", "WCAG 2.1 AA. Screen-reader support for all core flows."], [2600, 6760], true),
          makeDataRow(["Internationalization", "INR default. Multi-currency display (USD, EUR, GBP, AED). Dates in dd/mm/yyyy for Indian locale."], [2600, 6760]),
          makeDataRow(["Browser Support", "Chrome 110+, Firefox 110+, Safari 16+, Edge 110+. Mobile: iOS Safari 16+, Android Chrome 110+."], [2600, 6760], true),
        ]
      }),

      pageBreak(),

      // ── 11. MILESTONES ──
      h1("11. Development Milestones"),
      spacer(80),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1100, 1800, 3660, 2800],
        rows: [
          makeHeaderRow(["Phase", "Sprint", "Deliverables", "Duration"], [1100, 1800, 3660, 2800]),
          makeDataRow(["1", "Sprint 1–2", "Auth (email + OAuth), User profile, DB schema, RLS policies", "2 weeks"], [1100, 1800, 3660, 2800]),
          makeDataRow(["2", "Sprint 3–4", "Expense CRUD, Category CRUD, Basic expense list + filters", "2 weeks"], [1100, 1800, 3660, 2800], true),
          makeDataRow(["3", "Sprint 5–6", "Monthly summary, Charts, Export CSV, Family groups + invites", "2 weeks"], [1100, 1800, 3660, 2800]),
          makeDataRow(["4", "Sprint 7–8", "Family expense logging, family totals dashboard, AI categorization, Receipt OCR", "2 weeks"], [1100, 1800, 3660, 2800], true),
          makeDataRow(["5", "Sprint 9–10", "Anomaly detection, Budget alerts, AI insights report", "2 weeks"], [1100, 1800, 3660, 2800]),
          makeDataRow(["6", "Sprint 11", "MFA, Audit log, GDPR export, Rate limiting, Security hardening", "1 week"], [1100, 1800, 3660, 2800], true),
          makeDataRow(["7", "Sprint 12", "Performance tuning, Accessibility audit, Dark mode, PWA", "1 week"], [1100, 1800, 3660, 2800]),
          makeDataRow(["GA", "Sprint 13", "QA, Pen test, Staging → Production deploy, Documentation", "1 week"], [1100, 1800, 3660, 2800], true),
        ]
      }),

      pageBreak(),

      // ── 12. RISKS ──
      h1("12. Risks & Mitigations"),
      spacer(80),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 1400, 4960],
        rows: [
          makeHeaderRow(["Risk", "Severity", "Mitigation"], [3000, 1400, 4960]),
          makeDataRow(["OpenAI API latency or outage", "High", "Rule-based categorization fallback; async processing with optimistic UI"], [3000, 1400, 4960]),
          makeDataRow(["OCR inaccuracy on blurry receipts", "Medium", "Confidence threshold UI; manual override always available"], [3000, 1400, 4960], true),
          makeDataRow(["Supabase RLS misconfiguration", "High", "Automated RLS policy tests in CI; quarterly security review"], [3000, 1400, 4960]),
          makeDataRow(["User data privacy breach", "High", "Encryption at rest, strict RLS, annual penetration testing"], [3000, 1400, 4960], true),
          makeDataRow(["Scope creep on AI features", "Medium", "Strict MVP gate; AI features behind feature flags for phased rollout"], [3000, 1400, 4960]),
          makeDataRow(["Exchange rate API downtime", "Low", "Cache daily rates in DB; fall back to cached rate with staleness banner"], [3000, 1400, 4960], true),
        ]
      }),

      spacer(300),

      // ── CLOSING ──
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({
          children: [new TableCell({
            borders: noBorders,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: BLUE_DARK, type: ShadingType.CLEAR },
            margins: { top: 300, bottom: 300, left: 400, right: 400 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Expense Tracker — PRD v1.0", font: "Arial", size: 26, bold: true, color: WHITE })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "This document is confidential and intended for internal development use only.", font: "Arial", size: 19, color: "8AAED4" })] }),
            ]
          })]
        })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/mnt/user-data/outputs/Expense_Tracker_PRD.docx", buf);
  console.log("Done");
});