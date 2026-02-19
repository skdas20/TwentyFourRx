#!/bin/bash
PGPASSWORD='secure2024pass' psql -U twentyfourxuser -d twentyfourxdb -h localhost << EOF
SELECT id, email, name, "roleCode", status, is_active 
FROM "User" 
WHERE email = 'courier@24rx.in';
EOF
