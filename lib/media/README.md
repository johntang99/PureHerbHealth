# Media Storage Standard (pureherbhealth)

- Bucket: `media` (Supabase Storage)
- Metadata table: `public.media_assets`
- Path convention: `<siteId>/<folder>/<timestamp-filename>`
- `media_assets.path` stores path relative to `<siteId>/`
- `media_assets.url` stores public URL

## APIs

- `POST /api/admin/media/upload` (multipart form: `file`, optional `siteId`, `folder`, `altText`)
- `GET /api/admin/media/list?siteId=...`
- `DELETE /api/admin/media/file?siteId=...&path=...`

This mirrors the medical-template pattern used in `chinese-medicine`.
