import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source=(file:string)=>readFile(path.join(process.cwd(),file),"utf8");

describe("Prompt 6 core-app contracts",()=>{
  it("replaces product, order, pricing, and dashboard placeholders",async()=>{
    const pages=await Promise.all([source("app/(saas)/app/page.tsx"),source("app/(saas)/app/products/page.tsx"),source("app/(saas)/app/orders/page.tsx"),source("app/(saas)/app/pricing/page.tsx")]);
    for(const page of pages)expect(page).not.toContain("SaasPlaceholderPage");
    expect(pages[0]).toContain("Eksik ürünler sıfır kâr gibi gösterilmez");
    expect(pages[0]).toContain("hasCalculatedProducts ? view.portfolio.cashProfit : null");
    expect(pages[1]).toContain("/app/products/${product.id}");
  });

  it("authenticates every profitability mutation and validates form data",async()=>{
    const actions=await source("app/(saas)/app/profitability-actions.ts");
    expect(actions.match(/requireWorkspaceContext\(\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(actions).toContain("z.object");
    expect(actions).not.toContain("workspaceId: z.");
  });

  it("keeps snapshots immutable and leaves Etsy write operations absent",async()=>{
    const [repository,route]=await Promise.all([source("lib/server/repositories/profitability-repository.ts"),source("app/api/inngest/route.ts")]);
    expect(repository).toContain("productProfitSnapshot.create");
    expect(repository).not.toContain("productProfitSnapshot.update");
    expect(route).toContain("workspaceProfitabilityFunction");
    expect(repository).not.toMatch(/etsy(Listing|Connection)\.(update|delete|create)/);
  });

  it("exposes product and order detail routes",async()=>{
    const [product,order]=await Promise.all([source("app/(saas)/app/products/[id]/page.tsx"),source("app/(saas)/app/orders/[id]/page.tsx")]);
    expect(product).toContain("Snapshot geçmişi");
    expect(product).toContain("Fiyat önerisi");
    expect(order).toContain("Değişmez hesaplama satırları");
  });
});
