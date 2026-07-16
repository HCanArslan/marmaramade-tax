# Private document storage

Create a private Vercel Blob store and add its server-only `BLOB_READ_WRITE_TOKEN` to local and Vercel environments. `DOCUMENT_MAX_SIZE_MB` defaults to 25.

Uploads require the administrator session. The server rejects dangerous extensions, unapproved MIME types, mismatched file signatures, oversized/empty files, and duplicate SHA-256 checksums. Blob paths contain only a year, UUID, and safe extension—never customer identity, receipt IDs, tax IDs, or original filenames. PostgreSQL stores metadata; binaries stay in Blob.

Downloads use `/api/documents/[id]`, recheck authorization, fetch the private object with the server token, and return `private, no-store`. Verification and deletion are audited. Archive is a soft delete; permanent deletion requires the exact confirmation phrase and an already archived record.

Back up metadata with PostgreSQL and use Blob retention/versioning appropriate to the business. Exports must omit Blob tokens and direct private URLs.
