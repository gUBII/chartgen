# Operations Runbook

## 1) Relevant Processes and Ports

### Check active app/database processes
```bash
ps aux | rg -i "next dev|next start|node .*next|turbopack" | rg -v rg
lsof -nP -iTCP -sTCP:LISTEN | rg "3000|3001|4000|5432"
brew services list | rg -i "postgres|mysql"
```

### Close all app server processes (fresh start)
```bash
pkill -f "/Users/moofasa/chartgen/node_modules/.bin/next dev" || true
pkill -f "next start -p 4000" || true
```

## 2) Fresh Build Procedure

```bash
cd /Users/moofasa/chartgen
npm run build
```

## 3) Fresh Runtime Procedure

```bash
cd /Users/moofasa/chartgen
npm run dev
```

## 4) Database Health Checks

```bash
brew services list | rg postgresql@16
cd /Users/moofasa/chartgen && npx prisma migrate status
cd /Users/moofasa/chartgen && npx prisma db seed
```

## 5) Common Errors and Fixes

### Error: `Can't reach database server at localhost:5432`
- Cause: PostgreSQL service is down or `.env` is wrong.
- Fix:
  1. `brew services start postgresql@16`
  2. Verify `.env` `DATABASE_URL`
  3. Re-run `npx prisma migrate status`

### Error: `DATABASE_UNAVAILABLE` from preview/commit
- Cause: Prisma client cannot connect to DB.
- Fix:
  1. Confirm DB port listening on `5432`
  2. Restart dev server after `.env` changes

### Error: no preview data after generate
- Cause: missing seed records.
- Fix:
  1. `npx prisma db seed`
  2. Use seeded IDs in UI.

## 6) Test IDs (Current Local)

- Participant ID: `112334`
- Supervisor Staff ID: `32213`
