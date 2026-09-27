# POSTGRESQL MIGRATION REPORT
  
## Summary
* Mode: DRY RUN
* Date: 2026-09-23T14:18:44.618Z

## Verification Table

| Entity | JSON Source Count | PG Dest Count | Diff | Status |
|---|---|---|---|---|
| users | 1 | 1 | 0 | DRY_RUN_PASS |
| organizations | 1 | 1 | 0 | DRY_RUN_PASS |
| organizationMembers | 0 | 0 | 0 | DRY_RUN_PASS |
| energyProjects | 1 | 1 | 0 | DRY_RUN_PASS |
| projectMembers | 0 | 0 | 0 | DRY_RUN_PASS |
| portfolios | 1 | 1 | 0 | DRY_RUN_PASS |
| energyAssets | 1 | 1 | 0 | DRY_RUN_PASS |
| assetComponents | 0 | 0 | 0 | DRY_RUN_PASS |
| telemetrySources | 0 | 0 | 0 | DRY_RUN_PASS |
| telemetryReadings | 0 | 0 | 0 | DRY_RUN_PASS |
| projectContracts | 1 | 1 | 0 | DRY_RUN_PASS |
| financingRequests | 1 | 1 | 0 | DRY_RUN_PASS |
| financingOffers | 0 | 0 | 0 | DRY_RUN_PASS |
| procurementPackages | 0 | 0 | 0 | DRY_RUN_PASS |
| purchaseOrders | 0 | 0 | 0 | DRY_RUN_PASS |

## Notes
* Original db.json was preserved completely unchanged.
* Missing/null values were properly inserted as NULL without fallback values.
* Relational dependencies were inserted in strict topological order (e.g., Users -> Orgs -> Projects).
