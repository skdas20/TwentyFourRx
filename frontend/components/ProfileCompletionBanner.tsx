
"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

interface ProfileCompletionBannerProps {
  user: any;
}

export default function ProfileCompletionBanner({ user }: ProfileCompletionBannerProps) {
  if (!user || user.roleCode === 'ADMIN') return null;

  const isApproved = user.status === 'APPROVED';
  const percentage = isApproved ? 100 : 80;

  return (
    <div className={`mb-6 p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm ${
      isApproved 
        ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800/30' 
        : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-sm ${
          isApproved ? 'border-green-500 text-green-600' : 'border-amber-500 text-amber-600'
        }`}>
          {percentage}%
        </div>
        <div>
          <h3 className={`font-bold ${isApproved ? 'text-green-800' : 'text-amber-800'}`}>
            {isApproved ? 'Profile 100% Complete' : 'Complete Your Profile (80%)'}
          </h3>
          <p className={`text-sm ${isApproved ? 'text-green-700' : 'text-amber-700'}`}>
            {isApproved 
              ? 'Your identity is verified. All trading features are unlocked.' 
              : 'Trading features (Buy/Sell) are locked. Upload KYC documents to reach 100%.'}
          </p>
        </div>
      </div>

      {!isApproved && (
        <Link 
          href="/dashboard/profile/complete" 
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all font-semibold shadow-sm transform hover:scale-[1.02]"
        >
          Complete Profile <ArrowRight className="w-4 h-4" />
        </Link>
      )}
      
      {isApproved && (
        <div className="flex items-center gap-2 text-green-700 font-medium bg-green-100 dark:bg-green-800/30 px-4 py-2 rounded-lg">
          <ShieldCheck className="w-5 h-5" /> Verified Account
        </div>
      )}
    </div>
  );
}
