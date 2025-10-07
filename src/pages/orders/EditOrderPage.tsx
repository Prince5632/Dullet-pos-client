import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  ArrowLeftIcon,
  CameraIcon,
  MapPinIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { orderService } from "../../services/orderService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import type {
  Order,
  OrderItem,
  UpdateOrderForm,
  QuickProduct,
  Godown,
} from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import { API_CONFIG } from "../../config/api";
import { toast } from "react-hot-toast";
import Modal from "../../components/ui/Modal";
import { resolveCapturedImageSrc } from "../../utils/image";

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

const schema = yup.object({
  paymentTerms: yup
    .mixed<"Cash" | "Credit" | "Advance">()
    .oneOf(["Cash", "Credit", "Advance"])
    .required("Payment terms are required"),
  priority: yup
    .mixed<"low" | "normal" | "high" | "urgent">()
    .oneOf(["low", "normal", "high", "urgent"])
    .optional(),
  requiredDate: yup.string().optional(),
  deliveryInstructions: yup.string().optional(),
  notes: yup.string().optional(),
  paidAmount: yup.number().min(0, "Paid amount must be positive").optional(),
});

const EditOrderPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Product management states (similar to QuickOrderPage)
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<
    Record<string, SelectedItem>
  >({});
  const [activeProduct, setActiveProduct] = useState<QuickProduct | null>(null);
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);
  const [kg, setKg] = useState(0);
  const [isBagSelection, setIsBagSelection] = useState(false);
  const [bagPieces, setBagPieces] = useState<number>(1);
  const [currentBagSize, setCurrentBagSize] = useState<number>(40);

  // Godown state
  const [godowns, setGodowns] = useState<Godown[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UpdateOrderForm>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      paymentTerms: "Cash",
      priority: "normal",
      paidAmount: 0,
    },
  });

  const watchedValues = watch();

  // Location-based product and pricing helpers
  const normalizeCity = (raw?: string): string => (raw || '').toLowerCase().trim();
  const canonicalCity = (raw?: string): string => {
    const city = normalizeCity(raw);
    switch (city) {
      case 'ludhaina':
        return 'ludhiana';
      case 'fatehgarh':
        return 'fatehgarh sahib';
      default:
        return city;
    }
  };
  const getCurrentCity = (): string => {
    const g = godowns.find(gd => gd._id === order?.godown?._id);
    const rawCity = g?.location?.city;
    const normalizedCity = canonicalCity(rawCity);
    console.log("getCurrentCity debug:", {
      orderGodownId: order?.godown?._id,
      foundGodown: g,
      rawCity,
      normalizedCity
    });
    return normalizedCity;
  };

  const currentProducts = useMemo(() => {
    const city = getCurrentCity();
    const area = godowns.find(g => g._id === order?.godown?._id)?.location?.area?.toLowerCase();
    const tokensToMatch = [city, area ? `${city}:${area}` : ""].filter(Boolean);
    
    console.log("currentProducts filtering:", {
      city,
      area,
      tokensToMatch,
      orderGodownId: order?.godown?._id,
      godownsCount: godowns.length,
      productsCount: products.length,
      productsWithTokens: products.filter(p => Array.isArray(p.cityTokens)).length
    });
    
    if (!tokensToMatch.length) {
      console.log("No tokens to match, returning empty array");
      return [] as QuickProduct[];
    }
    
    const filtered = products.filter(
      (p) =>
        Array.isArray(p.cityTokens) &&
        p.cityTokens.some((token) => tokensToMatch.includes(token))
    );
    
    console.log("Filtered products:", filtered.length, filtered.map(p => ({ name: p.name, cityTokens: p.cityTokens })));
    
    return filtered;
  }, [products, order, godowns]);

  // Load products
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

  // Load godowns
  useEffect(() => {
    const loadGodowns = async () => {
      try {
        const response = await apiService.get<{ godowns: Godown[] }>(API_CONFIG.ENDPOINTS.GODOWNS);
        if (response.success && response.data) {
          setGodowns(response.data.godowns);
        }
      } catch (error) {
        console.error("Failed to load godowns:", error);
      }
    };
    loadGodowns();
  }, []);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        toast.error("Order ID is required");
        navigate("/orders");
        return;
      }

      try {
        setLoading(true);
        const data = await orderService.getOrderById(orderId);
        setOrder(data);
        setOrderItems(data.items || []);

        // Populate form values
        setValue("paymentTerms", data.paymentTerms);
        setValue("priority", data.priority);
        if (data.requiredDate)
          setValue("requiredDate", data.requiredDate.split("T")[0]);
        if (data.deliveryInstructions)
          setValue("deliveryInstructions", data.deliveryInstructions);
        if (data.notes) setValue("notes", data.notes);
        if (typeof data.paidAmount === "number")
          setValue("paidAmount", data.paidAmount);
      } catch (err) {
        console.error("Failed to load order:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to load order"
        );
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, navigate, setValue]);

  // Convert OrderItems to SelectedItems when currentProducts and order are loaded
  useEffect(() => {
    console.log("Conversion useEffect triggered:", {
      currentProductsLength: currentProducts.length,
      orderItemsLength: orderItems.length,
      hasCurrentProducts: currentProducts.length > 0,
      hasOrderItems: orderItems.length > 0
    });

    if (currentProducts.length > 0 && orderItems.length > 0) {
      console.log("Converting orderItems to selectedItems:", {
        currentProductsCount: currentProducts.length,
        orderItemsCount: orderItems.length,
        orderItems: orderItems.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          packaging: item.packaging,
          isBagSelection: item.isBagSelection,
        })),
        availableProducts: currentProducts.map(p => ({
          name: p.name,
          key: p.key,
          bagSizeKg: p.bagSizeKg
        }))
      });

      const convertedItems: Record<string, SelectedItem> = {};

      orderItems.forEach((item, index) => {
        console.log("Processing order item:", {
          productName: item.productName,
          quantity: item.quantity,
          packaging: item.packaging,
          isBagSelection: item.isBagSelection,
          itemId: item._id,
          index
        });

        // Try to find matching product by name from currentProducts (godown-filtered products)
        // This ensures we only match products available in the selected godown
        const matchingProduct = currentProducts.find((p) => {
          const productNameLower = p.name.toLowerCase();
          const itemNameLower = item.productName.toLowerCase();
          
          // Exact match
          if (productNameLower === itemNameLower) return true;
          
          // Contains match (both directions)
          if (productNameLower.includes(itemNameLower) || itemNameLower.includes(productNameLower)) return true;
          
          // Remove common words and try again
          const cleanProductName = productNameLower.replace(/\b(atta|flour|kg|bag|bags)\b/g, '').trim();
          const cleanItemName = itemNameLower.replace(/\b(atta|flour|kg|bag|bags)\b/g, '').trim();
          
          if (cleanProductName && cleanItemName && 
              (cleanProductName.includes(cleanItemName) || cleanItemName.includes(cleanProductName))) {
            return true;
          }
          
          return false;
        });

        console.log(
          `Matching product for "${item.productName}":`,
          matchingProduct ? {
            name: matchingProduct.name,
            key: matchingProduct.key,
            bagSizeKg: matchingProduct.bagSizeKg
          } : "NOT FOUND"
        );

        if (matchingProduct) {
          const packaging = item.packaging || "Loose";
          // Use isBagSelection from backend if available, otherwise calculate
          const isBagSelection = item.isBagSelection !== undefined ? item.isBagSelection : packaging !== "Loose";
          let bagPieces: number | undefined = undefined;
          let bags: number | undefined = undefined;

          // Calculate bag pieces based on packaging and quantity
          if (isBagSelection) {
            if (packaging === "5kg Bags") {
              bagPieces = Math.round(item.quantity / 5);
              bags = bagPieces;
            } else if (packaging === "40kg Bag") {
              bagPieces = Math.round(item.quantity / 40);
              bags = bagPieces;
            } else if (matchingProduct.bagSizeKg) {
              // For other bag types, calculate based on product's bag size
              bagPieces = Math.round(item.quantity / matchingProduct.bagSizeKg);
              bags = bagPieces;
            }
          }

          // Create a product object that preserves the original name from the order item
          const productWithOriginalName = {
            ...matchingProduct,
            name: item.productName, // Use original name from order item
          };

          const convertedItem = {
            product: productWithOriginalName,
            mode: "kg",
            quantityKg: item.quantity,
            packaging: packaging as SelectedItem['packaging'],
            isBagSelection,
            bagPieces,
            bags,
          };

          // Create unique key using item ID if available, otherwise use product key + index
          const uniqueKey = item._id ? `${matchingProduct.key}_${item._id}` : `${matchingProduct.key}_${index}`;
          
          console.log(`Converted item for "${item.productName}" with key "${uniqueKey}":`, convertedItem);
          convertedItems[uniqueKey] = convertedItem;
        }
      });

      console.log(
        "Converted items:",
        Object.keys(convertedItems).length,
        convertedItems
      );
      setSelectedItems(convertedItems);
      
      console.log("Final selectedItems set:", {
        convertedItemsCount: Object.keys(convertedItems).length,
        convertedItemsKeys: Object.keys(convertedItems),
        willDisableSaveButton: Object.keys(convertedItems).length === 0
      });
    } else {
      console.log("Conversion skipped - conditions not met:", {
        currentProductsLength: currentProducts.length,
        orderItemsLength: orderItems.length,
        reason: currentProducts.length === 0 ? "No current products" : "No order items"
      });
    }
  }, [currentProducts, orderItems]);

  // Product management functions (similar to QuickOrderPage)
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
      num
    );
  };

  const openQtyModal = (product: QuickProduct) => {
    setActiveProduct(product);
    const existing = selectedItems[product.key];
    if (existing) {
      setKg(existing.quantityKg || 0);
      setIsBagSelection(!!existing.isBagSelection);
      setBagPieces(existing.bagPieces || existing.bags || 1);
      // Set currentBagSize based on existing selection
      if (existing.isBagSelection && existing.packaging === '5kg Bags') {
        setCurrentBagSize(5);
      } else if (existing.isBagSelection && existing.packaging === '40kg Bag') {
        setCurrentBagSize(40);
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

  const openQtyModalForItem = (itemKey: string, item: SelectedItem) => {
    setActiveProduct(item.product);
    setActiveItemKey(itemKey); // Store the specific item key being edited
    setKg(item.quantityKg || 0);
    setIsBagSelection(!!item.isBagSelection);
    setBagPieces(item.bagPieces || item.bags || 1);
    // Set currentBagSize based on existing selection
    if (item.isBagSelection && item.packaging === '5kg Bags') {
      setCurrentBagSize(5);
    } else if (item.isBagSelection && item.packaging === '40kg Bag') {
      setCurrentBagSize(40);
    } else {
      setCurrentBagSize(item.product.bagSizeKg || 40);
    }
  };

  const closeQtyModal = () => {
    setActiveProduct(null);
    setActiveItemKey(null);
    setIsBagSelection(false);
    setBagPieces(1);
    setCurrentBagSize(40); // Reset to default
  };

  const confirmQty = () => {
    if (!activeProduct) return;

    let totalKg = kg;
    let pieceCount: number | undefined = undefined;
    let bagsCount: number | undefined = undefined;

    if (isBagSelection) {
      const pieces = Number.isFinite(bagPieces) ? bagPieces : 0;
      if (!pieces || pieces <= 0) {
        toast.error('Enter valid bag pieces');
        return;
      }
      pieceCount = pieces;
      totalKg = pieces * currentBagSize;
      bagsCount = pieces;
    }

    if (!totalKg || totalKg <= 0) {
      toast.error('Enter valid quantity');
      return;
    }

    let packaging: SelectedItem['packaging'] = 'Loose';
    if (isBagSelection) {
      // Determine packaging based on current bag size
      if (currentBagSize === 5) {
        packaging = '5kg Bags';
      } else if (currentBagSize === 40) {
        packaging = '40kg Bag';
      } else if (activeProduct.defaultPackaging && activeProduct.defaultPackaging !== 'Loose') {
        packaging = activeProduct.defaultPackaging as typeof packaging;
      } else {
        packaging = 'Custom';
      }
    }

    const item: SelectedItem = {
      product: activeProduct,
      mode: 'kg',
      quantityKg: totalKg,
      packaging,
      bags: bagsCount,
      isBagSelection: isBagSelection,
      bagPieces: pieceCount,
    };

    // Use activeItemKey if editing existing item, otherwise generate new unique key
    const itemKey = activeItemKey || `${activeProduct.key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setSelectedItems(prev => ({ ...prev, [itemKey]: item }));
    setActiveProduct(null);
    setActiveItemKey(null);
    setIsBagSelection(false);
    setBagPieces(1);
    setCurrentBagSize(40); // Reset to default
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
      if (it.packaging === '5kg Bags') {
        actualBagSize = 5;
      } else if (it.packaging === '40kg Bag') {
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

  const itemsWithKeys = useMemo(
    () => Object.entries(selectedItems).map(([key, item]) => ({ key, item })),
    [selectedItems]
  );

  const displayedKgValue = useMemo(() => {
    if (isBagSelection) {
      // Show the current bag size when in bag selection mode
      return currentBagSize;
    }
    return kg;
  }, [isBagSelection, currentBagSize, kg]);

  const calculateTotal = () => {
    return itemsArray.reduce(
      (sum, it) => sum + computeItemKg(it) * it.product.pricePerKg,
      0
    );
  };
  const handleViewImage = (imageData: string | undefined, title: string) => {
    if (!imageData) return;

    const formattedSrc = resolveCapturedImageSrc(imageData);
    if (formattedSrc) {
      setSelectedImage(formattedSrc);
      setShowImageModal(true);
    }
  };
  const onSubmit = async (data: UpdateOrderForm) => {
    console.log("🚀 onSubmit FUNCTION CALLED! This means form submission is working!");
    console.log("onSubmit called with data:", data);
    console.log("itemsArray:", itemsArray);
    console.log("selectedItems:", selectedItems);
    try {
      if (!order) {
        console.log("No order found, returning");
        return;
      }
      setSaving(true);

      // Validate order items
      if (itemsArray.length === 0) {
        console.log("No items in array, showing error");
        toast.error("Please add at least one order item");
        return;
      }

      // Convert selectedItems back to OrderItems format
      const convertedOrderItems: OrderItem[] = itemsArray.map((item) => ({
        productName: item.product.name,
        grade: "", // Not used in QuickOrderPage approach
        quantity: item.quantityKg || 0,
        unit: "KG",
        ratePerUnit: item.product.pricePerKg,
        totalAmount: (item.quantityKg || 0) * item.product.pricePerKg,
        packaging: item.packaging || "Loose",
      }));

      const itemErrors = convertedOrderItems.flatMap((item, index) =>
        orderService
          .validateOrderItem(item)
          .map((error) => `Item ${index + 1}: ${error}`)
      );

      if (itemErrors.length > 0) {
        toast.error(itemErrors[0]);
        return;
      }

      // Determine payment status from paid amount
      const effectiveTotal = calculateTotal();
      let paymentStatus: Order["paymentStatus"] | undefined = undefined;
      if (typeof data.paidAmount === "number") {
        if (data.paidAmount >= effectiveTotal) paymentStatus = "paid";
        else if (data.paidAmount > 0) paymentStatus = "partial";
        else paymentStatus = "pending";
      }
      const payload: UpdateOrderForm = {
        ...data,
        items: convertedOrderItems,
        ...(paymentStatus ? { paymentStatus } : {}),
      };

      const updated = await orderService.updateOrder(order._id, payload);
      toast.success("Order updated successfully!");
      navigate(`/orders/${updated._id}`);
    } catch (err) {
      console.error("Failed to update order:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update order"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Prevent editing if order is delivered
  if (order.status === "delivered" || order.status === "rejected") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-green-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Order already {order?.status}
          </h2>
          <p className="text-gray-600 mb-6">
            This order has been {order?.status} and cannot be edited.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/orders/${order._id}`)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            View Order Details
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = calculateTotal();
  const paidAmount = watchedValues.paidAmount || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  return (
    <>
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        {/* Compact Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate(`/orders/${order._id}`)}
                className="p-1.5 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  Edit {order.orderNumber}
                </h1>
                <p className="hidden sm:block text-xs text-gray-600">
                  Modify order details
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4 py-3 sm:py-4">
          <form
            onSubmit={handleSubmit(onSubmit as any)}
            className="space-y-3 sm:space-y-4"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                {/* Customer Info (Read-only) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                    Customer
                  </h3>
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-gray-700">
                          Business:
                        </span>
                        <p className="text-gray-900">
                          {order.customer?.businessName}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Contact:
                        </span>
                        <p className="text-gray-900">
                          {order.customer?.contactPersonName}
                        </p>
                        <p className="text-gray-600">{order.customer?.phone}</p>
                      </div>
                      {order.customer?.location && (
                        <div className="sm:col-span-2">
                          <span className="font-medium text-gray-700">
                            Location:
                          </span>
                          <p>
                            <a
                              href={order.customer.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View on Google Maps
                            </a>
                          </p>
                        </div>
                      )}
                      {order.customer?.address && (
                        <div className="sm:col-span-2">
                          <span className="font-medium text-gray-700">
                            Address:
                          </span>
                          <p className="text-gray-900">
                            {[
                              order.customer.address.street,
                              `${order.customer.address.city}, ${order.customer.address.state}`,
                              order.customer.address.pincode,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] text-gray-500">
                    Customer cannot be changed
                  </p>
                </div>

                {/* Godown Info (Read-only) */}
                {order.godown && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                      Godown
                    </h3>
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs font-medium text-gray-900">
                        {order.godown.name}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {order.godown.location.city}
                        {order.godown.location.area &&
                          `, ${order.godown.location.area}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                {/* Products */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                      Products
                    </h3>
                    {loadingProducts && (
                      <span className="text-xs text-gray-500">Loading...</span>
                    )}
                    {productsError && (
                      <span className="text-xs text-red-600">
                        {productsError}
                      </span>
                    )}
                  </div>

                  {/* Show selected items grouped by original product name */}
                  {Object.keys(selectedItems).length > 0 && (() => {
                    // Group selected items by their original product name
                    const selectedItemGroups = Object.entries(selectedItems).reduce((groups, [key, item]) => {
                      const productName = item.product.name;
                      if (!groups[productName]) {
                        groups[productName] = [];
                      }
                      groups[productName].push({ key, item });
                      return groups;
                    }, {} as Record<string, Array<{ key: string; item: SelectedItem }>>);

                    return (
                      <div className="mb-4">
                        <div className="text-xs text-gray-700 font-medium mb-2">Selected Items:</div>
                        {Object.entries(selectedItemGroups).map(([productName, itemsWithKeys]) => (
                          <div key={productName} className="mb-3 last:mb-0">
                            <div className="flex items-center mb-2">
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                {productName}
                              </span>
                              <div className="h-px bg-gray-200 flex-1 ml-2"></div>
                            </div>

                            <div className="space-y-1.5">
                              {itemsWithKeys.map(({ key, item }, index) => (
                                <button
                                  type="button"
                                  key={key}
                                  onClick={() => openQtyModalForItem(key, item)}
                                  className="w-full text-left p-2.5 rounded-lg border transition-all duration-200 bg-emerald-50 border-emerald-300"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs font-semibold text-gray-900 truncate">
                                          {item.product.name}
                                          {itemsWithKeys.length > 1 && (
                                            <span className="text-[10px] text-gray-500 ml-1">
                                              #{index + 1}
                                            </span>
                                          )}
                                        </h4>
                                        <span className="text-[10px] text-gray-500 flex-shrink-0">
                                          ₹{formatNumber(item.product.pricePerKg)}/kg
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-emerald-600 mt-0.5">
                                        {formatNumber(item.quantityKg || 0)} kg
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Show available products for adding new items */}
                  {currentProducts.length > 0 && (() => {
                    const baseProductGroups = currentProducts.reduce((groups, product) => {
                      const baseName = product.name;
                      if (!groups[baseName]) {
                        groups[baseName] = [];
                      }
                      groups[baseName].push(product);
                      return groups;
                    }, {} as Record<string, QuickProduct[]>);

                    return (
                      <div>
                        <div className="text-xs text-gray-700 font-medium mb-2">
                          {Object.keys(selectedItems).length > 0 ? 'Available Products:' : 'Products:'}
                        </div>
                        {Object.entries(baseProductGroups).map(([baseName, variants]) => (
                          <div key={baseName} className="mb-3 last:mb-0">
                            <div className="flex items-center mb-2">
                              <span className="text-xs font-medium text-gray-700 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">
                                {baseName}
                              </span>
                              <div className="h-px bg-gray-200 flex-1 ml-2"></div>
                            </div>

                            <div className="space-y-1.5">
                               {variants.map(variant => (
                                 <button
                                   type="button"
                                   key={variant.key}
                                   onClick={() => openQtyModal(variant)}
                                   className="w-full text-left p-2.5 rounded-lg border transition-all duration-200 bg-white border-gray-200 hover:border-gray-300 active:scale-[0.99]"
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
                               ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* No products message */}
                  {order && currentProducts.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <svg
                          className="w-12 h-12 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 9l3-3 3 3"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">
                        No products available for{" "}
                        {order.godown?.name || "this godown"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Location: {order.godown?.location?.city},{" "}
                        {order.godown?.location?.area}
                      </p>
                    </div>
                  )}
                </div>

                {/* Cart */}
                {itemsArray.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                      Cart ({itemsArray.length} items)
                    </h3>

                    <div className="space-y-2">
                      {itemsWithKeys.map(({ key, item }) => {
                        const kg = computeItemKg(item);
                        const lineTotal = kg * item.product.pricePerKg;

                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900 truncate">
                                {item.product.name}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {formatItemQuantity(item)} • ₹
                                {formatNumber(item.product.pricePerKg)}/kg
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="text-xs font-semibold text-gray-900">
                                ₹{formatNumber(lineTotal)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openQtyModalForItem(key, item)}
                                className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                              >
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(key)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">
                          Subtotal:
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          ₹{formatNumber(calculateTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Details */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                    Details
                  </h3>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Payment Terms <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register("paymentTerms")}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-xs"
                        >
                          {orderService.getPaymentTerms().map((term) => (
                            <option key={term} value={term}>
                              {term}
                            </option>
                          ))}
                        </select>
                        {errors.paymentTerms && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.paymentTerms.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Priority
                        </label>
                        <select
                          {...register("priority")}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-xs"
                        >
                          {orderService.getPriorityOptions().map((priority) => (
                            <option key={priority.value} value={priority.value}>
                              {priority.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Required Date
                        </label>
                        <input
                          type="date"
                          {...register("requiredDate")}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Delivery Instructions
                      </label>
                      <input
                        type="text"
                        {...register("deliveryInstructions")}
                        placeholder="Special delivery instructions"
                        className="w-full px-2.5 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Notes
                      </label>
                      <textarea
                        {...register("notes")}
                        rows={2}
                        placeholder="Additional notes"
                        className="w-full px-2.5 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1 flex flex-col gap-2">
                {/* Captured Location */}
                {order?.captureLocation && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                        Capture Location
                      </h3>
                    </div>
                    <div className="p-3 sm:p-4 space-y-2">
                      <p className="text-xs text-gray-700">
                        {order?.captureLocation?.address}
                      </p>
                      {/* <div className="text-[10px] text-gray-500">
                    <p>Lat: {order?.captureLocation?.latitude}</p>
                    <p>Lng: {order?.captureLocation?.longitude}</p>
                    <p>Time: {formatDateTime(order?.captureLocation?.timestamp)}</p>
                  </div> */}
                    </div>
                  </div>
                )}

                {/* Captured Image */}
                {order?.capturedImage && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                        <CameraIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                        Captured Image
                      </h3>
                    </div>
                    <div className="p-3 sm:p-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleViewImage(
                            order.capturedImage,
                            "Captured Image"
                          );
                        }}
                        className="inline-flex cursor-pointer items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <CameraIcon className="h-4 w-4 mr-2" />
                        View Image
                      </button>
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 sticky top-16">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                    Summary
                  </h3>

                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-emerald-600">
                        {orderService.formatCurrency(totalAmount)}
                      </span>
                    </div>

                    {/* Payment Section */}
                    <div className="border-t border-gray-200 pt-2.5 space-y-1.5">
                      <h4 className="text-[10px] font-semibold text-gray-900 uppercase tracking-wide">
                        Payment
                      </h4>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">Paid</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-gray-500 text-xs">₹</span>
                            <input
                              type="number"
                              {...register("paidAmount")}
                              placeholder="0"
                              min="0"
                              step="0.01"
                              className="w-20 px-1.5 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Remaining</span>
                          <span className="font-medium text-orange-600">
                            {orderService.formatCurrency(remainingAmount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => setValue("paidAmount", totalAmount)}
                            className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded text-white bg-emerald-600 hover:bg-emerald-700 transition-colors active:scale-95"
                          >
                            Mark Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => setValue("paidAmount", 0)}
                            className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors active:scale-95"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Action Buttons */}
                  <div className="hidden lg:block mt-3 space-y-1.5">
                    <button
                      type="submit"
                      disabled={saving || itemsArray.length === 0}
                      onClick={() => {
                        console.log("Desktop Save button clicked! Disabled:", saving || itemsArray.length === 0, "itemsArray.length:", itemsArray.length);
                        console.log("Form errors:", errors);
                        console.log("Form is valid:", Object.keys(errors).length === 0);
                      }}
                      className="w-full flex justify-center items-center py-2 px-3 border border-transparent rounded-lg shadow-sm text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-1.5"></div>
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/orders/${order._id}`)}
                      className="w-full py-2 px-3 border border-gray-300 rounded-lg shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Mobile Bottom Action Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-inset-bottom shadow-lg">
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-500 mb-0.5">
                    Total Amount
                  </div>
                  <div className="text-base font-bold text-emerald-600 truncate">
                    {orderService.formatCurrency(totalAmount)}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/orders/${order._id}`)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving || itemsArray.length === 0}
                    onClick={() => {
                      console.log("Mobile Save button clicked! Disabled:", saving || itemsArray.length === 0, "itemsArray.length:", itemsArray.length);
                      console.log("Form errors:", errors);
                      console.log("Form is valid:", Object.keys(errors).length === 0);
                      console.log("Manually triggering form submission...");
                      handleSubmit(onSubmit)();
                    }}
                    className="px-4 py-2 border border-transparent rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center whitespace-nowrap"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Padding */}
          <div className="lg:hidden h-16"></div>
        </div>
      </div>
      {/* Quantity Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-sm font-semibold text-gray-900">
                {activeProduct.name}
              </h4>
              <button
                type="button"
                onClick={closeQtyModal}
                className="p-1 rounded hover:bg-gray-100 active:scale-95"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="text-[10px] text-gray-500 mb-3">
              ₹{formatNumber(activeProduct.pricePerKg)}/kg
              {activeProduct.bagSizeKg
                ? ` • ${activeProduct.bagSizeKg}kg bag`
                : ""}
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
                  if (activeProduct.bagSizeKg === 40 ||activeProduct.bagSizeKg === 5) {
                    // For 40kg products, only show 40kg bag option
                    presetOptions.push({
                      label: "40kg (bag)",
                      value: 40,
                      isBag: true,
                      bagSize: 40,
                    });
                  } 
                  
                  if (activeProduct.bagSizeKg && activeProduct.bagSizeKg !== 5 && activeProduct.bagSizeKg !== 40) {
                    // For other bag sizes, show the specific bag option
                    presetOptions.push({
                      label: `${activeProduct.bagSizeKg}kg Bag`,
                      value: activeProduct.bagSizeKg,
                      isBag: true,
                      bagSize: activeProduct.bagSizeKg,
                    });
                  }

                  return presetOptions.map((preset) => (
                    <button
                      key={`${preset.label}-${preset.value}-${preset.bagSize || 'loose'}`}
                      type="button"
                      onClick={() => {
                        if (preset.isBag && preset.bagSize) {
                          setIsBagSelection(true);
                          setCurrentBagSize(preset.bagSize);
                          setBagPieces(1);
                          setKg(preset.bagSize);
                        } else {
                          setIsBagSelection(false);
                          setKg(preset.value);
                          setBagPieces(1);
                        }
                      }}
                      className="flex-1 px-2 py-1 text-[10px] border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-600 active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ));
                })()}
              </div>
            </div>
            
            {/* Bag Selection Controls */}
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
                      setKg(count * currentBagSize);
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
                type="button"
                onClick={closeQtyModal}
                className="px-3 py-1.5 rounded-lg border text-xs active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmQty}
                className="px-4 py-1.5 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 text-xs active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <Modal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          title="Captured Image"
        >
          <div className="p-4">
            <img
              src={selectedImage}
              alt="Captured"
              className="w-full h-auto max-h-96 object-contain rounded-lg"
              onError={(e) => {
                console.error("Failed to load image:", selectedImage);
                e.currentTarget.src =
                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+";
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
};

export default EditOrderPage;
