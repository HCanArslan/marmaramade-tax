import Link from "next/link";

export function SaasPlaceholderPage({
  eyebrow = "Prompt 1 foundation",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
          {description}
        </p>
      </header>
      <section className="card p-6">
        <h2 className="font-semibold">Shell established</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Data, tenancy, billing, and workflow behavior will be implemented only
          in their dedicated reviewed phases. Existing financial formulas are
          not duplicated here.
        </p>
        <Link href="/app/help" className="mt-4 inline-block text-sm font-medium text-jade underline">
          View implementation boundary
        </Link>
      </section>
    </div>
  );
}
