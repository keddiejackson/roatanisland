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

## Supabase setup

Create a `.env.local` file using `.env.example` as a starting point, then add
your Supabase project URL and anon key.

Add `SUPABASE_SERVICE_ROLE_KEY` in production if you want the server routes to
save bookings and vendor listings without browser-side RLS surprises. Keep this
value server-only and never prefix it with `NEXT_PUBLIC_`.

To receive email alerts for new booking requests and vendor listing submissions,
add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `ADMIN_NOTIFICATION_EMAIL`.
Submissions still save if email is not configured.

Stripe deposits are optional. To turn them on, add `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_DEPOSIT_AMOUNT_CENTS`, `NEXT_PUBLIC_SITE_URL`,
and set `NEXT_PUBLIC_STRIPE_DEPOSITS_ENABLED=true`. The webhook endpoint is
`/api/stripe/webhook`.

The admin login uses Supabase Auth email/password accounts. Create an admin user
in Supabase Auth, then run `supabase/schema.sql` in the Supabase SQL Editor.
Replace the example `your-admin@email.com` in that SQL file with your real admin
email before running it.

`NEXT_PUBLIC_ADMIN_EMAILS` is optional. You can use it as an extra app-side
allowlist, but the main admin permission is the `admin_users` table created by
the SQL setup.

For production, protect the `bookings` and admin-only `listings` operations with
Supabase Row Level Security policies. The provided SQL file enables RLS and adds
the baseline policies this app needs.

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
