"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Plus, AlertCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { medicineReferencesApi, inventoryApi } from "@/lib/api";

function NewListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const medicineIdFromUrl = searchParams.get("medicineId");
  
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [proposedMrp, setProposedMrp] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [stock, setStock] = useState("");
  const [gstPercentage, setGstPercentage] = useState<number>(0); // Default to 0%
  const [batchNo, setBatchNo] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMedicine, setLoadingMedicine] = useState(false);
  
  // User holdings for validation
  const [userHoldings, setUserHoldings] = useState<any[]>([]);
  const [holdingsLoaded, setHoldingsLoaded] = useState(false);
  const [ownsSelectedMedicine, setOwnsSelectedMedicine] = useState(false);
  const [maxStockFromHoldings, setMaxStockFromHoldings] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    setUser(JSON.parse(userData));
    loadUserHoldings();
  }, [router]);

  // Load user's holdings to validate they own the medicine
  const loadUserHoldings = async () => {
    try {
      const res = await inventoryApi.getUserInventory();
      const inventory = Array.isArray(res.data?.inventory) ? res.data.inventory : [];
      setUserHoldings(inventory);
      setHoldingsLoaded(true);
      console.log("User holdings loaded:", inventory);
    } catch (error) {
      console.error("Failed to load holdings:", error);
      setHoldingsLoaded(true);
    }
  };

  // Auto-load medicine if medicineId is provided in URL
  useEffect(() => {
    if (medicineIdFromUrl && !selectedMedicine && holdingsLoaded) {
      loadMedicineById(medicineIdFromUrl);
    }
  }, [medicineIdFromUrl, holdingsLoaded]);

  // Check if user owns the selected medicine
  useEffect(() => {
    if (selectedMedicine && userHoldings.length > 0) {
      const holding = userHoldings.find(h => h.medicineId === selectedMedicine.medicineId || h.medicineId === selectedMedicine.id);
      if (holding) {
        setOwnsSelectedMedicine(true);
        setMaxStockFromHoldings(holding.totalQty || 0);
      } else {
        setOwnsSelectedMedicine(false);
        setMaxStockFromHoldings(0);
      }
    } else {
      setOwnsSelectedMedicine(false);
      setMaxStockFromHoldings(0);
    }
  }, [selectedMedicine, userHoldings]);

  const loadMedicineById = async (medicineId: string) => {
    try {
      setLoadingMedicine(true);
      console.log("Loading medicine by ID:", medicineId);
      
      // First check if user owns this medicine in their holdings
      const holding = userHoldings.find(h => h.medicineId === medicineId);
      
      if (holding) {
        console.log("Found medicine in user holdings:", holding);
        // User owns this medicine - use holding data
        setSelectedMedicine({
          id: holding.medicineId,
          medicineId: holding.medicineId,
          name: holding.medicineName,
          form: holding.form,
          strength: holding.strength,
          composition: `${holding.form}${holding.strength ? ` - ${holding.strength}` : ''}`,
          mrp: holding.avgCost, // Use avg cost as reference
          manufacturerName: holding.manufacturer,
        });
        setOwnsSelectedMedicine(true);
        setMaxStockFromHoldings(holding.totalQty || 0);
        return;
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      
      // Try to get medicine from listings API
      const listingsResponse = await fetch(`${apiUrl}/listings?medicineId=${medicineId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (listingsResponse.ok) {
        const listings = await listingsResponse.json();
        if (listings && listings.length > 0 && listings[0].medicine) {
          const medicine = listings[0].medicine;
          console.log("Loaded medicine from listings:", medicine);
          
          setSelectedMedicine({
            id: medicine.id,
            medicineId: medicine.id,
            name: medicine.name,
            form: medicine.form,
            strength: medicine.strength,
            composition: `${medicine.form}${medicine.strength ? ` - ${medicine.strength}` : ''}`,
            mrp: listings[0].listPrice || listings[0].basePrice,
            manufacturerName: medicine.manufacturer?.name,
          });
          
          if (listings[0].listPrice || listings[0].basePrice) {
            setProposedMrp((listings[0].listPrice || listings[0].basePrice).toString());
          }
          return;
        }
      }
      
      // Fallback: try to get from medicine references API
      const response = await fetch(`${apiUrl}/medicine-references/search?q=${medicineId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load medicine');
      }
      
      const medicines = await response.json();
      if (medicines && medicines.length > 0) {
        const medicine = medicines[0];
        console.log("Loaded medicine from references:", medicine);
        setSelectedMedicine(medicine);
        
        if (medicine.mrp) {
          setProposedMrp(medicine.mrp.toString());
        }
      } else {
        throw new Error('Medicine not found');
      }
    } catch (error: any) {
      console.error("Failed to load medicine:", error);
      alert("Failed to load medicine. Please search manually.");
    } finally {
      setLoadingMedicine(false);
    }
  };

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
    if (!selectedMedicine || !proposedMrp || !basePrice || !stock || !productImage) {
      alert("Please fill in all required fields including medicine photo");
      return;
    }

    const parsedMrp = parseFloat(proposedMrp);
    const parsedPrice = parseFloat(basePrice);
    const parsedStock = parseInt(stock);

    if (isNaN(parsedMrp) || parsedMrp <= 0) {
      alert("Please enter a valid MRP greater than 0");
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("Please enter a valid price greater than 0");
      return;
    }

    // Validate price is lower than proposed MRP
    if (parsedPrice >= parsedMrp) {
      alert(`Your selling price (₹${parsedPrice}) must be lower than the MRP (₹${parsedMrp}). Please offer a discount to attract buyers.`);
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
      formData.append('proposedMrp', parsedMrp.toString());
      formData.append('basePrice', parsedPrice.toString());
      formData.append('stock', parsedStock.toString());
      formData.append('gstPercentage', gstPercentage.toString());
      if (batchNo) {
        formData.append('batchNo', batchNo);
      }
      if (expiryDate) {
        formData.append('expiryDate', expiryDate);
      }
      if (hsnCode) {
        formData.append('hsnCode', hsnCode);
      }
      if (document) {
        formData.append('document', document);
      }
      if (productImage) {
        formData.append('productImage', productImage);
      }
      
      console.log("Creating listing with batch:", batchNo, "expiry:", expiryDate, "document:", document?.name);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await fetch(`${apiUrl}/listings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      const responseText = await response.text();
      let data: any = null;

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Non-JSON response when creating listing:", responseText);
          const cleanedMessage = responseText
            .replace(/<[^>]*>?/gm, '')
            .trim()
            .slice(0, 200);

          if (!response.ok) {
            throw new Error(cleanedMessage || `Failed to create listing (status ${response.status})`);
          }

          throw new Error("Unexpected response from server. Please try again.");
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          `Failed to create listing (status ${response.status})`
        );
      }

      console.log("Listing created:", data);

      alert(data?.message || "Listing created successfully!");
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sell Medicine</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Search and add medicine to your inventory</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingMedicine ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading medicine details...</p>
            </div>
          </div>
        ) : !selectedMedicine ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Search Medicine</h2>
              <button
                onClick={() => router.push("/dashboard/seller/listings/contribute")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Contribute Medicine
              </button>
            </div>
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

            {/* Show user's holdings as quick-select options */}
            {!searching && searchResults.length === 0 && userHoldings.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Quick Select from Your Holdings
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userHoldings.map((holding: any) => (
                    <button
                      key={holding.medicineId}
                      onClick={() => {
                        setSelectedMedicine({
                          id: holding.medicineId,
                          medicineId: holding.medicineId,
                          name: holding.medicineName,
                          form: holding.form,
                          strength: holding.strength,
                          composition: `${holding.form}${holding.strength ? ` - ${holding.strength}` : ''}`,
                          mrp: holding.avgCost,
                          manufacturerName: holding.manufacturer,
                        });
                      }}
                      className="w-full p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{holding.medicineName}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {holding.form}{holding.strength ? ` - ${holding.strength}` : ''}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/50 px-2 py-1 rounded">
                          {holding.totalQty} units
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Found {searchResults.length} results</p>
                {searchResults.map((medicine: any) => {
                  // Check if user owns this medicine
                  const holding = userHoldings.find(h => 
                    h.medicineName?.toLowerCase() === medicine.name?.toLowerCase() ||
                    h.medicineId === medicine.id
                  );
                  const isOwned = !!holding;
                  
                  return (
                    <button
                      key={medicine.id}
                      onClick={() => setSelectedMedicine(medicine)}
                      className={`w-full p-4 rounded-lg border text-left transition-colors ${
                        isOwned 
                          ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-green-200 dark:border-green-700' 
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{medicine.name}</h3>
                          {medicine.composition && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{medicine.composition}</p>
                          )}
                        </div>
                        {isOwned && (
                          <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/50 px-2 py-1 rounded">
                            ✓ In Holdings ({holding.totalQty} units)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
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
              <div className={`p-4 rounded-lg border ${ownsSelectedMedicine ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'}`}>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{selectedMedicine.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedMedicine.composition}</p>
                {ownsSelectedMedicine && (
                  <div className="mt-3 p-3 bg-green-100 dark:bg-green-800/30 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-300">✓ You own this medicine</p>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">Available in holdings: {maxStockFromHoldings} units</p>
                  </div>
                )}
                {selectedMedicine.mrp && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Reference Price</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">₹{selectedMedicine.mrp}</p>
                  </div>
                )}
              </div>
              
              {/* Warning if user doesn't own the medicine */}
              {!ownsSelectedMedicine && holdingsLoaded && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">You don't own this medicine</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        You can only create listings for medicines you have in your portfolio. 
                        Please buy this medicine first or select a medicine from your holdings.
                      </p>
                      <Link 
                        href="/portfolio" 
                        className="inline-block mt-2 text-xs font-medium text-amber-700 dark:text-amber-300 underline hover:no-underline"
                      >
                        View My Holdings →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Retail Price (MRP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={proposedMrp}
                  onChange={(e) => setProposedMrp(e.target.value)}
                  onFocus={() => {
                    // Auto-populate with current MRP on focus ONLY if completely empty (never been set)
                    if (proposedMrp === "" && selectedMedicine.mrp) {
                      setProposedMrp(selectedMedicine.mrp.toString());
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg 
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={selectedMedicine.mrp ? `Current: ₹${selectedMedicine.mrp}` : "Enter MRP"}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedMedicine.mrp && proposedMrp && parseFloat(proposedMrp) !== parseFloat(selectedMedicine.mrp) 
                    ? "⚠️ You're proposing a different MRP. Admin will review this change." 
                    : "You can edit the MRP if needed. Admin will review any changes."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Selling Price (₹ per unit) <span className="text-red-500">*Must be less than MRP</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  max={proposedMrp || undefined}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-lg 
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2
                           ${parseFloat(basePrice) >= parseFloat(proposedMrp || "0") ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-600 focus:ring-blue-500'}`}
                  placeholder={proposedMrp ? `Enter price below ₹${proposedMrp}` : "Enter your selling price"}
                />
                {parseFloat(basePrice) >= parseFloat(proposedMrp || "0") && proposedMrp && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    ⚠️ Price must be lower than MRP (₹{proposedMrp})
                  </p>
                )}
                {basePrice && proposedMrp && parseFloat(basePrice) < parseFloat(proposedMrp) && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    ✓ Discount: {(((parseFloat(proposedMrp) - parseFloat(basePrice)) / parseFloat(proposedMrp)) * 100).toFixed(1)}% off MRP
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock Quantity {ownsSelectedMedicine && <span className="text-gray-500">(Max: {maxStockFromHoldings})</span>}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={ownsSelectedMedicine ? maxStockFromHoldings : undefined}
                  value={stock}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (ownsSelectedMedicine && val > maxStockFromHoldings) {
                      setStock(maxStockFromHoldings.toString());
                    } else {
                      setStock(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={ownsSelectedMedicine ? `Enter quantity (1-${maxStockFromHoldings})` : "Enter stock quantity"}
                />
                {ownsSelectedMedicine && parseInt(stock) > maxStockFromHoldings && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    ⚠️ Cannot exceed your holdings ({maxStockFromHoldings} units)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GST Percentage <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gst"
                      value="0"
                      checked={gstPercentage === 0}
                      onChange={() => setGstPercentage(0)}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-gray-100">0%</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gst"
                      value="5"
                      checked={gstPercentage === 5}
                      onChange={() => setGstPercentage(5)}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-gray-100">5%</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select the applicable GST rate for this medicine
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  HSN Code (Optional)
                </label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 3004"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter the Harmonized System of Nomenclature code for this medicine
                </p>
              </div>

              {/* Batch Number and Expiry Date - for admin verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Batch Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg 
                             text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., BN12345"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Admin will verify this with your uploaded bill
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg 
                             text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Admin will verify this with your uploaded bill
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Medicine Photo <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Upload product/medicine image (JPG, PNG - Max 5MB)
                </p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check file size (5MB = 5 * 1024 * 1024 bytes)
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Image file size must be less than 5MB. Please compress or resize the image.");
                        e.target.value = '';
                        setProductImage(null);
                        return;
                      }
                      setProductImage(file);
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
                           file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold
                           file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900/30 dark:file:text-green-300"
                />
                {productImage && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ {productImage.name} ({(productImage.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Credibility Document {!ownsSelectedMedicine && <span className="text-red-500">*</span>}
                  {ownsSelectedMedicine && <span className="text-gray-500">(Optional)</span>}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {!ownsSelectedMedicine 
                    ? "Required: Upload invoice, receipt, or purchase proof to verify you have this medicine (PDF, JPG, PNG - Max 5MB)"
                    : "Upload invoice, receipt, or purchase proof (PDF, JPG, PNG - Max 5MB)"}
                </p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  required={!ownsSelectedMedicine}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check file size (5MB = 5 * 1024 * 1024 bytes)
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Document file size must be less than 5MB. Please compress the file.");
                        e.target.value = '';
                        setDocument(null);
                        return;
                      }
                      setDocument(file);
                    }
                  }}
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
                {!ownsSelectedMedicine && !document && (
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ This document is required since you don't own this medicine in your holdings
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
                disabled={submitting || !proposedMrp || !productImage || (!ownsSelectedMedicine && !document) || (!!proposedMrp && parseFloat(basePrice) >= parseFloat(proposedMrp)) || (ownsSelectedMedicine && parseInt(stock) > maxStockFromHoldings)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {submitting ? "Selling..." : (
                  <>
                    <Plus className="w-5 h-5" />
                    Sell
                  </>
                )}
              </button>
            </div>
            {!ownsSelectedMedicine && !document && holdingsLoaded && (
              <p className="text-center text-sm text-red-600 dark:text-red-400 mt-3">
                Please upload a credibility document to verify you have this medicine
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  );
}

export default function NewListingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NewListingContent />
    </Suspense>
  );
}
