FROM node:22-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:./dev.db \
    AI_PROVIDER=openai \
    PORT=10000

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Prisma resolves file:./dev.db relative to /app/prisma. Amazi production runs
# as UID/GID 65532, so the directory must be writable by that runtime user.
RUN chown 65532:65532 /app/prisma && chmod 775 /app/prisma

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

EXPOSE 10000

VOLUME ["/app/prisma"]

CMD ["sh", "-c", "if [ ! -f prisma/dev.db ]; then npx prisma db push --skip-generate && npm run db:seed; else npx prisma db push --skip-generate; fi && npm run start"]
