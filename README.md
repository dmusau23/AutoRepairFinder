# Auto Repair Finder

Auto Repair Finder is a web marketplace for connecting vehicle owners with local repair shops. Customers can describe a repair, review shop quotes, and coordinate an appointment. Shops can find repair opportunities, submit quotes, and manage accepted work.

## Product capabilities

### Customer workspace

- Maintain vehicle information and submit repair requests with service details and preferred timing.
- Track a request from submission through quotes, appointment scheduling, and repair completion.
- Compare shop quotes by price, estimate, timing, warranty, and shop rating.
- Save private notes on quotes, then accept or decline pending offers. Accepting an offer declines the other pending offers for that request.
- Browse shop profiles and save shops for future reference.
- Confirm scheduled appointments or contact the shop to request a different time or cancellation.
- Contact shops by phone or email when those details are available, and export an appointment as an `.ics` calendar file.
- Receive request, quote, and appointment updates in the in-app notification center.

### Shop workspace

- Create and maintain a shop profile.
- Browse open repair requests and filter by the customer's requested timing.
- Submit quotes with pricing, estimate, timing, and warranty details.
- Track pending, accepted, and declined quotes.
- Schedule and reschedule accepted repairs, provide appointment notes, and mark work as complete or cancelled.
- Review customer appointment confirmations and requests to reschedule or cancel.
- Receive in-app notifications about requests, quote decisions, and appointment activity.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- SQLite through `better-sqlite3`
- Lucide icons

## Requirements

- Node.js 20.9 or later
- npm
- On macOS, Xcode Command Line Tools if `better-sqlite3` needs to be compiled locally

## Getting started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and create a customer or shop account.

To build and run the production application:

```bash
npm run build
npm run start
```

If installing `better-sqlite3` on macOS requires native compilation, install the Command Line Tools and accept the Xcode license:

```bash
xcode-select --install
sudo xcodebuild -license
```

## Data and persistence

The application creates its SQLite database at `data/autorepair.db` and initializes the schema when the server starts. If no shop profiles exist, sample profiles are added for local development.

Accounts, sessions, vehicles, repair requests, quotes, appointments, saved shops, and notifications are stored in SQLite. The database directory must be writable and persist across application restarts. For a production deployment, configure persistent storage and backups, and choose a database architecture appropriate for expected traffic and availability requirements.

## Repository structure

```text
app/                 Application pages and API routes
components/          Customer, shop, and shared interface components
lib/auth.ts          Account authentication and session helpers
lib/db/index.ts      SQLite connection and schema initialization
public/              Static assets
```

## Scope and deployment considerations

Notifications are currently delivered in the application; email and SMS delivery are not implemented. Appointment calendar export produces an `.ics` file. Shop ratings and review counts are profile data; customers cannot submit reviews through the current application.

Before deploying publicly, review authentication and authorization, privacy and data retention, database backups, monitoring, and the operational requirements of the selected hosting environment.
