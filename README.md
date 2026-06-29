# Loop

Loop is a Next.js app scaffolded with the App Router and TypeScript. It includes local PostgreSQL and Redis support.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open http://localhost:3000.

## Databases

Start PostgreSQL and Redis:

```bash
npm run db:up
```

Check connectivity from the app:

```bash
curl http://localhost:3000/api/health
```

Stop the services:

```bash
npm run db:down
```

Local environment defaults live in `.env.local`. Use `.env.example` as the template for other machines or deployments.

## Requirements

- Node.js 20.9 or newer
- npm
- Docker, for local PostgreSQL and Redis
