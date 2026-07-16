# Migration notes

`20260716170000_sole_proprietorship_shipentegra_operations` is additive. It creates business, roles, formation, banking, expense, asset, material, production, payout, sales-document, ShipEntegra, customs, tax, SGK, and accountant-period tables. It adds `ARCHIVED` to the operating-mode enum and optional relations to existing tables.

The migration backfills the confirmed business profile and Hamit/Selda roles. It does not update or delete admin sessions, Etsy tokens/imports, products, fees, exchange rates, orders, snapshots, documents, or goals. Apply with `npm run db:deploy` after backup; never use `db push` or reset.

Rollback requires stopping writes, exporting new metadata, and dropping new constraints/tables in reverse dependency order. Private Blob objects require a separate archive decision.
