
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Upload, Check, X, Download, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";

const documentTypes = [
  { code: 'GST_CERTIFICATE', label: 'GST Registration Certificate', required: true, section: 'basic' },
  { code: 'PAN_CARD', label: 'PAN Card', required: true, section: 'basic' },
  { code: 'FACTORY_LICENSE', label: 'Factory License/ Panchayath/ Corporation Certificate', required: false, section: 'basic' },
  { code: 'FSSAI_CERTIFICATE', label: 'FSSAI Certificate', required: false, section: 'basic' },
  { code: 'CANCELLED_CHEQUE', label: 'Cancelled Cheque', required: true, section: 'basic' },
  { code: 'INDEMNITY_CERTIFICATE', label: 'Indemnity Certificate', required: true, section: 'basic', downloadUrl: '/forms/Indemnity-Certificate.pdf' },
  { code: 'COMPANY_PROFILE', label: 'Company Profile', required: false, section: 'basic' },
  { code: 'DRUG_LICENSE_1', label: '20B Drug License', required: true, section: 'basic' },
  { code: 'DRUG_LICENSE_2', label: '21B Drug Licence', required: true, section: 'basic' },
  { code: 'DRUG_LICENSE_3', label: 'Intimation Letter', required: false, section: 'basic' },
  { code: 'MANUFACTURER_AUTH_LETTER', label: 'Manufacturer Authorization Letter', required: false, section: 'auth' },
  { code: 'MANUFACTURER_AGREEMENT', label: 'Agreement with Manufacturer', required: false, section: 'auth' },
  { code: 'QUALITY_CERTIFICATIONS', label: 'Quality Certifications (FDA, CE, etc.)', required: false, section: 'auth' },
  { code: 'INCORPORATION_CERTIFICATE', label: 'Certificate of Incorporation', required: false, section: 'auth' },
  { code: 'MSE_CERTIFICATE', label: 'MSME Certificate', required: false, section: 'auth' },
  { code: 'UDYOG_AADHAR', label: 'Udyog Aadhar', required: false, section: 'auth' },
  { code: 'NSIC_CERTIFICATE', label: 'NSIC/KVIC/UAM Certificate', required: false, section: 'auth' },
  { code: 'NON_CONVICTION_CERTIFICATE', label: 'Non-Conviction Certificate', required: true, section: 'legal', downloadUrl: '/forms/Non-Conviction-Certificate.pdf' },
  { code: 'SUPPLY_ORDER', label: 'Supply Order', required: false, section: 'legal' },
  { code: 'DECLARATION_FORM', label: 'Declaration Form', required: true, section: 'legal', downloadUrl: '/forms/Declaration-Form.pdf' },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<{ [key: string]: File }>({});
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/auth/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadExistingDocuments(parsedUser.id);
  }, []);

  const loadExistingDocuments = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
      const response = await axios.get(`${API_URL}/profile/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExistingDocs(response.data.documents || []);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (code: string, file: File | null) => {
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type for ${code}. Only PDF, JPG, PNG allowed.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Max 10MB.`);
        return;
      }
      setDocuments({ ...documents, [code]: file });
      setError('');
    } else {
      const newDocs = { ...documents };
      delete newDocs[code];
      setDocuments(newDocs);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required documents
    const requiredCodes = documentTypes.filter(d => d.required).map(d => d.code);
    const uploadedCodes = [...existingDocs.map(d => d.docType.code), ...Object.keys(documents)];
    const missing = requiredCodes.filter(c => !uploadedCodes.includes(c));

    if (missing.length > 0) {
      const missingLabels = documentTypes.filter(d => missing.includes(d.code)).map(d => d.label);
      setError(`Missing required documents: ${missingLabels.join(', ')}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      Object.entries(documents).forEach(([code, file]) => {
        formDataToSend.append(code, file);
      });

      const token = localStorage.getItem('accessToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
      await axios.post(`${API_URL}/profile/documents`, formDataToSend, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(user.roleCode === 'ADMIN' ? '/dashboard/admin' : 
                   user.roleCode === 'SELLER' ? '/dashboard/seller' : '/dashboard/trader');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition">
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </Link>
          <Logo size="md" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-blue-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
            <p className="text-blue-100">Upload your KYC documents to reach 100% and unlock trading features.</p>
          </div>

          <div className="p-8">
            {success ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Documents Uploaded!</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Our team is reviewing your profile. You will be notified via email once approved.
                  Redirecting you back...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-8">
                  <Section 
                    title="Business Documents" 
                    docs={documentTypes.filter(d => d.section === 'basic')}
                    documents={documents}
                    existingDocs={existingDocs}
                    onFileChange={handleFileChange}
                  />
                  <Section 
                    title="Authorization & Quality" 
                    docs={documentTypes.filter(d => d.section === 'auth')}
                    documents={documents}
                    existingDocs={existingDocs}
                    onFileChange={handleFileChange}
                  />
                  <Section 
                    title="Legal & Compliance" 
                    docs={documentTypes.filter(d => d.section === 'legal')}
                    documents={documents}
                    existingDocs={existingDocs}
                    onFileChange={handleFileChange}
                  />
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Documents for Verification'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, docs, documents, existingDocs, onFileChange }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((doc: any) => {
          const existing = existingDocs.find((ed: any) => ed.docType.code === doc.code);
          return (
            <div key={doc.code} className={`p-4 rounded-xl border transition-all ${
              existing?.status === 'APPROVED' ? 'bg-green-50/50 border-green-100' : 
              existing?.status === 'REJECTED' ? 'bg-red-50/50 border-red-100' :
              'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {doc.label} {doc.required && <span className="text-red-500">*</span>}
                </span>
                {existing && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    existing.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    existing.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {existing.status}
                  </span>
                )}
              </div>

              {doc.downloadUrl && !existing && (
                <a href={doc.downloadUrl} download className="mb-3 flex items-center justify-center gap-2 w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-300 transition">
                  <Download className="w-3 h-3" /> Download Form
                </a>
              )}

              {existing && existing.status === 'APPROVED' ? (
                <div className="flex items-center gap-2 text-green-600 text-xs font-medium py-2">
                  <Check className="w-4 h-4" /> Document Verified
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => onFileChange(doc.code, e.target.files?.[0] || null)}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className={`py-3 px-4 border-2 border-dashed rounded-lg text-center transition ${
                    documents[doc.code] ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {documents[doc.code] ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-700 font-medium truncate max-w-[150px]">{documents[doc.code].name}</span>
                        <X className="w-4 h-4 text-red-500 cursor-pointer" onClick={(e) => {
                          e.preventDefault();
                          onFileChange(doc.code, null);
                        }} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] text-gray-500">Click to upload</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
