# Journal platform (Next.js + Supabase)

Academic journal website in **Uzbek, Russian and English**, with public site, author/reviewer panel and admin panel.

## Design

The site uses a Three.js particle scene behind every page (star on the home page, book on articles,
stack on the archive, globe on the editorial board), dark/light themes and Unbounded + Manrope fonts.
`design-demo/index.html` (also served at `/demo`) is the same design as a single self-contained file.

Also included: a rich text editor for pages, news and conferences; sitemap.xml, robots.txt, hreflang
links, share images and ordered Google Scholar tags; review scores, a plagiarism similarity field and
printable publication/reviewer certificates; a Conferences section with proceedings.

Admin extras: **Settings** (logo, journal name, ISSN, indexing databases, call for papers),
**Editorial board** and **News** editors, charts on the overview page, and a notifications bell for
authors, reviewers and editors.

## Stack
- Next.js 16 (App Router, TypeScript), Tailwind CSS 4
- next-intl — `/uz`, `/ru`, `/en` URLs; interface text in `messages/*.json`
- Supabase — Postgres, Auth, Storage, Row Level Security

## Try it right now (demo mode — no Supabase needed)

```bash
npm install
npm run dev        # open http://localhost:3000
```

With no Supabase keys set, the site runs on built-in **sample data** (`src/lib/demo/`): issues, articles,
editorial board, pages, and submissions at every workflow stage. On the login page there are one-click
**demo accounts**:

| Account | What you can try |
|---|---|
| `admin@demo.uz` | Admin panel: submissions, decisions, assigning reviewers, publishing, issues, users, pages |
| `author@demo.uz` | Author panel: submit a paper, see reviewer comments, upload a revision |
| `reviewer@demo.uz` | Reviewer: accept an invitation, write a review |

A yellow banner shows the site is in demo mode. Changes are kept in memory and reset on restart.

## Deploy to Vercel (free)

1. Push this folder to a GitHub repository.
2. On vercel.com → **Add New → Project** → import the repository → **Deploy** (no settings needed).
3. You get a live link like `https://your-journal.vercel.app`, running in demo mode.

> On Vercel, demo changes (e.g. a test submission) may disappear between page loads, because each request
> can hit a fresh server. That is expected in demo mode; with Supabase everything is saved.

## Connect Supabase (go live)

1. **Create a Supabase project** at supabase.com.
2. **Run the SQL** in Supabase → SQL Editor, in this order:
   - `supabase/migrations/20261110000000_init.sql` (tables, security rules, storage buckets)
   - `supabase/seed.sql` (starter journal, sections, pages, one example article — edit freely)
   - `supabase/migrations/20261114000000_design_features.sql` (journal settings, editorial board groups, news, notifications)
   - `supabase/migrations/20261114010000_editorial_tools.sql` (review scores, plagiarism similarity check)
   - `supabase/migrations/20261114020000_conferences.sql` (conferences and their proceedings)
   - `supabase/migrations/20261114030000_reader_tools.sql` (full text of article PDFs in search)
   - `supabase/migrations/20261114040000_admin_tools.sql` (change log, editable email templates)
   - `supabase/migrations/20261118000000_publication_types.sql` (journal / local / international conference types, issue PDFs, board degrees, "For authors" samples)
   - `supabase/migrations/20261118010000_harden_functions.sql` (security hardening)
   - `supabase/migrations/20261118020000_pending_roles.sql` (give a role to an email before that person registers)
   - `supabase/migrations/20261118030000_email_log.sql` (log of journal emails)
   - `supabase/migrations/20261118040000_submitted_at_for_staff.sql` (submission date also for staff)
   - `supabase/migrations/20261121000000_doi_issn_indexing.sql` (DOI prefix and status, Crossref deposit log)
3. **Environment variables**: in Vercel → Project → Settings → Environment Variables (or `.env.local` locally) set
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Supabase → Project Settings → API,
   then redeploy. The demo banner disappears and the site uses the real database.
4. **Auth settings** (Supabase → Authentication → URL Configuration): set Site URL to your domain and add
   `http://localhost:3000/api/auth/callback` and `https://YOUR-DOMAIN/api/auth/callback` to Redirect URLs.
5. **Make yourself admin**: register on the site, then in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

## Roles
| Role | Can do |
|---|---|
| Guest | Read issues and articles, download PDFs, search |
| User (author) | Submit manuscripts, track status, see reviewer comments, upload revisions, withdraw |
| Reviewer (`is_reviewer`) | Accept/decline invitations, download manuscript, submit review (authors' names hidden) |
| Editor | Everything in the admin panel except user roles |
| Admin | Everything, including user roles |

## Workflow
`draft → submitted → desk_review → under_review → revision_required ⇄ submitted → accepted → published`
(or `rejected` / `withdrawn`). Every status change is logged to `submission_events` automatically.

Assigning a reviewer moves the submission to *under review*. Publishing an accepted submission creates an
`articles` row (with the final PDF) in the chosen issue. Articles in a draft issue stay *scheduled* and go live
when the issue is published.

## Security (enforced in the database, not just the UI)
- Users cannot change their own role.
- Authors can only edit while the submission is a draft or needs revision, and can only move it to *submitted* or *withdrawn*.
- Reviewers see only their own assignments; authors get reviewer comments through `reviews_for_author()` without reviewer identity.
- Manuscripts are in a private bucket (`manuscripts/<submission_id>/…`) and are served with 1-hour signed links.
- Final PDFs (`articles` bucket) and covers are public.

## Languages
- Interface text: `messages/uz.json`, `ru.json`, `en.json`.
- Content edited in the admin panel (pages, issue titles, editorial board, journal info) is stored as
  `{"uz": "...", "ru": "...", "en": "..."}`; missing translations fall back to Uzbek.
- Articles keep their original language, with optional translated titles/abstracts.

## Indexing, DOI and ISSN
Admin → **Indexing, DOI & ISSN** shows what is set up and what is left.

- **Google Scholar**: every article page has Highwire `citation_*` tags (plus Dublin Core `DC.*` and schema.org JSON-LD);
  the PDF is served at `/{locale}/article/{id}/full-text.pdf`, beside its abstract page. Only valid ISSNs and DOIs are output.
- **OAI-PMH** at `/oai` (Dublin Core, sets `journal` and `conference`) for BASE, CORE, OpenAIRE and other harvesters.
- **ISSN**: typed in Settings (online and print), checked by its check digit, shown in the footer, home page, Scholar tags and Crossref.
- **DOI (Crossref)**: type the prefix (10.xxxxx) in Settings. New articles then get `prefix/YEAR.first-8-chars-of-id`
  when published, and are registered with Crossref (schema 5.3.1; journal articles, and conference theses as conference papers).
  Editing a registered article sends the new details again. Environment variables (Vercel, type Secret):

  | Variable | |
  |---|---|
  | `CROSSREF_USERNAME`, `CROSSREF_PASSWORD` | Crossref login (`email/role` for personal accounts) |
  | `CROSSREF_TEST=1` | optional: send to test.crossref.org instead |
  | `CROSSREF_EMAIL` | optional: depositor email when the journal has no contact email |

  A daily job (`/api/cron/crossref`, needs `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`) reads Crossref's results.
  Without a login, the page offers the deposit XML to upload by hand.

## Project layout
```
src/app/[locale]/            public pages (home, archives, issue, article, board, p/[slug], search)
src/app/[locale]/(auth)/     login, register
src/app/[locale]/dashboard/  author + reviewer panel
src/app/[locale]/admin/      admin panel (submissions, issues, articles, pages, users)
src/app/api/                 auth callback, PDF download counter
src/proxy.ts                 language routing + session refresh + route protection
src/lib/demo/                demo mode: sample data + in-memory stand-in for Supabase
supabase/                    SQL migration and seed
messages/                    translations
```

## Next phases
- Email notifications (Supabase Edge Function + Resend) on submission, reviewer invite, decision
- Payments: Click / Payme (publication fee) — `payments` table is ready
- Editorial board and journal settings editors in admin (currently edit in Supabase Table Editor)
- Rich-text editor (Tiptap) for pages instead of raw HTML
- sitemap.xml, OAI-PMH endpoint, Crossref DOI XML export
- PDF certificate of publication for authors
- `npx supabase gen types typescript` for fully typed queries
