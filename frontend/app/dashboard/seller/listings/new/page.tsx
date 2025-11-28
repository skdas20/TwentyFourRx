"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Plus } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { medicineReferencesApi, listingsApi } from "@/lib/api";

export default function NewListingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [basePrice, setBasePrice] = useState("");
  const [stock, setStock] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      alert("Please enter at least 2 characters to search");
      return;
    }
    
    try {
      setSearching(true);
      setSearchResults([]); // Clear previous results
      console.log("Searching for:", searchQuery);
      const response = await medicineReferencesApi.search(searchQuery);
      console.log("Search response:", response.data);
      
      if (response.data && response.data.length > 0) {
        setSearchResults(response.data);
      } else {
        alert("No medicines found. Try a different search term.");
      }
    } catch (error: any) {
      console.error("Search failed:", error);
      alert(error.response?.data?.message || "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine || !basePrice || !stock) {
      alert("Please fill in all fields");
      return;
    }

    const parsedPrice = parseFloat(basePrice);
    const parsedStock = parseInt(stock);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("Please enter a valid price greater than 0");
      return;
    }

    // Validate price is lower than MRP
    if (selectedMedicine.mrp && parsedPrice >= selectedMedicine.mrp) {
      alert(`Your selling price (₹${parsedPrice}) must be lower than the MRP (₹${selectedMedicine.mrp}). Please offer a discount to attract buyers.`);
      return;
    }

    if (isNaN(parsedStock) || parsedStock <= 0) {
      alert("Please enter a valid stock quantity greater than 0");
      return;
    }

    try {
      setSubmitting(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('medicineReferenceId', selectedMedicine.id);
      formData.append('basePrice', parsedPrice.toString());
      formData.append('stock', parsedStock.toString());
      if (document) {
        formData.append('document', document);
      }
      
      console.log("Creating listing with document:", document?.name);
      
      const response = await fetch('http://localhost:8080/api/v1/listings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      console.log("Listing created:", data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create listing');
      }
      
      alert(data.message || "Listing created successfully!");
      router.push("/dashboard/seller");
    } catch (error: any) {
      console.error("Failed to create listing:", error);
      console.error("Error response:", error.response?.data);
      
      let errorMessage = "Failed to create listing. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/seller" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Listing</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Search and add medicine to your inventory</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedMedicine ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Search Medicine</h2>
            <div className="flex gap-2 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search from 251K+ medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg 
                           text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 
                           focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.length < 2}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {searching && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600 dark:text-gray-400">Searching medicines...</p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Found {searchResults.length} results</p>
                {searchResults.map((medicine: any) => (
                  <button
                    key={medicine.id}
                    onClick={() => setSelectedMedicine(medicine)}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 text-left transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{medicine.name}</h3>
                    {medicine.composition && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{medicine.composition}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Selected Medicine</h2>
                <button
                  type="button"
                  onClick={() => setSelectedMedicine(null)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Change
                </button>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{selectedMedicine.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedMedicine.composition}</p>
                {selectedMedicine.mrp && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Maximum Retail Price (MRP)</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">₹{selectedMedicine.mrp}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">⚠️ Your price must be lower than MRP</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Selling Price (₹ per unit) {selectedMedicine.mrp && <span className="text-red-500">*Must be less than ₹{selectedMedicine.mrp}</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  max={selectedMedicine.mrp || undefined}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-lg 
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2
                           ${parseFloat(basePrice) >= (selectedMedicine.mrp || Infinity) ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-600 focus:ring-blue-500'}`}
                  placeholder={selectedMedicine.mrp ? `Enter price below ₹${selectedMedicine.mrp}` : "Enter your selling price"}
                />
                {parseFloat(basePrice) >= (selectedMedicine.mrp || Infinity) && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    ⚠️ Price must be lower than MRP (₹{selectedMedicine.mrp})
                  </p>
                )}
                {basePrice && parseFloat(basePrice) < (selectedMedicine.mrp || Infinity) && selectedMedicine.mrp && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    ✓ Discount: {(((selectedMedicine.mrp - parseFloat(basePrice)) / selectedMedicine.mrp) * 100).toFixed(1)}% off MRP
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg 
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter stock quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Credibility Document (Optional)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Upload invoice, receipt, or purchase proof (PDF, JPG, PNG - Max 5MB)
                </p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setDocument(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg 
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
                           file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                {document && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ {document.name} ({(document.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard/seller")}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (selectedMedicine.mrp && parseFloat(basePrice) >= selectedMedicine.mrp)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {submitting ? "Creating..." : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Listing
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
