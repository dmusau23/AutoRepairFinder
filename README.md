# Auto Repair Finder

A responsive React/Next.js auto-repair marketplace backed by SQLite.

## Core workflow

### Customer
- Create an account and manage vehicles.
- Post a repair request.
- Shops with profiles receive a notification when a new request is posted.
- Track each request through **Request posted → Quotes received → Quote accepted**.
- Review quotes with price, timing, estimate, and warranty information.
- Accept or decline individual quotes.
- Accepting one quote automatically declines the other pending quotes for that request.
- Receive an in-app notification when a shop sends a quote.
- Browse and save repair shops.

### Shop
- Create a shop account and profile.
- See a dashboard with new jobs, quotes sent, quotes awaiting customer response, and accepted quote value.
- Review incoming customer repair requests.
- Send a quote with price, estimate, timing, and warranty details.
- Receive notifications when a customer accepts or declines a quote.
- Manage submitted quotes.

## Stack

- Next.js 16 + React 19
- Tailwind CSS v4
- SQLite via `better-sqlite3`
- TypeScript
- Lucide icons

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If `better-sqlite3` needs to compile on macOS, make sure the Xcode Command Line Tools are installed and the Xcode license has been accepted:

```bash
sudo xcodebuild -license
```

## Database

SQLite is created automatically at:

```text
data/autorepair.db
```

The schema is initialized automatically when the server starts.

## Notes

Notifications are persisted in SQLite and displayed from the dashboard notification bell. The current implementation is intentionally local/demo-friendly; production deployments should move the database to a persistent server-side SQLite volume or another production database and add authorization/audit requirements appropriate for deployment.
