import Link from "next/link";

export default function MarketingFoundationPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-7 sm:py-28">
      <p className="eyebrow">Public SaaS foundation · Prompt 1</p>
      <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-.045em] sm:text-6xl">
        Understand what remains after the real cost of an Etsy sale.
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-stone-600">
        This is the public route shell, not the final landing page. The verified
        MarmaraMade financial engine remains frozen while the SaaS surface is
        introduced in reviewed phases.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app" className="rounded-xl bg-jade px-5 py-3 text-sm font-medium text-white">
          Open protected app
        </Link>
        <Link href="/etsy-kar-hesaplama" className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium">
          Calculator foundation
        </Link>
      </div>
    </div>
  );
}
