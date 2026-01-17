-- Seed KYC Document Types
-- This populates the kyc_document_types table with all required document types

INSERT INTO kyc_document_types (code, label, is_required) VALUES
('GST_CERTIFICATE', 'GST Registration Certificate', true),
('PAN_CARD', 'PAN Card', true),
('FACTORY_LICENSE', 'Factory License/ Panchayath/ Corporation Certificate', false),
('FSSAI_CERTIFICATE', 'FSSAI Certificate', false),
('CANCELLED_CHEQUE', 'Cancelled Cheque', true),
('INDEMNITY_CERTIFICATE', 'Indemnity Certificate', true),
('COMPANY_PROFILE', 'Company Profile', false),
('DRUG_LICENSE_1', '20B Drug License', true),
('DRUG_LICENSE_2', '21B Drug Licence', true),
('DRUG_LICENSE_3', 'Intimation Letter', false),
('MANUFACTURER_AUTH_LETTER', 'Manufacturer Authorization Letter', false),
('MANUFACTURER_AGREEMENT', 'Agreement with Manufacturer', false),
('QUALITY_CERTIFICATIONS', 'Quality Certifications (FDA, CE, etc.)', false),
('INCORPORATION_CERTIFICATE', 'Certificate of Incorporation', false),
('MSE_CERTIFICATE', 'MSME Certificate', false),
('UDYOG_AADHAR', 'Udyog Aadhar', false),
('NSIC_CERTIFICATE', 'NSIC/KVIC/UAM Certificate', false),
('NON_CONVICTION_CERTIFICATE', 'Non-Conviction Certificate', true),
('SUPPLY_ORDER', 'Supply Order', false),
('DECLARATION_FORM', 'Declaration Form', true)
ON CONFLICT (code) DO NOTHING;

-- Verify the insert
SELECT COUNT(*) as total_document_types FROM kyc_document_types;
SELECT code, label, is_required FROM kyc_document_types ORDER BY code;
