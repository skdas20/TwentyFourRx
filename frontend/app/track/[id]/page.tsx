"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Package, Truck, CheckCircle, Clock, MapPin, Phone, Mail, ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default function TrackDeliveryPage() {
  const params = useParams();
  const deliveryId = params.id as string;
  
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDeliveryDetails();
  }, [deliveryId]);

  const loadDeliveryDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delivery-requests/${deliveryId}/track`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Delivery not found');
      }

      const data = await response.json();
      setDelivery(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: any = {
      'AWAITING_SELLER': { label: 'Awaiting Seller', icon: Clock, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', step: 1 },
      'AWAITING_COURIER_PICKUP': { label: 'Awaiting Pickup', icon: Clock, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', step: 2 },
      'IN_TRANSIT': { label: 'In Transit', icon: Truck, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', step: 3 },
      'OUT_FOR_DELIVERY': { label: 'Out for Delivery', icon: Truck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', step: 4 },
      'PENDING_OTP_VERIFICATION': { label: 'Delivered - Pending Confirmation', icon: Package, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', step: 5 },
      'DELIVERED': { label: 'Delivered', icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', step: 6 },
      'REJECTED': { label: 'Rejected', icon: Clock, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', step: 0 },
    };
    return statusMap[status] || { label: status, icon: Clock, color: 'text-gray-600 bg-gray-50', step: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Logo size="sm" href="/" />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Delivery Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(delivery.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" href="/" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Track Your Delivery</h1>
              <p className="text-gray-600 dark:text-gray-400">Order ID: #{delivery.id.slice(0, 8)}</p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusInfo.color}`}>
              <StatusIcon className="w-5 h-5" />
              <span className="font-semibold">{statusInfo.label}</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            
            {/* Timeline Steps */}
            <div className="space-y-6">
              {/* Step 1: Order Placed */}
              <div className="relative flex items-start gap-4">
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${statusInfo.step >= 1 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Order Placed</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(delivery.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Step 2: Awaiting Pickup */}
              <div className="relative flex items-start gap-4">
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${statusInfo.step >= 2 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  {statusInfo.step >= 2 ? <CheckCircle className="w-5 h-5 text-white" /> : <Clock className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Awaiting Courier Pickup</h3>
                  {delivery.courierPickupAt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(delivery.courierPickupAt).toLocaleString('en-IN')}</p>
                  )}
                </div>
              </div>

              {/* Step 3: In Transit */}
              <div className="relative flex items-start gap-4">
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${statusInfo.step >= 3 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  {statusInfo.step >= 3 ? <CheckCircle className="w-5 h-5 text-white" /> : <Truck className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">In Transit</h3>
                  {delivery.trackingNumber && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tracking: {delivery.trackingNumber}</p>
                  )}
                </div>
              </div>

              {/* Step 4: Out for Delivery */}
              <div className="relative flex items-start gap-4">
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${statusInfo.step >= 4 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  {statusInfo.step >= 4 ? <CheckCircle className="w-5 h-5 text-white" /> : <Truck className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Out for Delivery</h3>
                  {statusInfo.step >= 4 && <p className="text-sm text-gray-600 dark:text-gray-400">Your package is on the way</p>}
                </div>
              </div>

              {/* Step 5: Delivered */}
              <div className="relative flex items-start gap-4">
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${statusInfo.step >= 6 ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  {statusInfo.step >= 6 ? <CheckCircle className="w-5 h-5 text-white" /> : <Package className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Delivered</h3>
                  {delivery.deliveredAt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(delivery.deliveredAt).toLocaleString('en-IN')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Medicine Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Medicine Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{delivery.inventoryLot?.medicine?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Form</p>
                <p className="font-semibold text-gray-900 dark:text-white">{delivery.inventoryLot?.medicine?.form || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quantity</p>
                <p className="font-semibold text-gray-900 dark:text-white">{delivery.qty} units</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" />
              Need Help?
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email Support</p>
                  <a href="mailto:support@24rxexchange.in" className="font-semibold text-blue-600 hover:text-blue-700">
                    support@24rxexchange.in
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone Support</p>
                  <a href="tel:+911234567890" className="font-semibold text-blue-600 hover:text-blue-700">
                    +91 123 456 7890
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Portfolio */}
        <div className="mt-8 text-center">
          <Link href="/portfolio" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            <ArrowLeft className="w-5 h-5" />
            Back to Portfolio
          </Link>
        </div>
      </main>
    </div>
  );
}
