import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  XMarkIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import { orderService } from "../../services/orderService";
import CustomerSelector from "../../components/customers/CustomerSelector";
import CameraCapture from "../../components/common/CameraCapture";
import type { QuickProduct, Customer, Godown } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import { API_CONFIG } from "../../config/api";
import { toast } from "react-hot-toast";

type ItemMode = "kg";

type SelectedItem = {
  product: QuickProduct;
  mode: ItemMode;
  bags?: number;
  quantityKg?: number;
  packaging?:
    | "Standard"
    | "Custom"
    | "5kg Bags"
    | "10kg Bags"
    | "25kg Bags"
    | "50kg Bags"
    | "Loose"
    | "40kg Bag";
  isBagSelection?: boolean;
  bagPieces?: number;
};

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  address?: string;
}

// Helper function to format currency in full digits
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Alternative helper for just number formatting with commas
const formatNumber = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const QuickOrderPage: React.FC = () => {
  const navigate = useNavigate();

  // Customers
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // Products
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<QuickProduct[]>([]);

  // Selections
  const [selectedItems, setSelectedItems] = useState<
    Record<string, SelectedItem>
  >({});

  // Modal state for quantity entry
  const [activeProduct, setActiveProduct] = useState<QuickProduct | null>(null);
  const [kg, setKg] = useState<number>(0);
  const [isBagSelection, setIsBagSelection] = useState(false);
  const [bagPieces, setBagPieces] = useState<number>(1);
  const [currentBagSize, setCurrentBagSize] = useState<number>(40); // Track current bag size (5 or 40)
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null); // Track which item is being edited

  // Other minimal fields
  const [paymentTerms, setPaymentTerms] = useState<
    "Cash" | "Credit" | "Advance"
  >("Cash");
  const [priority, setPriority] = useState<
    "low" | "normal" | "high" | "urgent"
  >("normal");
  const [creating, setCreating] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Order creation flow state
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderCreationStep, setOrderCreationStep] = useState<
    "idle" | "location" | "camera" | "submitting"
  >("idle");

  // Godown
  const { user } = useAuth();
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedGodownId, setSelectedGodownId] = useState<string>("");

  // Image and Location capture
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [showCameraCapture, setShowCameraCapture] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProducts(true);
        const list = await orderService.getQuickProducts();
        setProducts(list);
        setProductsError(null);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load products";
        setProductsError(msg);
      } finally {
        setLoadingProducts(false);
      }
    };
    load();
  }, []);

  // Load godowns and default from user primary
  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get<{ godowns: Godown[] }>(
          API_CONFIG.ENDPOINTS.GODOWNS
        );
        if (res.success && res.data) {
          setGodowns(res.data.godowns);
          const defaultId = (user as any)?.primaryGodown?._id;
          if (defaultId) setSelectedGodownId(defaultId);
        }
      } catch {}
    })();
  }, [user]);

  // Location-based product and pricing helpers
  const normalizeCity = (raw?: string): string =>
    (raw || "").toLowerCase().trim();
  const canonicalCity = (raw?: string): string => {
    const city = normalizeCity(raw);
    switch (city) {
      case "ludhaina":
        return "ludhiana";
      case "fatehgarh":
        return "fatehgarh sahib";
      default:
        return city;
    }
  };
  const getCurrentCity = (): string => {
    const g = godowns.find((gd) => gd._id === selectedGodownId);
    return canonicalCity(g?.location?.city);
  };

  const currentProducts = useMemo(() => {
    const city = getCurrentCity();
    const area = godowns
      .find((g) => g._id === selectedGodownId)
      ?.location?.area?.toLowerCase();
    const tokensToMatch = [city, area ? `${city}:${area}` : ""].filter(Boolean);
    if (!tokensToMatch.length) return [] as QuickProduct[];
    return products.filter(
      (p) =>
        Array.isArray(p.cityTokens) &&
        p.cityTokens.some((token) => tokensToMatch.includes(token))
    );
  }, [products, selectedGodownId, godowns]);

  const handleCustomerChange = (
    customerId: string,
    _customer: Customer | null
  ) => {
    setSelectedCustomerId(customerId);
  };

  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ): Promise<string> => {
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding (free service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch address");
      }

      const data = await response.json();
      return (
        data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      );
    } catch (error) {
      console.error("Error getting address:", error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } finally {
      // no-op
    }
  };

  const handleCameraCapture = (
    imageData: string | null,
    imageFile: File | null
  ) => {
    if (imageData && imageFile) {
      setCapturedImage(imageFile);
      toast.success("Photo captured successfully");

      // If we're in the order creation flow, automatically submit the order
      if (isCreatingOrder && orderCreationStep === "camera") {
        setShowCameraCapture(false);
        submitOrderAfterCapture(imageFile);
      }
    }
  };

  const handleCameraClose = () => {
    setShowCameraCapture(false);

    // If we're in the order creation flow and user cancels, reset the flow
    if (isCreatingOrder) {
      setIsCreatingOrder(false);
      setOrderCreationStep("idle");
      toast("Order creation cancelled");
    }
  };

  // removed unused helpers

  const openQtyModal = (product: QuickProduct) => {
    setActiveProduct(product);
    const existing = selectedItems[product.key];
    if (existing) {
      setKg(existing.quantityKg || 0);
      setIsBagSelection(!!existing.isBagSelection);
      setBagPieces(existing.bagPieces || existing.bags || 1);
      // Set currentBagSize based on existing selection packaging
      if (existing.isBagSelection && existing.packaging === "5kg Bags") {
        setCurrentBagSize(5);
      }
      else if (existing.isBagSelection && existing.packaging === "10kg Bags") {
        setCurrentBagSize(10);
      }
       else if (existing.isBagSelection && existing.packaging === "40kg Bag") {
        setCurrentBagSize(40);
      } else if (existing.isBagSelection && existing.packaging === "50kg Bags") {
        setCurrentBagSize(50);
      } else {
        setCurrentBagSize(product.bagSizeKg || 40);
      }
    } else {
      // Initialize based on product's bagSizeKg from pricing config
      if (product.bagSizeKg === 5) {
        // For 5kg products, default to bag selection with 5kg bags
        setIsBagSelection(true);
        setBagPieces(1);
        setKg(5);
        setCurrentBagSize(5);
      } else if (product.bagSizeKg === 40) {
        // For 40kg products, default to bag selection with 40kg bags
        setIsBagSelection(true);
        setBagPieces(1);
        setKg(40);
        setCurrentBagSize(40);
      } else {
        // For other products, start with loose selection
        setKg(0);
        setIsBagSelection(false);
        setBagPieces(1);
        setCurrentBagSize(product.bagSizeKg || 40);
      }
    }
  };

  const openQtyModalForNewItem = (product: QuickProduct) => {
    setActiveProduct(product);
    // Always start fresh for new items, ignore existing selections
    // Initialize based on product's bagSizeKg from pricing config
    if (product.bagSizeKg === 5) {
      // For 5kg products, default to bag selection with 5kg bags
      setIsBagSelection(true);
      setBagPieces(1);
      setKg(5);
      setCurrentBagSize(5);
    } else if (product.bagSizeKg === 40) {
      // For 40kg products, default to bag selection with 40kg bags
      setIsBagSelection(true);
      setBagPieces(1);
      setKg(40);
      setCurrentBagSize(40);
    } else {
      // For other products, start with loose selection
      setKg(0);
      setIsBagSelection(false);
      setBagPieces(1);
      setCurrentBagSize(product.bagSizeKg || 40);
    }
  };

  const openQtyModalForExistingItem = (itemKey: string, item: any) => {
    setActiveProduct(item.product);
    setEditingItemKey(itemKey); // Store the key of the item being edited
    setKg(item.quantityKg || 0);
    setIsBagSelection(!!item.isBagSelection);
    setBagPieces(item.bagPieces || item.bags || 1);
    // Set currentBagSize based on existing selection packaging
    if (item.isBagSelection && item.packaging === "5kg Bags") {
      setCurrentBagSize(5);
    }
    else if (item.isBagSelection && item.packaging === "10kg Bags") {
      setCurrentBagSize(10);
    }
     else if (item.isBagSelection && item.packaging === "40kg Bag") {
      setCurrentBagSize(40);
    } else if (item.isBagSelection && item.packaging === "50kg Bags") {
      setCurrentBagSize(50);
    } else {
      setCurrentBagSize(item.product.bagSizeKg || 40);
    }
  };

  const closeQtyModal = () => {
    setActiveProduct(null);
    setIsBagSelection(false);
    setBagPieces(1);
    setCurrentBagSize(40); // Reset to default
    setEditingItemKey(null); // Clear editing state
  };

  const confirmQty = () => {
    if (!activeProduct) return;

    const bagSize = activeProduct.bagSizeKg;
    let totalKg = kg;
    let pieceCount: number | undefined = undefined;
    let bagsCount: number | undefined = undefined;

    if (isBagSelection) {
      const pieces = Number.isFinite(bagPieces) ? bagPieces : 0;
      if (!pieces || pieces <= 0) {
        toast.error("Enter valid bag pieces");
        return;
      }
      pieceCount = pieces;
      totalKg = pieces * currentBagSize;
      bagsCount = pieces;
    }

    if (!totalKg || totalKg <= 0) {
      toast.error("Enter valid quantity");
      return;
    }

    let packaging: SelectedItem["packaging"] = "Loose";
    if (isBagSelection) {
      // Determine packaging based on current bag size
      if (currentBagSize === 5) {
        packaging = "5kg Bags";
      } else if (currentBagSize === 40) {
        packaging = "40kg Bag";
      } else if (currentBagSize === 50) {
        packaging = "50kg Bags";
      } else if (
        activeProduct.defaultPackaging &&
        activeProduct.defaultPackaging !== "Loose"
      ) {
        packaging = activeProduct.defaultPackaging as typeof packaging;
      } else {
        packaging = "Custom";
      }
    }

    const item: SelectedItem = {
      product: activeProduct,
      mode: "kg",
      quantityKg: totalKg,
      packaging,
      bags: bagsCount,
      isBagSelection: isBagSelection,
      bagPieces: pieceCount,
    };
    
    let itemKey: string;
    
    if (editingItemKey) {
      // If editing an existing item, use the existing key
      itemKey = editingItemKey;
    } else {
      // If adding a new item, generate unique key for multiple items of same product
      const existingItem = selectedItems[activeProduct.key];
      itemKey = activeProduct.key;
      
      if (existingItem) {
        // If item already exists, create a new unique key
        let counter = 1;
        while (selectedItems[`${activeProduct.key}_${counter}`]) {
          counter++;
        }
        itemKey = `${activeProduct.key}_${counter}`;
      }
    }
    
    setSelectedItems((prev) => ({ ...prev, [itemKey]: item }));
    setActiveProduct(null);
    setIsBagSelection(false);
    setBagPieces(1);
    setEditingItemKey(null);
  };

  const removeItem = (key: string) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const computeItemKg = (it: SelectedItem) => it.quantityKg || 0;

  const formatItemQuantity = (it: SelectedItem) => {
    const kgValue = computeItemKg(it);
    const normalizedKg = Number.isFinite(kgValue) ? kgValue : 0;
    if (it.isBagSelection) {
      // Determine the actual bag size used based on packaging or calculation
      let actualBagSize: number;
      if (it.packaging === "5kg Bags") {
        actualBagSize = 5;
      } else if (it.packaging === "40kg Bag") {
        actualBagSize = 40;
      } else if (it.bagPieces && it.bagPieces > 0) {
        // Calculate bag size from total kg and pieces
        actualBagSize = normalizedKg / it.bagPieces;
      } else {
        // Fallback to product bag size
        actualBagSize = it.product?.bagSizeKg || 40;
      }

      if (it.bagPieces && it.bagPieces > 0) {
        const displayBagSize = Math.round(actualBagSize * 100) / 100;
        return `${it.bagPieces} × ${displayBagSize}kg (${normalizedKg}kg)`;
      }
      if (it.bags && it.bags > 0) {
        const displayBagSize = Math.round(actualBagSize * 100) / 100;
        return `${it.bags} × ${displayBagSize}kg (${normalizedKg}kg)`;
      }
      return `${normalizedKg}kg (bag)`;
    }
    return `${normalizedKg}kg`;
  };

  const itemsArray = useMemo(
    () => Object.entries(selectedItems).map(([key, item]) => ({ key, ...item })),
    [selectedItems]
  );
  const totalAmount = useMemo(() => {
    return itemsArray.reduce(
      (sum, it) => sum + computeItemKg(it) * (it.product.pricePerKg || 0),
      0
    );
  }, [itemsArray]);

  const displayedKgValue = useMemo(() => {
    if (isBagSelection) {
      // Show the current bag size when in bag selection mode
      return currentBagSize;
    }
    return kg;
  }, [isBagSelection, currentBagSize, kg]);

  const canSubmit = selectedCustomerId && itemsArray.length > 0 && !creating;

  const handleCreate = async () => {
    // Validate required fields first
    const missingFields = [];
    if (!selectedCustomerId) missingFields.push("Customer");
    if (itemsArray.length === 0) missingFields.push("Items");

    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(", ")}`);
      return;
    }

    // Start the order creation flow
    setIsCreatingOrder(true);
    setOrderCreationStep("location");

    try {
      // Step 1: Automatically fetch location
      await fetchLocationAutomatically();

      // Step 2: Open camera modal
      setOrderCreationStep("camera");
      setShowCameraCapture(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start order creation"
      );
      setIsCreatingOrder(false);
      setOrderCreationStep("idle");
    }
  };

  const fetchLocationAutomatically = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // no-op

      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            // Get address from coordinates
            const address = await getAddressFromCoordinates(
              latitude,
              longitude
            );

            const locationData: LocationData = {
              latitude,
              longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now(),
              address,
            };

            setLocation(locationData);
            toast.success("Location captured successfully");
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          reject(new Error("Failed to get location. Please try again."));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  const submitOrderAfterCapture = async (capturedImageFile?: File | null) => {
    try {
      setOrderCreationStep("submitting");
      setCreating(true);

      const paymentStatus: "pending" | "partial" | "paid" =
        paidAmount >= totalAmount
          ? "paid"
          : paidAmount > 0
          ? "partial"
          : "pending";

      // Use the passed image file or fall back to state
      const imageToUse = capturedImageFile || capturedImage;

      // Prepare form data for file upload
      const formData = new FormData();
      formData.append("customer", selectedCustomerId);
      formData.append(
        "items",
        JSON.stringify(
          itemsArray.map((it) => ({
            productKey: it.product.key,
            packaging: it.packaging,
            quantityKg: it.quantityKg,
            bags: it.bags,
            bagPieces: it.bagPieces,
            isBagSelection: it.isBagSelection,
          }))
        )
      );
      formData.append("paymentTerms", paymentTerms);
      formData.append("priority", priority);
      formData.append("paidAmount", paidAmount.toString());
      formData.append("paymentStatus", paymentStatus);
      if (imageToUse) {
        formData.append("capturedImage", imageToUse);
      }
      formData.append("captureLocation", JSON.stringify(location));
      if (selectedGodownId) {
        formData.append("godown", selectedGodownId);
      }

      const created = await orderService.createQuickOrder(formData);
      try {
        if (paidAmount > 0) {
          await orderService.updateOrder(created._id, {
            paidAmount,
            paymentStatus,
            items: (created as any).items || [],
          } as any);
        }
      } catch {
        // ignore, navigation will still proceed
      }
      toast.success("Order created");
      navigate(`/orders/${created._id}`, {
        state: { justCreatedPayment: { paidAmount, paymentStatus } },
      } as any);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create order"
      );
    } finally {
      setCreating(false);
      setIsCreatingOrder(false);
      setOrderCreationStep("idle");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/orders")}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                Quick Order
              </h1>
              <p className="hidden sm:block text-xs text-gray-600">
                Fast ordering with presets
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        {/* Customer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
            Customer
          </h3>
          <CustomerSelector
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={handleCustomerChange}
            label="Customer"
            placeholder="Select or create a customer"
            required
            showDetails={false}
          />
        </div>

        {/* Godown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
            Godown
          </h3>
          <select
            value={selectedGodownId}
            onChange={(e) => setSelectedGodownId(e.target.value)}
            className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select godown</option>
            {godowns.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name} - {g.location.city}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-500 mt-1.5">
            Auto-selected from your godown
          </p>
        </div>

        {/* Selected Products - Click to Edit */}
        {itemsArray.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                Selected Products ({itemsArray.length})
              </h3>
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                Click to Edit
              </div>
            </div>
            <div className="space-y-2">
              {itemsArray.map((it) => {
                const kg = computeItemKg(it);
                const price = it.product.pricePerKg ?? 0;
                const lineTotal = kg * price;
                return (
                  <button
                    key={it.key}
                    onClick={() => openQtyModalForExistingItem(it.key, it)}
                    className="w-full flex items-center justify-between gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all duration-200 active:scale-[0.99]"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {it.product.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {formatItemQuantity(it)} • ₹{formatNumber(price)}/kg
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-gray-900">
                        ₹{formatNumber(lineTotal)}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(it.key);
                        }}
                        className="p-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 active:scale-95 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Total Summary */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                <span className="text-lg font-bold text-blue-600">
                  ₹{formatNumber(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Available Products - Click to Add */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
              Available Products
            </h3>
            <div className="flex items-center gap-2">
              <div className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                Click to Add
              </div>
              {loadingProducts && (
                <span className="text-xs text-gray-500">Loading...</span>
              )}
              {productsError && (
                <span className="text-xs text-red-600">{productsError}</span>
              )}
            </div>
          </div>

          {/* Show message if no godown */}
          {!selectedGodownId && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="text-sm text-gray-600">
                Please select a godown to view available products for that location.
              </div>
            </div>
          )}

          {/* If godown selected but no products match */}
          {selectedGodownId && currentProducts.length === 0 && (
            <div className="text-center py-8">
              <div className="text-amber-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-sm text-amber-600">
                No products available for the selected godown. Please confirm that this location has assigned catalog items.
              </div>
            </div>
          )}

          {/* Available products grouped display */}
          {selectedGodownId &&
            currentProducts.length > 0 &&
            (() => {
              const baseProductGroups = currentProducts.reduce(
                (groups, product) => {
                  const baseName = product.name;
                  if (!groups[baseName]) {
                    groups[baseName] = [];
                  }
                  groups[baseName].push(product);
                  return groups;
                },
                {} as Record<string, QuickProduct[]>
              );

              // Show all products as "add new" options
               const availableGroups = Object.entries(baseProductGroups).map(([baseName, variants]) => {
                 return { baseName, variants };
               });

               return availableGroups.map(({ baseName, variants }) => (
                 <div key={baseName} className="mb-4 last:mb-0">

                   <div className="grid grid-cols-1 gap-2">
                     {variants.map((variant) => {
                       // Check for any items of this product (including numbered variants)
                       const productItemsInCart = Object.keys(selectedItems).filter(key => 
                         key === variant.key || key.startsWith(`${variant.key}_`)
                       );
                       const hasItemsInCart = productItemsInCart.length > 0;
                       
                       return (
                         <button
                           key={variant.key}
                           onClick={() => openQtyModalForNewItem(variant)}
                           className={`w-full text-left p-3 rounded-lg border transition-all duration-200 active:scale-[0.99] ${
                             hasItemsInCart
                               ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
                               : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50"
                           }`}
                         >
                           <div className="flex items-center justify-between">
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                 <h4 className="text-sm font-medium text-gray-900 truncate">
                                   {variant.name}
                                 </h4>
                                 <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                   ₹{formatNumber(variant.pricePerKg)}/kg
                                 </span>
                                 {hasItemsInCart && (
                                   <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">
                                     In Cart {productItemsInCart.length > 1 ? `(${productItemsInCart.length})` : ''}
                                   </span>
                                 )}
                               </div>
                             {variant.bagSizeKg && (
                               <div className="text-xs text-gray-500 mt-1">
                                 Available in {variant.bagSizeKg}kg bags
                               </div>
                             )}
                           </div>
                           <div className="flex items-center text-emerald-600">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                             </svg>
                           </div>
                         </div>
                       </button>
                     );
                   })}
                   </div>
                 </div>
               ));
            })()}
        </div>

        {/* Payment (with compact terms/priority) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
              Payment
            </h3>
            <div className="flex items-center gap-2">
              <div className="inline-flex gap-0.5">
                {(["Cash", "Credit", "Advance"] as const).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setPaymentTerms(term)}
                    className={`px-2 py-1 rounded text-[10px] border ${
                      paymentTerms === term
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50 active:scale-95"
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="px-1.5 py-1 border border-gray-300 rounded text-[10px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:items-end">
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-1">
                Paid Amount
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-1">Remaining</div>
              <div className="text-sm font-semibold text-gray-900">
                ₹{formatNumber(Math.max(0, totalAmount - (paidAmount || 0)))}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => setPaidAmount(totalAmount)}
              className="flex-1 px-2 py-1.5 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 text-[10px] active:scale-95"
            >
              Mark Paid
            </button>
            <button
              type="button"
              onClick={() => setPaidAmount(0)}
              className="flex-1 px-2 py-1.5 rounded-lg border border-gray-300 text-[10px] hover:bg-gray-50 active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {(() => {
        const missingFields = [];
        if (!selectedCustomerId) missingFields.push("Customer");
        if (itemsArray.length === 0) missingFields.push("Items");

        if (missingFields.length > 0) {
          return (
            <div className="fixed bottom-16 left-0 right-0 bg-amber-50 border-t border-amber-200 z-10">
              <div className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                  <p className="text-xs text-amber-700">
                    Please fill in:{" "}
                    <span className="font-medium">
                      {missingFields.join(", ")}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Mobile Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-inset-bottom shadow-lg">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gray-500 mb-0.5">
                Total Amount
              </div>
              <div className="text-base font-bold text-emerald-600 truncate">
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={handleCreate}
                disabled={isCreatingOrder || creating}
                className={`inline-flex items-center justify-center px-5 py-2 rounded-lg text-white text-xs font-medium shadow-sm transition-all duration-200 whitespace-nowrap active:scale-95 ${
                  isCreatingOrder || creating
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                }`}
              >
                {orderCreationStep === "location" ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    Getting Location...
                  </>
                ) : orderCreationStep === "camera" ? (
                  <>
                    <CameraIcon className="h-3.5 w-3.5 mr-1.5" />
                    Capture Image...
                  </>
                ) : creating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  "Create Order"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Padding */}
      <div className="h-16"></div>

      {/* Camera Capture Modal */}
      {showCameraCapture && (
        <CameraCapture
          isOpen={showCameraCapture}
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
        />
      )}

      {/* Quantity Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-sm font-semibold text-gray-900">
                {activeProduct.name}
              </h4>
              <button
                onClick={closeQtyModal}
                className="p-1 rounded hover:bg-gray-100 active:scale-95"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="text-[10px] text-gray-500 mb-4">
              ₹{formatNumber(activeProduct.pricePerKg || 0)}/kg
            </div>

            {/* Packaging Type Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Packaging Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBagSelection(false);
                    setBagPieces(1);
                    if (kg === 0) setKg(5); // Set default weight if none selected
                  }}
                  className={`p-3 border rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                    !isBagSelection
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">📦</div>
                    <div>Loose Packaging</div>
                    <div className="text-xs text-gray-500 mt-1">Custom weight</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBagSelection(true);
                    setBagPieces(1);
                    setCurrentBagSize(40); // Default to 40kg bags
                    setKg(40); // Set default to 1 bag of 40kg
                  }}
                  className={`p-3 border rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                    isBagSelection
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">🛍️</div>
                    <div>Bag Packaging</div>
                    <div className="text-xs text-gray-500 mt-1">Standard bags</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Weight Options */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Weight Options
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 40, 50].map((weight) => {
                  const isActive = isBagSelection 
                    ? (currentBagSize === weight && bagPieces === 1)
                    : (kg === weight);
                  
                  return (
                    <button
                      key={weight}
                      type="button"
                      onClick={() => {
                        if (isBagSelection) {
                          setCurrentBagSize(weight);
                          setBagPieces(1);
                          setKg(weight);
                        } else {
                          setKg(weight);
                        }
                      }}
                      className={`p-2 border rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                        isActive
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      {weight}kg
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Weight Input for Loose Packaging */}
            {!isBagSelection && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Custom Weight (kg)
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setKg((prev) => Math.max(0, (Number(prev) || 0) - 0.5))}
                    disabled={kg <= 0}
                    className="px-4 py-2 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-medium active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={kg === 0 ? "" : kg}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        setKg(0);
                      } else {
                        setKg(Math.max(0, Number(value)));
                      }
                    }}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        e.target.select();
                      }
                    }}
                    min={0}
                    step={0.5}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border-t border-b border-gray-300 text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setKg((prev) => (Number(prev) || 0) + 0.5)}
                    className="px-4 py-2 border border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-medium active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Bag Pieces Input for Bag Packaging */}
            {isBagSelection && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Number of Bags
                </label>
             <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2 w-full">
  {/* Quantity Controls */}
  <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto">
    <button
      type="button"
      onClick={() => {
        const newPieces = Math.max(1, (Number(bagPieces) || 1) - 1);
        setBagPieces(newPieces);
        setKg(newPieces * currentBagSize);
      }}
      disabled={bagPieces <= 1}
      className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 
      disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 
      text-sm sm:text-base font-medium active:scale-95 transition-transform duration-100 w-10 sm:w-auto"
    >
      -
    </button>

    <input
      type="number"
      min={1}
      step={1}
      value={bagPieces || ""}
      onChange={(e) => {
        const value = e.target.value;
        if (value === "") {
          setBagPieces(1);
          setKg(currentBagSize);
          return;
        }
        const count = Math.max(1, Math.floor(Number(value)));
        setBagPieces(count);
        setKg(count * currentBagSize);
      }}
      className="flex-1 px-2 py-2 sm:px-3 border-t border-b border-gray-300 text-center text-sm sm:text-base font-medium 
      focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-16 sm:w-20"
      placeholder="1"
    />

    <button
      type="button"
      onClick={() => {
        const newPieces = (Number(bagPieces) || 1) + 1;
        setBagPieces(newPieces);
        setKg(newPieces * currentBagSize);
      }}
      className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100 
      focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base font-medium active:scale-95 
      transition-transform duration-100 w-10 sm:w-auto"
    >
      +
    </button>
  </div>

  {/* Total Display */}
  <div className="text-center sm:text-left text-xs sm:text-sm text-gray-600">
    × {currentBagSize}kg ={" "}
    <span className="font-semibold text-gray-900">{kg}kg</span>
  </div>
</div>

              </div>
            )}

            {/* Total Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Weight:</span>
                <span className="text-sm font-medium text-gray-900">{kg}kg</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-sm font-medium text-emerald-600">
                  {formatCurrency(kg * (activeProduct.pricePerKg || 0))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={closeQtyModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmQty}
                disabled={kg <= 0}
                className="px-6 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium active:scale-95"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickOrderPage;
