\set ON_ERROR_STOP on
SELECT "shippingCost" AS shipping_cost FROM "ShippingQuote";
SELECT "customsDutyAmount" + "additionalTariffAmount" + "carrierProcessingFee" AS total_import FROM "CustomsQuote";
SELECT COUNT(*) AS etsy_models FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'Etsy%';
SELECT COUNT(*) AS immutable_snapshots FROM "OrderCostSnapshot";
