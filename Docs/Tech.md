# Architecture & Technical Specification Document
## Omnichannel Full-Stack Application

**Tech Stack:** React | React Native | Tailwind CSS | Express.js | TypeScript | Supabase

**Document Version:** 1.0  
**Status:** Approved for Development  
**Confidentiality:** Internal Use Only  

---

## 1. Executive Summary
This document outlines the technical architecture, design patterns, and integration strategies for a modern, cross-platform application. The chosen technology stack leverages unified JavaScript/TypeScript ecosystems for both the frontend (React, React Native) and backend (Express.js), supported by a robust, scalable Backend-as-a-Service and PostgreSQL database layer (Supabase).

> **Strategic Advantage:** By utilizing TypeScript across the entire stack, we ensure end-to-end type safety, reducing runtime errors and improving developer velocity. Shared types can be utilized across the React Web App, React Native Mobile App, and the Express backend.

## 2. System Architecture
The system follows a decoupled, service-oriented architecture. While Supabase provides native data access, the Express.js middleware server acts as an orchestrator for custom business logic, third-party integrations, and protected operations.

### High-Level Data Flow
1. **Clients (React / React Native):** Users interact with the web or mobile UI. Authentication is handled directly via the Supabase Client SDK.
2. **Direct Database Access (Optional):** For simple CRUD operations, clients securely query Supabase directly using Row Level Security (RLS).
3. **Custom API Layer (Express.js):** For complex logic (e.g., payment processing, heavy compute, sending emails), clients call the Express REST API, passing their Supabase JWT for authorization.
4. **Database Layer (Supabase):** Stores all relational data (PostgreSQL), user identities, and manages Row Level Security.

## 3. Technology Stack Detail

| Domain | Technology | Purpose / Justification |
| :--- | :--- | :--- |
| **Web Frontend** | React (Vite) + TypeScript | Fast, component-driven UI. Vite provides rapid HMR. |
| **Mobile Frontend** | React Native (Expo) + TS | Cross-platform iOS and Android deployment from a single codebase. |
| **Styling** | Tailwind CSS / NativeWind | Utility-first CSS. NativeWind bridges Tailwind styles to React Native components. |
| **Backend Server** | Node.js, Express.js, TypeScript | Handles custom business logic, webhooks, and secure server-to-server integrations. |
| **Database & Auth** | Supabase (PostgreSQL) | Managed Postgres, built-in Auth (Email, OAuth, Magic Links), and strict RLS. |

## 4. Authentication & Security Flow
Authentication is centrally managed by Supabase Auth, generating JWTs that secure both direct database queries and Express.js API endpoints.

### Client-Side Authentication (React/React Native)
The client uses the `@supabase/supabase-js` library to authenticate the user. Upon success, Supabase stores the session locally and returns an Access Token (JWT).

```typescript
import { supabase } from './supabaseClient';

// Login example
const { data, error } = await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'securePassword123'
});

// Get the token to send to Express API
const { data: { session } } = await supabase.auth.getSession();
const jwt = session.access_token;
```

### Backend Authorization (Express.js)
When the client makes a request to the Express API, it includes the JWT in the `Authorization` header. Express uses middleware to verify this token with Supabase before executing the route.

```typescript
import express, { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Middleware to protect routes
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
    
    // Attach user to request for downstream handlers
    req.user = user; 
    next();
};

app.post('/api/premium-feature', requireAuth, (req, res) => {
    // Logic runs only if authenticated
    res.json({ success: true, message: `Hello user ${req.user.id}` });
});
```

## 5. Database Design & Supabase Configuration
Supabase utilizes PostgreSQL. All tables holding user data must enforce **Row Level Security (RLS)** to guarantee that users can only access their own data, even if the database is queried directly from the frontend.

### Example: User Profiles Schema
While Supabase manages authentication in the `auth.users` table, it is standard practice to create a public `profiles` table linked by a foreign key.

```sql
-- Create a table for public profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text
);

-- Turn on RLS
alter table public.profiles enable row level security;

-- Policy: Users can view their own profile
create policy "Users can view own profile."
  on profiles for select
  using ( auth.uid() = id );

-- Policy: Users can update their own profile
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );
```

## 6. Directory Structure Best Practices
To maintain code quality across three interconnected projects, a monorepo approach (using tools like Turborepo or Yarn Workspaces) is highly recommended. This allows the sharing of TypeScript interfaces and utility functions.

```text
project-root/
├── apps/
│   ├── web/             # React (Vite), Tailwind config
│   ├── mobile/          # React Native (Expo), NativeWind config
│   └── api/             # Express.js, TypeScript backend
├── packages/
│   ├── shared-types/    # TS Interfaces (e.g., UserProfile, APIResponses)
│   ├── ui-components/   # Shared generic UI logic
│   └── eslint-config/   # Unified linting rules
├── package.json
└── supabase/
    ├── migrations/      # DB Schema migrations
    └── config.toml      # Local Supabase configuration
```

> **Deployment Strategy:**
> *   **Web App:** Deploy via Vercel or Netlify for edge-caching and global CDN.
> *   **Mobile App:** Compile and distribute using Expo Application Services (EAS) for OTA updates and App Store submissions.
> *   **Express Backend:** Deploy to Render, Railway, or AWS Elastic Beanstalk as a Node.js container.
> *   **Database:** Managed via Supabase Cloud platform.