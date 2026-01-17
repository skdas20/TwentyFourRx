-- Check all KYC document types in database
SELECT id, code, label, is_required 
FROM kyc_document_types 
ORDER BY code;
