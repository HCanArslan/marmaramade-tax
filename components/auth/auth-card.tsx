export function AuthCard({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-[#18342e] px-4 py-10"><section className="w-full max-w-md rounded-3xl bg-cream p-7 shadow-2xl sm:p-9"><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm leading-6 text-stone-500">{description}</p>{children}</section></div>;
}
