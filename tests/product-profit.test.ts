import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { calculatePortfolio, calculateProductProfit, type ProductProfitInput, type ResolvedInput } from "@/lib/domain/product-profit";

const known = <T>(value:T,source="TEST"):ResolvedInput<T>=>({value,classification:"KNOWN",source});
const na = <T>():ResolvedInput<T>=>({value:null,classification:"NOT_APPLICABLE",source:"NOT_APPLICABLE"});
const feeRules = [
  { category:"LISTING", percentageRate:null, fixedAmount:new Decimal("0.2"), fixedCurrency:"USD", vatApplicable:false, vatRate:new Decimal(0) },
  { category:"TRANSACTION", percentageRate:new Decimal("6.5"), fixedAmount:null, fixedCurrency:null, vatApplicable:false, vatRate:new Decimal(0) },
  { category:"PAYMENT_PROCESSING_PERCENT", percentageRate:new Decimal("6.5"), fixedAmount:null, fixedCurrency:null, vatApplicable:false, vatRate:new Decimal(0) },
];
const input=(overrides:Partial<ProductProfitInput>={}):ProductProfitInput=>({
  productId:"product-1",listingId:"listing-1",destinationCountry:"US",marketplaceCurrency:"USD",costCurrency:"TRY",reportingCurrency:"TRY",
  price:known("100"),materialCost:known("400","PRODUCT:TRY"),labourHours:known("2"),cashLabourRate:known("100","PRODUCT:TRY"),economicLabourRate:known("150","PRODUCT:TRY"),packagingCost:known("50","PRODUCT:TRY"),otherDirectCost:known("0","PRODUCT:TRY"),shippingCost:known("20","MANUAL:USD"),customsCost:na(),exportHandlingCost:na(),monthlyOverhead:na(),expectedMonthlyOrders:na(),exchangeRate:known("40"),feeRules,feeProfileId:"fees-1",customsResponsibility:"BUYER",targetMarginPercent:"20",taxReserveRate:na(),...overrides,
});

describe("Prompt 6 product profitability boundary",()=>{
  it("keeps an unknown required input out of financial totals",()=>{
    const calculation=calculateProductProfit(input({shippingCost:{value:null,classification:"UNKNOWN",source:"MISSING"}}));
    expect(calculation.status).toBe("INCOMPLETE");
    expect(calculation.result).toBeNull();
    expect(calculation.missingFields).toContain("shippingCost");
  });

  it("distinguishes a known zero from unknown",()=>{
    const calculation=calculateProductProfit(input({materialCost:known("0","PRODUCT:TRY")}));
    expect(calculation.status).toBe("COMPLETE");
    expect(calculation.result?.productCashCost.gte(0)).toBe(true);
  });

  it("separates cash and economic profit with Decimal arithmetic",()=>{
    const calculation=calculateProductProfit(input());
    expect(calculation.result).not.toBeNull();
    expect(calculation.result!.finalCashProfit.gt(calculation.result!.economicProfit!)).toBe(true);
    expect(calculation.result!.reportingCurrency).toBe("TRY");
  });

  it("requires seller-paid customs instead of substituting zero",()=>{
    const calculation=calculateProductProfit(input({customsResponsibility:"SELLER",customsCost:{value:null,classification:"UNKNOWN",source:"MISSING"}}));
    expect(calculation.status).toBe("INCOMPLETE");
    expect(calculation.warnings).toContain("Seller-paid customs cost is missing.");
  });

  it("recalculates percentage fees at every tested price",()=>{
    const low=calculateProductProfit(input({price:known("100")}));
    const high=calculateProductProfit(input({price:known("200")}));
    expect(high.result!.etsyFees.gt(low.result!.etsyFees)).toBe(true);
    expect(high.recommendations?.targetMarginPrice).not.toBeNull();
  });

  it("fails visibly when a fixed fee uses an uncovered currency",()=>{
    const calculation=calculateProductProfit(input({feeRules:[...feeRules,{category:"DEPOSIT",percentageRate:null,fixedAmount:new Decimal(1),fixedCurrency:"EUR",vatApplicable:false,vatRate:new Decimal(0)}]}));
    expect(calculation.status).toBe("INCOMPLETE");
    expect(calculation.warnings).toContain("A fixed Etsy fee uses a currency outside the captured calculation pair.");
  });

  it("calculates every portfolio product before quantity aggregation",()=>{
    const first=calculateProductProfit(input({price:known("100")}));
    const second=calculateProductProfit(input({price:known("160"),materialCost:known("800","PRODUCT:TRY")}));
    const portfolio=calculatePortfolio([{quantity:2,calculation:first},{quantity:3,calculation:second}]);
    expect(portfolio.includedCount).toBe(2);
    expect(portfolio.totalRevenue.eq(first.result!.grossRevenue.mul(2).plus(second.result!.grossRevenue.mul(3)))).toBe(true);
    expect(portfolio.cashProfit.eq(first.result!.finalCashProfit.mul(2).plus(second.result!.finalCashProfit.mul(3)))).toBe(true);
  });

  it("excludes incomplete portfolio rows instead of counting zero profit",()=>{
    const incomplete=calculateProductProfit(input({exchangeRate:{value:null,classification:"UNKNOWN",source:"MISSING"}}));
    const portfolio=calculatePortfolio([{quantity:100,calculation:incomplete}]);
    expect(portfolio).toMatchObject({includedCount:0,excludedCount:1});
    expect(portfolio.cashProfit.eq(0)).toBe(true);
    expect(portfolio.warnings).toContain("exchangeRate is missing.");
  });
});
