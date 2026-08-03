"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const terminal = new Set(["SUCCEEDED", "PARTIAL", "FAILED", "CANCELLED"]);

export function SyncRefresh({ status }: { status: string | null }) {
  const router = useRouter();
  const attempts = useRef(0);
  useEffect(() => {
    if (!status || terminal.has(status)) return;
    const timer = window.setInterval(() => {
      attempts.current += 1;
      if (attempts.current >= 12) return window.clearInterval(timer);
      router.refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [router, status]);
  return status && !terminal.has(status) ? <p className="mt-2 text-xs text-stone-500" role="status">İçe aktarma arka planda devam ediyor. Bu sayfa sınırlı aralıklarla yenilenir.</p> : null;
}
