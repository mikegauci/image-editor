This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase keep-alive

Vercel calls `/api/cron/heartbeat` daily at 08:00 UTC, as configured in
`vercel.json`. Since this app uses Supabase Storage, each call lists at most one
entry in the existing `editor-exports` bucket to generate Supabase activity
without modifying files. The route is dynamic so each run performs a fresh
request. Existing storage permissions apply; an empty result is successful.
The endpoint returns only its status and timestamp, never file metadata.

Set a strong random `CRON_SECRET` in the Vercel project's Production environment
variables before deploying. Vercel automatically sends it as an
`Authorization: Bearer <CRON_SECRET>` header. Requests with a missing or incorrect
secret are rejected.

The endpoint uses the existing `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` variables. Cron jobs become active on a production
deployment. A failed storage request returns HTTP 500 and is logged in Vercel.
