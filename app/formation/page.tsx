import { updateFormationTaskAction } from "@/app/actions/formation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function FormationPage() {
  await requireAdmin({ redirectTo: "/formation" });
  const tasks = await prisma.formationTask.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const percent = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Sole-proprietorship setup</p>
        <h1 className="mt-2 text-3xl font-semibold">Company formation</h1>
        <p className="mt-2 text-sm text-stone-500">
          {completed} of {tasks.length} tasks complete · {percent}%
        </p>
      </header>
      <div className="h-2 overflow-hidden rounded bg-stone-100">
        <div className="h-full bg-jade" style={{ width: `${percent}%` }} />
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Professional confirmations remain explicit. Completing a checklist item
        records evidence; it does not determine tax, SGK, employment, customs,
        or invoice treatment.
      </div>
      <section className="space-y-3">
        {tasks.map((task) => (
          <form
            action={updateFormationTaskAction}
            className="card grid gap-3 p-4 md:grid-cols-[1fr_220px_1fr_auto] md:items-center"
            key={task.id}
          >
            <input type="hidden" name="id" value={task.id} />
            <div>
              <p className="text-xs text-stone-400">
                {task.category.replaceAll("_", " ")}
              </p>
              <h2 className="font-medium">{task.title}</h2>
            </div>
            <label className="text-xs text-stone-500">
              Task status
              <select
                className="field mt-1"
                name="status"
                defaultValue={task.status}
              >
                {[
                  "NOT_STARTED",
                  "IN_PROGRESS",
                  "BLOCKED",
                  "PENDING_PROFESSIONAL_CONFIRMATION",
                  "COMPLETED",
                  "NOT_APPLICABLE",
                ].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-stone-500">
              Evidence or blocker note
              <input
                className="field mt-1"
                name="notes"
                defaultValue={task.notes ?? ""}
              />
            </label>
            <button className="rounded-xl border px-3 py-2 text-sm">
              Save
            </button>
          </form>
        ))}
      </section>
    </div>
  );
}
