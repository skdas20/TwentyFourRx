-- Update medicines with composition from medicine_references
UPDATE medicines m 
SET composition = mr.composition 
FROM medicine_references mr 
WHERE LOWER(m.name) = LOWER(mr.name) 
  AND m.composition IS NULL 
  AND mr.composition IS NOT NULL 
  AND mr.composition != 'N/A';

-- Show results
SELECT COUNT(*) as updated_count FROM medicines WHERE composition IS NOT NULL;
SELECT COUNT(*) as still_null FROM medicines WHERE composition IS NULL;
