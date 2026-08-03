export const saasNavigation = [
  { key: "dashboard", href: "/app" },
  { key: "products", href: "/app/products" },
  { key: "orders", href: "/app/orders" },
  { key: "profit", href: "/app/profit" },
  { key: "pricing", href: "/app/pricing" },
  { key: "scenarios", href: "/app/scenarios" },
  { key: "reports", href: "/app/reports" },
  { key: "settings", href: "/app/settings" },
  { key: "billing", href: "/app/billing" },
  { key: "help", href: "/app/help" },
] as const;

export type SaasNavigationKey = (typeof saasNavigation)[number]["key"];
