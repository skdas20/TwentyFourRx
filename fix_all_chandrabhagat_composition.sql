-- Fix ALL Chandra Bhagat medicines - handle both NULL and empty string
UPDATE medicines m SET composition = 'AZITHROMYCIN INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'AZOCIN'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

UPDATE medicines m SET composition = 'CEFEPIME INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'CEP-1000'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

UPDATE medicines m SET composition = 'CEFEPIME & TAZOBACTAM INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'CBTAZ'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

UPDATE medicines m SET composition = 'POLYMYXIN B INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'CBMYX'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

UPDATE medicines m SET composition = 'FOSFOMYSIN SODIUM  INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'CBFOS'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

UPDATE medicines m SET composition = 'CEFUROXIME SODIUM INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'CEFROX'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

UPDATE medicines m SET composition = 'CEFTAZIDIME INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'CEFZIDIME'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

UPDATE medicines m SET composition = 'CEFTAZIDIME & TAZOBACTAM INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'CEFZIDIME TZ'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

UPDATE medicines m SET composition = 'CEFTRIAXONE & SULBACTAM INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'CEZONE PLUS'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

UPDATE medicines m SET composition = 'CEFTRIAXONE INJ'
FROM manufacturers mfr WHERE m.manufacturer_id = mfr.id
AND mfr.name = 'CHANDRA BHAGAT PHARMA LTD' AND m.name = 'CEZONE'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

-- Check all to see how many still need updates
SELECT COUNT(*) as empty_composition_count
FROM medicines m
JOIN manufacturers mfr ON m.manufacturer_id = mfr.id
WHERE mfr.name = 'CHANDRA BHAGAT PHARMA LTD'
AND (m.composition IS NULL OR m.composition = '' OR TRIM(m.composition) = '');

-- Show sample of what we fixed
SELECT m.name, m.composition
FROM medicines m
JOIN manufacturers mfr ON m.manufacturer_id = mfr.id
WHERE mfr.name = 'CHANDRA BHAGAT PHARMA LTD'
AND m.name IN ('CBMYX', 'AZOCIN', 'CBFOS', 'CEZONE', 'CBTAZ')
ORDER BY m.name;
