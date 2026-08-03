import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/server/db/client";
import {
  createProductCostVersion,
  createProductProfitSnapshot,
  getOwnedProfitSnapshot,
  getProfitabilityWorkspace,
  saveProductShippingOverride,
  saveWorkspaceShippingDefault,
} from "@/lib/server/repositories/profitability-repository";
import { RepositoryNotFoundError } from "@/lib/server/repositories/repository-context";

const suffix=`${Date.now()}_${Math.random().toString(36).slice(2)}`;
let contextA:{userId:string;workspaceId:string;role:"OWNER"};
let contextB:{userId:string;workspaceId:string;role:"OWNER"};
let productA:string;
let productB:string;

beforeAll(async()=>{
  const [userA,userB]=await Promise.all([
    prisma.user.create({data:{name:"P6 A",email:`p6-a-${suffix}@example.test`,emailVerified:true}}),
    prisma.user.create({data:{name:"P6 B",email:`p6-b-${suffix}@example.test`,emailVerified:true}}),
  ]);
  const [workspaceA,workspaceB]=await Promise.all([
    prisma.workspace.create({data:{name:"P6 A",slug:`p6-a-${suffix}`}}),
    prisma.workspace.create({data:{name:"P6 B",slug:`p6-b-${suffix}`}}),
  ]);
  await prisma.membership.createMany({data:[{userId:userA.id,workspaceId:workspaceA.id,role:"OWNER"},{userId:userB.id,workspaceId:workspaceB.id,role:"OWNER"}]});
  contextA={userId:userA.id,workspaceId:workspaceA.id,role:"OWNER"};contextB={userId:userB.id,workspaceId:workspaceB.id,role:"OWNER"};
  const [a,b]=await Promise.all([
    prisma.product.create({data:{workspaceId:workspaceA.id,sku:`p6-a-${suffix}`,title:"P6 A product"}}),
    prisma.product.create({data:{workspaceId:workspaceB.id,sku:`p6-b-${suffix}`,title:"P6 B product"}}),
  ]);productA=a.id;productB=b.id;
});

describe("Prompt 6 database-backed profitability boundaries",()=>{
  it("versions workspace shipping without overwriting the prior value",async()=>{
    const first=await saveWorkspaceShippingDefault(contextA,{destinationCountry:"US",shippingCost:null,shippingCurrency:"USD",customsResponsibility:"UNKNOWN",sellerPaidCustomsCost:null,customsCurrency:"USD",targetMarginPercent:"20"});
    const second=await saveWorkspaceShippingDefault(contextA,{destinationCountry:"US",shippingCost:"25",shippingCurrency:"USD",customsResponsibility:"BUYER",sellerPaidCustomsCost:null,customsCurrency:"USD",targetMarginPercent:"25"});
    expect(second.versionNumber).toBe(first.versionNumber+1);
    expect((await prisma.workspaceShippingDefaultVersion.findUnique({where:{id:first.id}}))?.effectiveTo).not.toBeNull();
    expect((await prisma.workspaceShippingDefaultVersion.findUnique({where:{id:first.id}}))?.shippingCost).toBeNull();
  });

  it("versions product overrides and rejects cross-workspace product access",async()=>{
    const first=await saveProductShippingOverride(contextA,{productId:productA,destinationCountry:"US",shippingCost:"20",shippingCurrency:"USD",customsResponsibility:"BUYER",sellerPaidCustomsCost:null,customsCurrency:null});
    const second=await saveProductShippingOverride(contextA,{productId:productA,destinationCountry:"US",shippingCost:"22",shippingCurrency:"USD",customsResponsibility:"BUYER",sellerPaidCustomsCost:null,customsCurrency:null});
    expect(second.versionNumber).toBe(first.versionNumber+1);
    await expect(saveProductShippingOverride(contextA,{productId:productB,destinationCountry:"US",shippingCost:"99",shippingCurrency:"USD",customsResponsibility:"BUYER",sellerPaidCustomsCost:null,customsCurrency:null})).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it("creates new immutable cost versions instead of editing history",async()=>{
    const first=await createProductCostVersion(contextA,{productId:productA,materialCost:"10",labourHours:"1",cashLabourRate:"2",economicLabourRate:"3",packagingCost:"4",otherDirectCost:"5",wastageRate:"6"});
    const second=await createProductCostVersion(contextA,{productId:productA,materialCost:"11",labourHours:"1",cashLabourRate:"2",economicLabourRate:"3",packagingCost:"4",otherDirectCost:"5",wastageRate:"6"});
    expect((await prisma.productCostVersion.findUnique({where:{id:first.id}}))?.materialCostTry.toString()).toBe("10");
    expect((await prisma.productCostVersion.findUnique({where:{id:first.id}}))?.effectiveTo).not.toBeNull();
    expect(second.materialCostTry.toString()).toBe("11");
  });

  it("preserves immutable calculation history and supersession",async()=>{
    const base={productId:productA,listingId:null,destinationCountry:"US",quantity:"1",listingPrice:"100",listingCurrency:"USD",reportingCurrency:"TRY",status:"INCOMPLETE" as const,completenessScore:70,inputSnapshot:{shipping:{classification:"UNKNOWN",value:null}},resultSnapshot:{result:null},warnings:["shippingCost is missing."],references:{}};
    const first=await createProductProfitSnapshot(contextA,base);
    const second=await createProductProfitSnapshot(contextA,{...base,completenessScore:80,warnings:["exchangeRate is missing."]});
    expect(second.supersedesSnapshotId).toBe(first.id);
    const keyed=await createProductProfitSnapshot(contextA,{...base,calculationKey:`prompt6:${suffix}:${productA}`});
    const retried=await createProductProfitSnapshot(contextA,{...base,calculationKey:`prompt6:${suffix}:${productA}`});
    expect(retried.id).toBe(keyed.id);
    expect((await getOwnedProfitSnapshot(contextA,first.id))?.completenessScore).toBe(70);
    await expect(getOwnedProfitSnapshot(contextB,first.id)).resolves.toBeNull();
  });

  it("returns only the trusted workspace's products",async()=>{
    const [a,b]=await Promise.all([getProfitabilityWorkspace(contextA),getProfitabilityWorkspace(contextB)]);
    expect(a.products.some((product)=>product.id===productA)).toBe(true);
    expect(a.products.some((product)=>product.id===productB)).toBe(false);
    expect(b.products.some((product)=>product.id===productB)).toBe(true);
  });
});
