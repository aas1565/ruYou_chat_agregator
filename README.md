# Ruyou — агрегатор чатов и CRM

MVP первого дня: единый inbox, карточка клиента, заявки и авторизация сотрудников.

## Стек

- Next.js 15 (App Router) + TypeScript
- Prisma + SQLite
- Tailwind CSS 4
- Zod, bcryptjs, session cookies

## Запуск

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

Демо-сотрудник:

- email: `maria@ruyou.local`
- пароль: `password123`
