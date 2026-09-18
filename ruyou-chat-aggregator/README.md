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

## AI

В окружении Amazi приложение использует OpenAI через Amazi AI Gateway и читает
серверные переменные `AMAZI_AI_GATEWAY_OPENAI_API_KEY` и
`AMAZI_AI_GATEWAY_OPENAI_BASE_URL`. Их значения не должны попадать в клиентский
код или логи. Для локального запуска без Gateway можно задать `AI_API_KEY` и
`AI_BASE_URL`; режим без внешнего API включается только явно через
`AI_PROVIDER=mock`.

Демо-сотрудник:

- email: `maria@ruyou.local`
- пароль: `password123`
