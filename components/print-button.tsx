"use client";
export function PrintButton({
  label = "Print / Save PDF",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      className="rounded-xl border px-3 py-2 text-sm"
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
