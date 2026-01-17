-- Check user and their documents
SELECT u.id, u.name, u.email, u.status, u.role_code, u.created_at
FROM users u
WHERE u.email LIKE '%madandas%'
ORDER BY u.created_at DESC;

-- Check KYC documents for this user
SELECT kd.id, kd.user_id, dt.code, dt.label, kd.status, kd.uploaded_at
FROM kyc_documents kd
JOIN kyc_document_types dt ON kd.doc_type_id = dt.id
WHERE kd.user_id IN (SELECT id FROM users WHERE email LIKE '%madandas%')
ORDER BY kd.uploaded_at DESC;
