import Link from "next/link";

export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="academy-eyebrow">Скоро</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
      <div className="mt-8 rounded-[22px] border border-dashed border-border bg-surface p-6 shadow-[var(--academy-panel-shadow)]">
        <p className="text-sm font-medium text-ink">Раздел подготовлен</p>
        <p className="mt-1 text-sm text-muted">
          Бизнес-логика появится на следующем этапе. Сейчас можно работать во входящих, клиентах и
          заявках.
        </p>
        <Link
          href="/inbox"
          className="mt-4 inline-flex text-sm font-medium text-accent hover:text-accent-hover"
        >
          Перейти в обращения
        </Link>
      </div>
    </div>
  );
}
