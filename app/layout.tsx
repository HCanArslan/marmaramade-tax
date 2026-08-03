import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "MarmaraLedge",
  description: "Etsy kârlılık ve fiyatlandırma çalışma alanı",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <AppShell>{children}</AppShell>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
