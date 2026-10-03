# Deployment

## Before you deploy

- [ ] New `AUTH_SECRET` and `ENCRYPTION_KEY`, different from development
- [ ] `NEXT_PUBLIC_APP_URL` set to your real domain — webhook URLs are built from it
- [ ] Seeded passwords changed, or the seed not run at all in production
- [ ] `DEMO_MODE="false"` once real provider keys are configured
- [ ] Terms and Privacy placeholder pages replaced
- [ ] Payment gateway connected if you charge (see [payments.md](payments.md))
- [ ] Email provider connected for password resets (see [customization.md](customization.md))
- [ ] Database backups configured

---

## Vercel

1. Push the repository to GitHub and import it in Vercel.
2. Add every variable from `.env.example` under **Settings → Environment Variables**.
3. Set the build command to `npm run build` — it already runs `prisma generate`.
4. Deploy, then apply the migrations once against your production database:

```bash
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

Use a pooled connection string for serverless (Neon and Supabase both provide
one) so you do not exhaust database connections.

The in-memory rate limiter is per-instance. On serverless that means the limits
are looser than they look under load — swap `src/lib/rate-limit.ts` for Redis or
Upstash if you need them enforced globally. The `limit()` signature stays the same.

---

## Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
```

The `public/` folder ships empty (it holds a `.gitkeep`). Put your favicon,
logo and any other static files there — the Dockerfile above copies it.

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: agentflow
    volumes: ['pgdata:/var/lib/postgresql/data']

  app:
    build: .
    ports: ['3000:3000']
    depends_on: [db]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/agentflow?schema=public
      AUTH_SECRET: ${AUTH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      NEXT_PUBLIC_APP_URL: https://yourdomain.com
      DEMO_MODE: 'false'

volumes:
  pgdata:
```

Run the migration once after the first start:

```bash
docker compose exec app npx prisma migrate deploy
```

---

## VPS with PM2 and nginx

```bash
git clone <your-repo> /var/www/agentflow && cd /var/www/agentflow
npm ci
cp .env.example .env    # then edit it
npx prisma migrate deploy
npm run build
pm2 start npm --name agentflow -- run start
pm2 save && pm2 startup
```

nginx:

```nginx
server {
  listen 80;
  server_name yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

`X-Forwarded-For` matters — the rate limiter reads it to identify clients.

Add TLS with `certbot --nginx -d yourdomain.com`. The app sets HSTS, so serve
HTTPS before you point real traffic at it.

---

## Migrations in production

Always `migrate deploy`, never `migrate dev`:

```bash
npx prisma migrate deploy
```

`migrate dev` can reset the database. Back up before any migration that drops or
renames a column.

---

## After deploying

1. Sign in as the administrator and change the password.
2. Set your branding in **Admin → Settings**.
3. Check model prices in **Admin → AI Models** against current provider pricing.
4. Adjust plans and limits in **Admin → Plans**.
5. Add a provider key and press **Test Connection**.
6. Create an agent and send it a message.
7. Run an automation, then confirm it appears in the execution history.
8. Test a webhook trigger against the deployed URL.
