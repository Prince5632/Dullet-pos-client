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
      // Set currentBagSize based on existing selection
      if (existing.isBagSelection && existing.packaging === "5kg Bags") {
        setCurrentBagSize(5);
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

  const closeQtyModal = () => {
    setActiveProduct(null);
    setIsBagSelection(false);
    setBagPieces(1);
    setCurrentBagSize(40); // Reset to default
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
    setSelectedItems((prev) => ({ ...prev, [activeProduct.key]: item }));
    setActiveProduct(null);
    setIsBagSelection(false);
    setBagPieces(1);
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
    () => Object.values(selectedItems),
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

        {/* Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
              Products
            </h3>
            {loadingProducts && (
              <span className="text-xs text-gray-500">Loading...</span>
            )}
            {productsError && (
              <span className="text-xs text-red-600">{productsError}</span>
            )}
          </div>

          {/* Show message if no godown */}
          {!selectedGodownId && (
            <div className="text-xs text-gray-600">
              Please select a godown to view available products for that
              location.
            </div>
          )}

          {/* If godown selected but no products match */}
          {selectedGodownId && currentProducts.length === 0 && (
            <div className="text-xs text-amber-600">
              No products available for the selected godown. Please confirm that
              this location has assigned catalog items.
            </div>
          )}

          {/* Compact grouped products */}
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

              return Object.entries(baseProductGroups).map(
                ([baseName, variants]) => (
                  <div key={baseName} className="mb-3 last:mb-0">
                    <div className="flex items-center mb-2">
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {baseName}
                      </span>
                      <div className="h-px bg-gray-200 flex-1 ml-2"></div>
                    </div>

                    <div className="space-y-1.5">
                      {variants.map((variant) => {
                        const isSelected = !!selectedItems[variant.key];
                        return (
                          <button
                            key={variant.key}
                            onClick={() => openQtyModal(variant)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 ${
                              isSelected
                                ? "bg-emerald-50 border-emerald-300"
                                : "bg-white border-gray-200 hover:border-gray-300 active:scale-[0.99]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-semibold text-gray-900 truncate">
                                    {variant.name}
                                  </h4>
                                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                                    ₹{formatNumber(variant.pricePerKg)}/kg
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              );
            })()}
        </div>

        {/* Selected items */}
        {itemsArray.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
              Cart ({itemsArray.length})
            </h3>
            <div className="space-y-2">
              {itemsArray.map((it) => {
                const kg = computeItemKg(it);
                const price = it.product.pricePerKg ?? 0;
                const lineTotal = kg * price;
                return (
                  <div
                    key={it.product.key}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {it.product.name}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {formatItemQuantity(it)} • ₹{formatNumber(price)}/kg
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openQtyModal(it.product)}
                        className="text-[10px] text-blue-600 underline"
                      >
                        Edit
                      </button>

                      <div className="text-xs font-semibold text-gray-900 w-20 text-right">
                        ₹{formatNumber(lineTotal)}
                      </div>

                      <button
                        onClick={() => removeItem(it.product.key)}
                        className="p-1 rounded-md border hover:bg-gray-50 active:scale-95"
                      >
                        <XMarkIcon className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 shadow-lg">
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
            <div className="text-[10px] text-gray-500 mb-3">
              ₹{formatNumber(activeProduct.pricePerKg || 0)}/kg
            </div>

            {/* Inputs */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Kilograms
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isBagSelection) {
                      const newPieces = Math.max(
                        0,
                        (Number(bagPieces) || 0) - 1
                      );
                      setBagPieces(newPieces);
                      setKg(newPieces * currentBagSize);
                    } else {
                      setIsBagSelection(false);
                      setKg((prev) => Math.max(0, (Number(prev) || 0) - 0.5));
                    }
                  }}
                  disabled={kg <= 0}
                  className="px-4 py-2 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-medium active:scale-95"
                >
                  -
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  value={displayedKgValue === 0 ? "" : displayedKgValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setKg(0);
                    } else {
                      const num = Math.max(0, Number(value));
                      if (isBagSelection) {
                        const pieces = Math.ceil(num / currentBagSize);
                        setBagPieces(pieces);
                        setKg(pieces * currentBagSize);
                      } else {
                        setKg(num);
                        setIsBagSelection(false);
                      }
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
                  onClick={() => {
                    if (isBagSelection) {
                      const newPieces = (Number(bagPieces) || 0) + 1;
                      setBagPieces(newPieces);
                      setKg(newPieces * currentBagSize);
                    } else {
                      setIsBagSelection(false);
                      setKg((prev) => (Number(prev) || 0) + 0.5);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-medium active:scale-95"
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                {(() => {
                  const presetOptions: {
                    label: string;
                    value: number;
                    isBag?: boolean;
                    bagSize?: number;
                  }[] = [
                    { label: "5kg", value: 5 },
                    { label: "10kg", value: 10 },
                    { label: "25kg", value: 25 },
                    { label: "40kg", value: 40 },
                    { label: "50kg", value: 50 },
                  ];

                  // Add bag presets based on product type - mutual exclusivity
                  if (activeProduct.bagSizeKg === 5) {
                    // For 5kg products, only show 5kg bag option
                    presetOptions.push({
                      label: "5kg (bag)",
                      value: 5,
                      isBag: true,
                      bagSize: 5,
                    });
                  }
                  if (
                    activeProduct.bagSizeKg === 40 ||
                    activeProduct.bagSizeKg === 5
                  ) {
                    // For 40kg products, only show 40kg bag option
                    presetOptions.push({
                      label: "40kg (bag)",
                      value: 40,
                      isBag: true,
                      bagSize: 40,
                    });
                  }
                  if (
                    activeProduct.bagSizeKg &&
                    activeProduct.bagSizeKg !== 5 &&
                    activeProduct.bagSizeKg !== 40
                  ) {
                    // For other bag sizes, show the specific bag option
                    presetOptions.push({
                      label: `${activeProduct.bagSizeKg}kg (bag)`,
                      value: activeProduct.bagSizeKg,
                      isBag: true,
                      bagSize: activeProduct.bagSizeKg,
                    });
                  }

                  return presetOptions.map((preset) => {
                    // Determine if this preset is currently active
                    const isActive = (() => {
                      if (preset.isBag) {
                        // For bag presets, check if we're in bag selection mode with matching bag size and total kg
                        return (
                          isBagSelection &&
                          currentBagSize ===
                            (preset.bagSize || activeProduct.bagSizeKg) &&
                          kg === preset.value
                        );
                      } else {
                        // For regular presets, check if we're not in bag mode and kg matches
                        return !isBagSelection && kg === preset.value;
                      }
                    })();

                    return (
                      <button
                        key={`${preset.label}-${preset.value}`}
                        type="button"
                        onClick={() => {
                          setKg(preset.value);
                          if (preset.isBag) {
                            // Use custom bagSize for presets like 5kg (bag), or fall back to activeProduct.bagSizeKg
                            const bagSize =
                              preset.bagSize || activeProduct.bagSizeKg || 40;
                            setCurrentBagSize(bagSize); // Set the current bag size
                            const count = preset.value / bagSize;
                            setBagPieces(
                              !Number.isNaN(count)
                                ? Math.max(1, Math.round(count))
                                : 1
                            );
                          } else {
                            setBagPieces(1);
                            setCurrentBagSize(activeProduct.bagSizeKg || 40); // Use product's bag size or default
                          }
                          setIsBagSelection(!!preset.isBag);
                        }}
                        className={`flex-1 px-2 py-1 text-[10px] border rounded-md transition-all duration-200 active:scale-95 ${
                          isActive
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
            {isBagSelection && (
              <div className="my-3">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Bag Pieces
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={bagPieces || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        setBagPieces(0);
                        setKg(0);
                        return;
                      }
                      const count = Math.max(0, Math.floor(Number(value)));
                      setBagPieces(count);

                      // Calculate kg based on the current bag size
                      // Use the currentBagSize state which tracks the selected bag size
                      const currentBagSizeForCalc =
                        currentBagSize || activeProduct?.bagSizeKg || 40;

                      setKg(count * currentBagSizeForCalc);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Number of bags"
                  />
                  <span className="text-xs text-gray-500">
                    x {currentBagSize}kg
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={closeQtyModal}
                className="px-3 py-1.5 rounded-lg border text-xs active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmQty}
                className="px-4 py-1.5 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 text-xs active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickOrderPage;
