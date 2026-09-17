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
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
      <div className="mt-8 rounded-xl border border-dashed border-border bg-white p-6">
        <p className="text-sm font-medium">Раздел подготовлен</p>
        <p className="mt-1 text-sm text-muted">
          Бизнес-логика появится на следующем этапе. Сейчас можно работать во входящих, клиентах и заявках.
        </p>
        <Link href="/inbox" className="mt-4 inline-flex text-sm font-medium text-accent hover:text-accent-hover">
          Перейти во входящие
        </Link>
      </div>
    </div>
  );
}
