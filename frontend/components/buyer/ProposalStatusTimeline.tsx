"use client";

import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

interface ProposalStatusTimelineProps {
  status: string;
  flowType?: string;
  createdAt: string;
  sellerConfirmedAt?: string;
  reviewedAt?: string;
}

export default function ProposalStatusTimeline({
  status,
  flowType,
  createdAt,
  sellerConfirmedAt,
  reviewedAt,
}: ProposalStatusTimelineProps) {
  const isSellerFlow = flowType === "SELLER_CONFIRMATION";

  const steps = isSellerFlow
    ? [
        {
          label: "Proposal Created",
          completed: true,
          timestamp: createdAt,
          icon: CheckCircle,
          color: "text-green-600",
        },
        {
          label: "Seller Confirmation",
          completed: ["SELLER_CONFIRMED", "QUANTITY_MODIFIED", "APPROVED"].includes(status),
          current: status === "AWAITING_SELLER",
          timestamp: sellerConfirmedAt,
          icon: status === "AWAITING_SELLER" ? Clock : CheckCircle,
          color: status === "AWAITING_SELLER" ? "text-yellow-600" : "text-green-600",
        },
        {
          label: "Buyer Approval",
          completed: status === "APPROVED",
          current: status === "QUANTITY_MODIFIED",
          timestamp: status === "APPROVED" ? reviewedAt : undefined,
          icon: status === "QUANTITY_MODIFIED" ? AlertCircle : status === "APPROVED" ? CheckCircle : Clock,
          color: status === "QUANTITY_MODIFIED" ? "text-orange-600" : status === "APPROVED" ? "text-green-600" : "text-gray-400",
          hidden: status !== "QUANTITY_MODIFIED" && status !== "APPROVED",
        },
        {
          label: "Admin Approval",
          completed: status === "APPROVED",
          current: status === "SELLER_CONFIRMED",
          timestamp: reviewedAt,
          icon: status === "APPROVED" ? CheckCircle : Clock,
          color: status === "APPROVED" ? "text-green-600" : "text-gray-400",
        },
      ]
    : [
        {
          label: "Proposal Created",
          completed: true,
          timestamp: createdAt,
          icon: CheckCircle,
          color: "text-green-600",
        },
        {
          label: "Admin Review",
          completed: status === "APPROVED",
          current: status === "PENDING",
          timestamp: reviewedAt,
          icon: status === "APPROVED" ? CheckCircle : status === "PENDING" ? Clock : XCircle,
          color: status === "APPROVED" ? "text-green-600" : status === "PENDING" ? "text-yellow-600" : "text-red-600",
        },
      ];

  if (status === "REJECTED") {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
          <XCircle className="w-5 h-5" />
          <span className="font-semibold">Proposal Rejected</span>
        </div>
        {reviewedAt && (
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">
            Rejected on {new Date(reviewedAt).toLocaleDateString('en-GB')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Proposal Status Timeline
      </h4>
      <div className="space-y-4">
        {steps.filter(step => !step.hidden).map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.completed || step.current
                  ? "bg-blue-100 dark:bg-blue-900/30"
                  : "bg-gray-100 dark:bg-gray-700"
              }`}>
                <Icon className={`w-4 h-4 ${step.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  step.completed || step.current
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                  {step.label}
                  {step.current && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                      (Current)
                    </span>
                  )}
                </p>
                {step.timestamp && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {new Date(step.timestamp).toLocaleString('en-GB')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
