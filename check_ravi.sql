-- Find Ravi user
SELECT id, name, email, status, created_at 
FROM users 
WHERE name ILIKE '%ravi%' OR email ILIKE '%ravi%' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check KYC documents for Ravi
SELECT kd.id, kd.user_id, u.name, u.email, dt.label as doc_type, kd.status, kd.uploaded_at
FROM kyc_documents kd
JOIN users u ON kd.user_id = u.id
JOIN kyc_document_types dt ON kd.doc_type_id = dt.id
WHERE u.name ILIKE '%ravi%' OR u.email ILIKE '%ravi%'
ORDER BY kd.uploaded_at DESC;

-- Check notifications for admins about KYC uploads
SELECT n.id, n.user_id, u.name as admin_name, n.subject, n.body, n.created_at, n.is_read
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE u.role_code = 'ADMIN' 
  AND n.subject LIKE '%KYC%'
ORDER BY n.created_at DESC
LIMIT 10;
