-- SQL Script to Update MRP Prices from CSV File
-- This is the EASIEST method - just copy-paste your CSV data

-- Step 1: Create temporary table
CREATE TEMP TABLE temp_prices (
    name TEXT,
    price DECIMAL(14, 2)
);

-- Step 2: Import CSV data using COPY command
-- Run this in psql terminal:
-- \COPY temp_prices(name, price) FROM '/path/to/A_Z_medicines_dataset_of_India.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- OR if you're using pgAdmin, use this simpler approach:

-- Step 3: Update all medicines with prices
UPDATE medicine_references mr
SET mrp = tp.price
FROM temp_prices tp
WHERE LOWER(TRIM(mr.name)) = LOWER(TRIM(tp.name))
AND mr.mrp IS NULL;

-- Step 4: Verify the update
SELECT 
    COUNT(*) as total_medicines,
    COUNT(CASE WHEN mrp IS NOT NULL THEN 1 END) as with_prices,
    COUNT(CASE WHEN mrp IS NULL THEN 1 END) as without_prices,
    ROUND(100.0 * COUNT(CASE WHEN mrp IS NOT NULL THEN 1 END) / COUNT(*), 2) as coverage_pct
FROM medicine_references;

-- Step 5: Show sample results
SELECT name, mrp, form, strength, manufacturer 
FROM medicine_references 
WHERE mrp IS NOT NULL 
ORDER BY name 
LIMIT 20;
