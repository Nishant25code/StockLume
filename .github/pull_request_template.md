## What does this PR do?

<!-- One or two sentences. -->

**Module:** <!-- Member 1 Auth/Products · Member 2 Inventory · Member 3 Orders · Member 4 Analytics · Shared -->
**Flow step(s):** <!-- e.g. 10. Retailer Confirmation -->

## Changes

- 

## How to test

1. 

## Checklist

- [ ] `npm run lint` and `npm run build:web` pass
- [ ] Endpoints use `sendSuccess` / `ApiError` and parameterized SQL scoped to `req.user.businessId`
- [ ] Tested the error cases (bad input, wrong role, another business's data)
- [ ] `docs/API.md` endpoint status updated (🔜 → ✅)
- [ ] Contains a migration? → new file only, `docs/DATABASE.md` updated, "contains migration" in the title
- [ ] No `.env` files or secrets in the diff
