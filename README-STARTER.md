# Golf Club Finance - Phase 1 Starter

## Workflow

1. Section user creates a payout request or competition.
2. Treasurer reviews and approves/rejects.
3. Approved requests appear in the top-up queue.
4. Top-up administrator marks the account top-up as paid.
5. Paid requests remain immutable in history; corrections should be cancelled/reopened with an audit reason.

## Roles

- SECTION_USER: can create and view requests for assigned section(s).
- TREASURER: can review all requests and approve/reject them.
- TOPUP_ADMIN: can see approved requests and mark them paid.
- ADMIN: full access/configuration.

## Initial screens

- `/` Dashboard: Requested / Awaiting top-up / Completed this month.
- `/requests/new`: simple request (players x fee or manual gross amount).
- `/competitions/new`: Men's/Juniors competition entry.
- `/treasurer`: Treasurer approval queue.
- `/top-ups`: approved requests awaiting account top-up.
- `/history`: completed/cancelled/rejected audit history.
- `/admin/sections`: section fee/account settings.
- `/admin/competition-rules`: Men's/Juniors competition rules.

## Key rule

The 4% fee is stored on every request as a snapshot, rather than calculated from a global setting every time. This means changing the rate later will not alter historical payouts.

## Men's rules currently represented

- Standard entry fee £5.
- 75% prize fund / 25% Men's section share.
- 4% fee on main competition receipts.
- Birdie 2's £1 per entrant and 4% fee deducted from the Men's top-up.
- Division/prize logic is represented in `lib/payoutCalculator.ts`.
- Committee overrides should be stored with an override reason rather than changing historical rules.

## Next implementation step

Create a Next.js project, add Prisma/Postgres, copy these files in, migrate the database, then build the four workflow screens: request, Treasurer approval, top-up confirmation and history.

Deployment refreshed after resolving the production migration state on 5 September 2026.
