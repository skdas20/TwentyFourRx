-- SQL Script to Update MRP Prices for All Medicines
-- This script reads from the CSV data and updates the medicine_references table
-- Run this directly in PostgreSQL

-- Step 1: Create a temporary table to hold the CSV data
CREATE TEMP TABLE temp_medicine_prices (
    name TEXT,
    price DECIMAL(14, 2)
);

-- Step 2: Insert all medicine prices from your CSV
-- Format: (medicine_name, price)
-- Copy the data from your A_Z_medicines_dataset_of_India.csv file

INSERT INTO temp_medicine_prices (name, price) VALUES
('Augmentin 625 Duo Tablet', 223.42),
('Azithral 500 Tablet', 132.36),
('Ascoril LS Syrup', 118),
('Allegra 120mg Tablet', 218.81),
('Avil 25 Tablet', 10.96),
('Allegra-M Tablet', 241.48),
('Amoxyclav 625 Tablet', 223.27),
('Azee 500 Tablet', 132.38),
('Atarax 25mg Tablet', 85.5);
-- ... Add all remaining medicines from your CSV here

-- Step 3: Update medicine_references with prices
UPDATE medicine_references mr
SET mrp = tp.price
FROM temp_medicine_prices tp
WHERE LOWER(mr.name) = LOWER(tp.name)
AND mr.mrp IS NULL;

-- Step 4: Check the results
SELECT 
    COUNT(*) as total_medicines,
    COUNT(CASE WHEN mrp IS NOT NULL THEN 1 END) as medicines_with_price,
    COUNT(CASE WHEN mrp IS NULL THEN 1 END) as medicines_without_price,
    ROUND(100.0 * COUNT(CASE WHEN mrp IS NOT NULL THEN 1 END) / COUNT(*), 2) as coverage_percentage
FROM medicine_references;

-- Step 5: View sample of updated medicines
SELECT name, mrp, form, strength, manufacturer 
FROM medicine_references 
WHERE mrp IS NOT NULL 
LIMIT 10;

-- Cleanup (optional - temp table is automatically dropped at session end)
-- DROP TABLE temp_medicine_prices;
