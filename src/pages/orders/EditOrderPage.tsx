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
    | "40kg Bags";
  isBagSelection?: boolean;
  bagPieces?: number;
};

const schema = yup.object({
  paymentTerms: yup
    .mixed<"Cash" | "Credit" | "Advance" | "Cheque" | "Online">()
    .oneOf(["Cash", "Credit", "Advance", "Cheque", "Online"])
    .required("Payment terms are required"),
  priority: yup
    .mixed<"low" | "normal" | "high" | "urgent">()
    .oneOf(["low", "normal", "high", "urgent"])
    .optional(),
  requiredDate: yup.string().optional(),
  deliveryInstructions: yup.string().optional(),
  notes: yup.string().optional(),
  paidAmount: yup.number().min(0, "Paid amount must be positive").optional(),
  isTaxable: yup.boolean().optional(),
  taxPercentage: yup
    .number()
    .min(0, "Tax percentage must be positive")
    .max(100, "Tax percentage cannot exceed 100")
    .optional(),
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
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null); // Track which item is being edited
  const [kg, setKg] = useState(0);
  const [isBagSelection, setIsBagSelection] = useState(false);
  const [bagPieces, setBagPieces] = useState<number>(1);
  const [currentBagSize, setCurrentBagSize] = useState<number>(40);

  // Godown state
  const [godowns, setGodowns] = useState<Godown[]>([]);

  // Tax state
  const [isTaxable, setIsTaxable] = useState(false);
  const [taxPercentage, setTaxPercentage] = useState(5);

  // Payment state
  const [originalPaidAmount, setOriginalPaidAmount] = useState(0);
  const [additionalPayment, setAdditionalPayment] = useState(0);

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
      isTaxable: false,
      taxPercentage: 5,
    },
  });

  const watchedValues = watch();

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
    const g = godowns.find((gd) => gd._id === order?.godown?._id);
    const rawCity = g?.location?.city;
    const normalizedCity = canonicalCity(rawCity);
    console.log("getCurrentCity debug:", {
      orderGodownId: order?.godown?._id,
      foundGodown: g,
      rawCity,
      normalizedCity,
    });
    return normalizedCity;
  };

  // Helper function to format quantity with bags
  const formatQuantity = (item: any) => {
    if (item.isBagSelection) {
      return `${item.bagPieces} × ${item.packaging}`;
    }
    return `${item.quantityKg}kg`;
  };
  const currentProducts = useMemo(() => {
    const city = getCurrentCity();
    const area = godowns
      .find((g) => g._id === order?.godown?._id)
      ?.location?.area?.toLowerCase();
    const tokensToMatch = [city, area ? `${city}:${area}` : ""].filter(Boolean);

    console.log("currentProducts filtering:", {
      city,
      area,
      tokensToMatch,
      orderGodownId: order?.godown?._id,
      godownsCount: godowns.length,
      productsCount: products.length,
      productsWithTokens: products.filter((p) => Array.isArray(p.cityTokens))
        .length,
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

    console.log(
      "Filtered products:",
      filtered.length,
      filtered.map((p) => ({ name: p.name, cityTokens: p.cityTokens }))
    );

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
        const response = await apiService.get<{ godowns: Godown[] }>(
          API_CONFIG.ENDPOINTS.GODOWNS
        );
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

        // Set original paid amount and reset additional payment
        const originalPaid =
          typeof data.paidAmount === "number" ? data.paidAmount : 0;
        setOriginalPaidAmount(originalPaid);
        setAdditionalPayment(0);
        setValue("paidAmount", originalPaid); // Keep form in sync

        // Set tax fields
        const orderIsTaxable = data.isTaxable || false;
        const orderTaxPercentage = data.taxPercentage || 5;
        setIsTaxable(orderIsTaxable);
        setTaxPercentage(orderTaxPercentage);
        setValue("isTaxable", orderIsTaxable);
        setValue("taxPercentage", orderTaxPercentage);
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
      hasOrderItems: orderItems.length > 0,
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
        availableProducts: currentProducts.map((p) => ({
          name: p.name,
          key: p.key,
          bagSizeKg: p.bagSizeKg,
        })),
      });

      const convertedItems: Record<string, SelectedItem> = {};

      orderItems.forEach((item, index) => {
        console.log("Processing order item:", {
          productName: item.productName,
          quantity: item.quantity,
          packaging: item.packaging,
          isBagSelection: item.isBagSelection,
          itemId: item._id,
          index,
        });

        // Try to find matching product by name from currentProducts (godown-filtered products)
        // This ensures we only match products available in the selected godown
        const matchingProduct = currentProducts.find((p) => {
          const productNameLower = p.name.toLowerCase();
          const itemNameLower = item.productName.toLowerCase();

          // Exact match
          if (productNameLower === itemNameLower) return true;

          // Contains match (both directions)
          if (
            productNameLower.includes(itemNameLower) ||
            itemNameLower.includes(productNameLower)
          )
            return true;

          // Remove common words and try again
          const cleanProductName = productNameLower
            .replace(/\b(atta|flour|kg|bag|bags)\b/g, "")
            .trim();
          const cleanItemName = itemNameLower
            .replace(/\b(atta|flour|kg|bag|bags)\b/g, "")
            .trim();

          if (
            cleanProductName &&
            cleanItemName &&
            (cleanProductName.includes(cleanItemName) ||
              cleanItemName.includes(cleanProductName))
          ) {
            return true;
          }

          return false;
        });

        console.log(
          `Matching product for "${item.productName}":`,
          matchingProduct
            ? {
                name: matchingProduct.name,
                key: matchingProduct.key,
                bagSizeKg: matchingProduct.bagSizeKg,
              }
            : "NOT FOUND"
        );

        if (matchingProduct) {
          const packaging = item.packaging || "Loose";
          // Use isBagSelection from backend if available, otherwise calculate
          const isBagSelection =
            item.isBagSelection !== undefined
              ? item.isBagSelection
              : packaging !== "Loose";
          let bagPieces: number | undefined = undefined;
          let bags: number | undefined = undefined;

          // Calculate bag pieces based on packaging and quantity
          if (isBagSelection) {
            if (packaging === "5kg Bags") {
              bagPieces = Math.round(item.quantity / 5);
              bags = bagPieces;
            } else if (packaging === "40kg Bags") {
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
            packaging: packaging as SelectedItem["packaging"],
            isBagSelection,
            bagPieces,
            bags,
          };

          // Create unique key using item ID if available, otherwise use product key + index
          const uniqueKey = item._id
            ? `${matchingProduct.key}_${item._id}`
            : `${matchingProduct.key}_${index}`;

          console.log(
            `Converted item for "${item.productName}" with key "${uniqueKey}":`,
            convertedItem
          );
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
        willDisableSaveButton: Object.keys(convertedItems).length === 0,
      });
    } else {
      console.log("Conversion skipped - conditions not met:", {
        currentProductsLength: currentProducts.length,
        orderItemsLength: orderItems.length,
        reason:
          currentProducts.length === 0
            ? "No current products"
            : "No order items",
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
      if (existing.isBagSelection && existing.packaging === "5kg Bags") {
        setCurrentBagSize(5);
      } else if (
        existing.isBagSelection &&
        existing.packaging === "40kg Bags"
      ) {
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
    if (item.isBagSelection && item.packaging === "5kg Bags") {
      setCurrentBagSize(5);
    } else if (item.isBagSelection && item.packaging === "40kg Bags") {
      setCurrentBagSize(40);
    } else {
      setCurrentBagSize(item.product.bagSizeKg || 40);
    }
  };

  const closeQtyModal = () => {
    setActiveProduct(null);
    setActiveItemKey(null);
    setEditingItemKey(null); // Clear editing item key
    setIsBagSelection(false);
    setBagPieces(1);
    setCurrentBagSize(40); // Reset to default
  };

  // Function to open quantity modal for adding new items (ignores existing selections)
  const openQtyModalForNewItem = (product: QuickProduct) => {
    setActiveProduct(product);
    setActiveItemKey(null);
    setEditingItemKey(null); // Not editing an existing item

    // Always initialize fresh values for new items
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

  // Function to open quantity modal for editing existing items
  const openQtyModalForExistingItem = (itemKey: string, item: SelectedItem) => {
    setActiveProduct(item.product);
    setActiveItemKey(null); // Not using activeItemKey for editing
    setEditingItemKey(itemKey); // Track which item is being edited
    setKg(item.quantityKg || 0);
    setIsBagSelection(!!item.isBagSelection);
    setBagPieces(item.bagPieces || item.bags || 1);
    // Set currentBagSize based on existing selection
    if (item.isBagSelection && item.packaging === "5kg Bags") {
      setCurrentBagSize(5);
    } else if (item.isBagSelection && item.packaging === "10kg Bags") {
      setCurrentBagSize(10);
    } else if (item.isBagSelection && item.packaging === "25kg Bags") {
      setCurrentBagSize(25);
    } else if (item.isBagSelection && item.packaging === "40kg Bags") {
      setCurrentBagSize(40);
    } else if (item.isBagSelection && item.packaging === "50kg Bags") {
      setCurrentBagSize(50);
    } else {
      setCurrentBagSize(item.product.bagSizeKg || 40);
    }
  };

  const confirmQty = () => {
    if (!activeProduct) return;

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
      } else if (currentBagSize === 10) {
        packaging = "10kg Bags";
      } else if (currentBagSize === 25) {
        packaging = "25kg Bags";
      } else if (currentBagSize === 40) {
        packaging = "40kg Bags";
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
    setActiveItemKey(null);
    setEditingItemKey(null); // Clear editing item key
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
      if (it.packaging === "5kg Bags") {
        actualBagSize = 5;
      } else if (it.packaging === "10kg Bags") {
        actualBagSize = 10;
      } else if (it.packaging === "25kg Bags") {
        actualBagSize = 25;
      } else if (it.packaging === "40kg Bags") {
        actualBagSize = 40;
      } else if (it.packaging === "50kg Bags") {
        actualBagSize = 50;
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
    () =>
      Object.entries(selectedItems).map(([key, item]) => ({ key, ...item })),
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

  const calculateSubtotal = () => {
    return itemsArray.reduce(
      (sum, it) => sum + computeItemKg(it) * it.product.pricePerKg,
      0
    );
  };

  const calculateTaxAmount = () => {
    if (!isTaxable) return 0;
    const subtotal = calculateSubtotal();
    return (subtotal * taxPercentage) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = calculateTaxAmount();
    return subtotal + taxAmount;
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
    console.log(
      "🚀 onSubmit FUNCTION CALLED! This means form submission is working!"
    );
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
        isBagSelection: item.isBagSelection,
        bagPieces: item.bagPieces || 1,
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

      // Determine payment status from total paid amount
      const effectiveTotal = calculateTotal();
      const finalPaidAmount = originalPaidAmount + additionalPayment;
      let paymentStatus: Order["paymentStatus"] | undefined = undefined;
      if (finalPaidAmount >= effectiveTotal) paymentStatus = "paid";
      else if (finalPaidAmount > 0) paymentStatus = "partial";
      else paymentStatus = "pending";
      const payload: UpdateOrderForm = {
        ...data,
        items: convertedOrderItems,
        isTaxable,
        taxPercentage,
        taxAmount: calculateTaxAmount(),
        paidAmount: finalPaidAmount,
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
  const totalPaidAmount = originalPaidAmount + additionalPayment;
  const remainingAmount = Math.max(0, totalAmount - totalPaidAmount);

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

                {/* Selected Products - Click to Edit */}
                {Object.keys(selectedItems).length > 0 && (
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
                        const kg = it.quantityKg || 0;
                        const lineTotal = kg * it.product.pricePerKg;

                        return (
                          <button
                            type="button"
                            key={it.key}
                            onClick={() =>
                              openQtyModalForExistingItem(it.key, it)
                            }
                            className="w-full text-left p-3 rounded-lg border border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 transition-all duration-200 active:scale-[0.99]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">
                                    {it.product.name}
                                  </h4>
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    ₹{formatNumber(it.product.pricePerKg)}/kg
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {formatQuantity(it)} • ₹
                                  {formatNumber(lineTotal)}
                                </div>
                              </div>
                              <button
                                type="button"
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
                        <span className="text-sm font-medium text-gray-700">
                          Total Amount:
                        </span>
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
                        <span className="text-xs text-gray-500">
                          Loading...
                        </span>
                      )}
                      {productsError && (
                        <span className="text-xs text-red-600">
                          {productsError}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* If godown selected but no products match */}
                  {order && currentProducts.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-amber-400 mb-2">
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
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      </div>
                      <div className="text-sm text-amber-600">
                        No products available for the selected godown. Please
                        confirm that this location has assigned catalog items.
                      </div>
                    </div>
                  )}

                  {/* Available products grouped display */}
                  {order &&
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
                      const availableGroups = Object.entries(
                        baseProductGroups
                      ).map(([baseName, variants]) => {
                        return { baseName, variants };
                      });

                      return availableGroups.map(({ baseName, variants }) => (
                        <div key={baseName} className="mb-4 last:mb-0">
                          <div className="grid grid-cols-1 gap-2">
                            {variants.map((variant) => {
                              // Check for any items of this product (including numbered variants)
                              const productItemsInCart = Object.keys(
                                selectedItems
                              ).filter(
                                (key) =>
                                  key === variant.key ||
                                  key.startsWith(`${variant.key}_`)
                              );
                              const hasItemsInCart =
                                productItemsInCart.length > 0;

                              return (
                                <button
                                  type="button"
                                  key={variant.key}
                                  onClick={() =>
                                    openQtyModalForNewItem(variant)
                                  }
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
                                            In Cart{" "}
                                            {productItemsInCart.length > 1
                                              ? `(${productItemsInCart.length})`
                                              : ""}
                                          </span>
                                        )}
                                      </div>
                                      {variant.bagSizeKg && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          Available in {variant.bagSizeKg}kg
                                          bags
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center text-emerald-600">
                                      <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
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
                    {/* Subtotal */}
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">
                        {orderService.formatCurrency(calculateSubtotal())}
                      </span>
                    </div>

                    {/* Tax Amount */}
                    {isTaxable && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          Tax ({taxPercentage}%)
                        </span>
                        <span className="text-gray-900">
                          {orderService.formatCurrency(calculateTaxAmount())}
                        </span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Total</span>
                      <span className="text-emerald-600">
                        {orderService.formatCurrency(totalAmount)}
                      </span>
                    </div>

                    {/* Tax Toggle Section */}
                    <div className="border-t border-gray-200 pt-2.5 space-y-2">
                      <h4 className="text-[10px] font-semibold text-gray-900 uppercase tracking-wide">
                        Tax Settings
                      </h4>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-700">
                                Apply Tax {`${taxPercentage}%`}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isTaxable}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIsTaxable(checked);
                                    setValue("isTaxable", checked);
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                              </label>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {isTaxable
                                ? `${taxPercentage}% tax applied`
                                : "No tax applied"}
                            </p>
                          </div>

                          {isTaxable && (
                            <div className="text-right">
                              <div className="text-xs font-medium text-emerald-600">
                                +
                                {orderService.formatCurrency(
                                  calculateTaxAmount()
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                Tax Amount
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tax Percentage Input */}
                        {isTaxable && (
                          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                            <span className="text-xs font-medium text-gray-700">
                              Tax Rate
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={taxPercentage}
                                onChange={(e) => {
                                  const value = Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      parseFloat(e.target.value) || 0
                                    )
                                  );
                                  setTaxPercentage(value);
                                  setValue("taxPercentage", value);
                                }}
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Section */}
                    <div className="border-t border-gray-200 pt-2.5 space-y-1.5">
                      <h4 className="text-[10px] font-semibold text-gray-900 uppercase tracking-wide">
                        Payment
                      </h4>

                      <div className="space-y-1.5">
                        {/* Original Paid Amount (Read-only) */}
                        {originalPaidAmount > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600">Already Paid</span>
                            <span className="font-medium text-green-600">
                              {orderService.formatCurrency(originalPaidAmount)}
                            </span>
                          </div>
                        )}

                        {/* Additional Payment Input */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">
                            {originalPaidAmount > 0
                              ? "Additional Payment"
                              : "Payment Amount"}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-gray-500 text-xs">₹</span>
                            <input
                              type="number"
                              value={additionalPayment.toString().replace(/^0+(?=\d)/, "")}
                              onChange={(e) => {
                                let value = parseFloat(e.target.value) || 0;
                                const maxAdditional = Math.max(
                                  0,
                                  totalAmount - originalPaidAmount
                                );
                                if (value > maxAdditional) return;
                                setAdditionalPayment(value);
                                setValue(
                                  "paidAmount",
                                  originalPaidAmount + value
                                );
                              }}
                              placeholder="0"
                              // min="0"
                              max={Math.max(
                                0,
                                totalAmount - originalPaidAmount
                              )}
                              step="0.01"
                              className="w-20 px-1.5 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Total Paid Amount */}
                        {originalPaidAmount > 0 && additionalPayment > 0 && (
                          <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1">
                            <span className="text-gray-600 font-medium">
                              Total Paid
                            </span>
                            <span className="font-medium text-blue-600">
                              {orderService.formatCurrency(totalPaidAmount)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Remaining</span>
                          <span className="font-medium text-orange-600">
                            {orderService.formatCurrency(remainingAmount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const maxAdditional = Math.max(
                                0,
                                totalAmount - originalPaidAmount
                              );
                              setAdditionalPayment(maxAdditional);
                              setValue("paidAmount", totalAmount);
                            }}
                            className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded text-white bg-emerald-600 hover:bg-emerald-700 transition-colors active:scale-95"
                          >
                            Pay Remaining
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdditionalPayment(0);
                              setValue("paidAmount", originalPaidAmount);
                            }}
                            className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors active:scale-95"
                          >
                            Clear Additional
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
                        console.log(
                          "Desktop Save button clicked! Disabled:",
                          saving || itemsArray.length === 0,
                          "itemsArray.length:",
                          itemsArray.length
                        );
                        console.log("Form errors:", errors);
                        console.log(
                          "Form is valid:",
                          Object.keys(errors).length === 0
                        );
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
                      console.log(
                        "Mobile Save button clicked! Disabled:",
                        saving || itemsArray.length === 0,
                        "itemsArray.length:",
                        itemsArray.length
                      );
                      console.log("Form errors:", errors);
                      console.log(
                        "Form is valid:",
                        Object.keys(errors).length === 0
                      );
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
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 shadow-lg">
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
                    <div className="text-xs text-gray-500 mt-1">
                      Custom weight
                    </div>
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
                    <div className="text-xs text-gray-500 mt-1">
                      Standard bags
                    </div>
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
                    ? currentBagSize === weight && bagPieces === 1
                    : kg === weight;

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
                    onClick={() =>
                      setKg((prev) => Math.max(0, (Number(prev) || 0) - 0.5))
                    }
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
                        const newPieces = Math.max(
                          1,
                          (Number(bagPieces) || 1) - 1
                        );
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
                <span className="text-sm font-medium text-gray-900">
                  {kg}kg
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-sm font-medium text-emerald-600">
                  ₹{formatNumber(kg * (activeProduct.pricePerKg || 0))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeQtyModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
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
