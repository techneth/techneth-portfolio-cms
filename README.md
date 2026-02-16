# Techneth Admin Panel

A comprehensive admin panel for managing the Techneth website built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Authentication**: Secure login with Supabase Auth
- **Role-Based Access Control**: Three user roles (Super Admin, Admin, Editor)
- **Dashboard**: Stats, analytics, and recent activity feed
- **Blog Management**: Full CRUD with Markdown editor
- **Case Studies**: Portfolio management with SEO
- **Contact Submissions**: Track and manage form submissions
- **Activity Logs**: Comprehensive audit trail
- **Settings**: System configuration and maintenance mode

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase**:
   - Create a project at [supabase.com](https://supabase.com)
   - Run `supabase_schema.sql` in the Supabase SQL Editor
   - Get your credentials from Project Settings > API

3. **Configure environment**:
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase URL and keys

4. **Create admin user**:
   - Create a user in Supabase Auth
   - Add them to the `users` table with `role='super_admin'`

5. **Run the app**:
   ```bash
   npm run dev
   ```

6. **Login**: Visit [http://localhost:3000/login](http://localhost:3000/login)

## User Roles

- **Super Admin**: Full access including users and settings
- **Admin**: Manage all content, view logs (no user management)
- **Editor**: Create/edit own content only

## Key Features

### Markdown Editor
- Live preview with toolbar
- Paste from Word/Docs
- Image embedding
- Autosave

### Activity Logging
Every action is logged with:
- User and role
- Action type
- Resource affected
- Before/after changes
- Timestamp

### Role-Based Permissions
Fine-grained access control for each resource and action.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS (Techneth theme)
- Supabase (Auth + Database)
- SimpleMDE (Markdown editor)
- Lucide icons

## Project Structure

```
app/admin/          # Admin pages
├── blogs/          # Blog management
├── case-studies/   # Case studies
├── contacts/       # Submissions
├── logs/           # Activity logs
└── settings/       # Settings
components/admin/   # Reusable components
lib/                # Utilities
└── supabase/       # DB config
```

## Development

```bash
npm run dev    # Start dev server
npm run build  # Build for production
npm start      # Start production server
```

## Documentation

- Database schema: `supabase_schema.sql`
- Implementation plan: See artifacts
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)

---

Built for Techneth with Techneth design system (teal #4AB3A5)
