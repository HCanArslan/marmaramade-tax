import Decimal from "decimal.js";
export function calculateProductCost(input: {
  materialComponentsTry: Decimal.Value[];
  wastageRate: Decimal.Value;
  laborHours: Decimal.Value;
  laborHourlyRateTry: Decimal.Value;
  packagingCostTry: Decimal.Value;
  additionalMakerPaymentTry?: Decimal.Value;
  allocatedEquipmentCostTry?: Decimal.Value;
  otherDirectCostTry: Decimal.Value;
}) {
  const materialSubtotalTry = input.materialComponentsTry.reduce<Decimal>(
    (sum, v) => sum.plus(v),
    new Decimal(0),
  );
  const wastageCostTry = materialSubtotalTry.mul(input.wastageRate).div(100);
  const laborCostTry = new Decimal(input.laborHours).mul(
    input.laborHourlyRateTry,
  );
  const packagingCostTry = new Decimal(input.packagingCostTry);
  const otherDirectCostTry = new Decimal(input.otherDirectCostTry)
    .plus(input.additionalMakerPaymentTry || 0)
    .plus(input.allocatedEquipmentCostTry || 0);
  const directProductCostTry = materialSubtotalTry
    .plus(wastageCostTry)
    .plus(laborCostTry)
    .plus(packagingCostTry)
    .plus(otherDirectCostTry);
  return {
    materialSubtotalTry,
    wastageCostTry,
    laborCostTry,
    packagingCostTry,
    otherDirectCostTry,
    directProductCostTry,
  };
}
