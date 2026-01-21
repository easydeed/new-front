# Cursor/Claude Code — Codebase Discovery Checklist

## Purpose

Before implementing new features (Transfer Tax AI, Notary Acknowledgment, QR Verification, API), we need to understand the existing codebase. This checklist ensures we write code that **fits** rather than fights your patterns.

---

## Quick Commands to Run

Copy and paste these into your terminal, then share the output:

### 1. Project Overview

```bash
# Project structure (top 2 levels)
echo "=== PROJECT STRUCTURE ===" && find . -maxdepth 3 -type d | grep -v node_modules | grep -v .git | grep -v .next | sort

# Package.json dependencies
echo "=== DEPENDENCIES ===" && cat package.json | grep -A 100 '"dependencies"' | head -50
```

### 2. Configuration Files

```bash
# Key configs
echo "=== NEXT CONFIG ===" && cat next.config.* 2>/dev/null || echo "No next config found"
echo "=== TSCONFIG ===" && cat tsconfig.json
echo "=== ENV EXAMPLE ===" && cat .env.example 2>/dev/null || cat .env.local.example 2>/dev/null || echo "No env example"
```

### 3. Database Schema

```bash
# Prisma schema (if using Prisma)
echo "=== PRISMA SCHEMA ===" && cat prisma/schema.prisma 2>/dev/null || echo "No Prisma schema"

# Or Drizzle
echo "=== DRIZZLE SCHEMA ===" && cat drizzle/schema.ts 2>/dev/null || echo "No Drizzle schema"

# Or raw SQL migrations
echo "=== MIGRATIONS ===" && ls -la migrations/ 2>/dev/null || ls -la db/migrations/ 2>/dev/null || echo "No migrations folder"
```

### 4. API Structure

```bash
# API routes
echo "=== API ROUTES ===" && find . -path "*/api/*" -name "*.ts" -o -path "*/api/*" -name "*.tsx" | grep -v node_modules | head -30

# Show one API route example
echo "=== SAMPLE API ROUTE ===" && cat $(find . -path "*/api/*" -name "route.ts" | head -1) 2>/dev/null || echo "No route.ts found"
```

### 5. Components Structure

```bash
# Component folders
echo "=== COMPONENTS ===" && ls -la components/ 2>/dev/null || ls -la src/components/ 2>/dev/null

# UI components
echo "=== UI COMPONENTS ===" && ls -la components/ui/ 2>/dev/null || ls -la src/components/ui/ 2>/dev/null
```

### 6. Existing Features

```bash
# Deed-related files
echo "=== DEED FILES ===" && find . -name "*deed*" -o -name "*Deed*" | grep -v node_modules | grep -v .next

# Property-related files
echo "=== PROPERTY FILES ===" && find . -name "*property*" -o -name "*Property*" | grep -v node_modules | grep -v .next

# PDF-related files
echo "=== PDF FILES ===" && find . -name "*pdf*" -o -name "*PDF*" | grep -v node_modules | grep -v .next
```

---

## Specific Questions

Please answer these (copy/paste responses):

### Authentication

```
1. What auth library do you use? (NextAuth, Clerk, Auth0, custom?)
   Answer: 

2. How do you get the current user in API routes?
   Example code: 

3. How do you protect API routes?
   Example code:
```

### Database

```
1. What database? (PostgreSQL, MySQL, MongoDB, Supabase?)
   Answer:

2. What ORM/client? (Prisma, Drizzle, Knex, raw SQL?)
   Answer:

3. How do you run queries in API routes?
   Example code:
```

### PDF Generation

```
1. What PDF library? (pdfkit, puppeteer, react-pdf, jspdf?)
   Answer:

2. Where's the PDF generation code?
   File path:

3. How/where are PDFs stored after generation?
   Answer:
```

### External Services

```
1. How do you call SiteX API?
   File path:
   Example code:

2. Any payment processing? (Stripe, etc.)
   Answer:

3. Email service? (SendGrid, Resend, etc.)
   Answer:

4. File storage? (S3, Cloudflare R2, Vercel Blob?)
   Answer:
```

### State Management

```
1. Global state library? (Zustand, Redux, Context?)
   Answer:

2. Form library? (React Hook Form, Formik, native?)
   Answer:

3. Data fetching? (SWR, React Query, fetch?)
   Answer:
```

### Deployment

```
1. Where is it deployed? (Vercel, AWS, Railway?)
   Answer:

2. How do you set environment variables?
   Answer:

3. CI/CD setup? (GitHub Actions, etc.)
   Answer:
```

---

## Files We'd Love to See

If you can share these specific files, it helps tremendously:

### Must Have

- [ ] `package.json` — Dependencies
- [ ] `tsconfig.json` — TypeScript config
- [ ] `prisma/schema.prisma` or equivalent — Database schema
- [ ] Any existing deed/document generation code
- [ ] Any existing API route example

### Nice to Have

- [ ] `.env.example` — Environment variable names
- [ ] Auth configuration file
- [ ] PDF generation code
- [ ] SiteX integration code
- [ ] Any existing form components

---

## What We'll Do With This

Once we have this information, we can:

1. **Match your patterns** — Write code that looks like your code
2. **Use your components** — Leverage existing UI elements
3. **Integrate with your data** — Proper database queries
4. **Respect your auth** — Secure new endpoints correctly
5. **Deploy smoothly** — No surprises in production

---

## Example Output Format

Here's what a good response looks like:

```
=== AUTH ===
We use NextAuth with Prisma adapter.
Here's how we get the current user:

// lib/auth.ts
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

=== DATABASE ===
PostgreSQL on Supabase, using Prisma.
Schema is in prisma/schema.prisma (attached)

=== PDF ===
Using react-pdf in /lib/pdf/generator.ts
PDFs stored in Vercel Blob

=== SITEX ===
Integration in /lib/sitex.ts
Uses fetch with API key from env
```

---

## Ready?

Run the commands above and share the output. The more context we have, the better the code we can write for DeedPro.
