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

## Invoices

Treasurers can open **Invoices** from the dashboard or Accounts. Choose Club or
Men's, enter the issuer/address/payment instructions and customer details, and add
up to 50 lines. Save and review the draft PDF, then issue it. Issuing assigns a
permanent `INV-MENS-2026-0001` / `INV-CLUB-2026-0001` number and locks the contents.
New invoices suggest issuer details from the latest invoice for that account and
can reuse previous customer details. Prices are GBP with no VAT calculation.
PDFs are downloaded for the Treasurer to send; no email is sent automatically.

Payments are allocated from existing money-in transactions in the same account.
Import or manually add the bank receipt first. Allocation supports part payments
and splitting one receipt across invoices without recording bank income twice.
Serialisable database transactions prevent over-allocation; request IDs prevent
repeated submissions recording a payment twice. Corrections retain an allocation
audit trail. Issued invoices can be voided with a reason once active allocations
are removed. Bank receipts with invoice history cannot be deleted, and receipts
with active allocations cannot be swapped to money out.

The additive invoice migration is applied by the existing deployment build
(`prisma migrate deploy`). Existing account balances and reports remain based on
bank transactions, not invoice issue dates. Live database migration and signed-in
payment allocation must be checked after deployment.

Calculation checks (Node 22.18+): `node --test tests/invoices.test.mjs`.


### Database migrations during deployment

The build runs `scripts/migrate-deploy.mjs` before generating Prisma Client and
building Next.js. Migrations use `DIRECT_URL` when configured. For Neon, if only
`DATABASE_URL` is configured, the script uses the same database and credentials
with the `-pooler` hostname suffix removed for the migration subprocess only.
The application continues to use its original pooled `DATABASE_URL`.

Prisma advisory locking remains enabled. A P1002 advisory-lock timeout is retried
up to three times, with ten seconds between attempts. Other migration errors fail
the build immediately. Persistent lock contention still fails the build; allow
other running migrations to finish before redeploying.
