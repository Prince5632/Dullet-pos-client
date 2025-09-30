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
} from "../../types";
import { toast } from "react-hot-toast";
import Modal from "../../components/ui/Modal";

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
    | "Loose";
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
  const [kg, setKg] = useState(0);
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

  // Convert OrderItems to SelectedItems when products and order are loaded
  useEffect(() => {
    if (products.length > 0 && orderItems.length > 0) {
      const convertedItems: Record<string, SelectedItem> = {};

      orderItems.forEach((item) => {
        // Try to find matching product by name
        const matchingProduct = products.find(
          (p) =>
            p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
            item.productName.toLowerCase().includes(p.name.toLowerCase())
        );

        if (matchingProduct) {
          convertedItems[matchingProduct.key] = {
            product: matchingProduct,
            mode: "kg",
            quantityKg: item.quantity,
            packaging: item.packaging || "Loose",
          };
        }
      });

      setSelectedItems(convertedItems);
    }
  }, [products, orderItems]);

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
    } else {
      setKg(0);
    }
  };

  const closeQtyModal = () => {
    setActiveProduct(null);
  };

  const confirmQty = () => {
    if (!activeProduct) return;
    if (!kg || kg <= 0) {
      toast.error("Enter valid kilograms");
      return;
    }

    const item: SelectedItem = {
      product: activeProduct,
      mode: "kg",
      quantityKg: kg,
      packaging: "Loose",
    };
    setSelectedItems((prev) => ({ ...prev, [activeProduct.key]: item }));
    setActiveProduct(null);
  };

  const removeItem = (key: string) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const computeItemKg = (it: SelectedItem) => it.quantityKg || 0;

  const itemsArray = useMemo(
    () => Object.values(selectedItems),
    [selectedItems]
  );

  const calculateTotal = () => {
    return itemsArray.reduce(
      (sum, it) => sum + computeItemKg(it) * it.product.pricePerKg,
      0
    );
  };
  const formatImageSrc = (imageData: string | undefined): string => {
    if (!imageData) return "";

    // If it's already a complete URL, return as is
    if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      return imageData;
    }

    // If it's a base64 string, return as is
    if (imageData.startsWith("data:image/")) {
      return imageData;
    }

    // Default case - assume it's a base64 string
    return `data:image/jpeg;base64,${imageData}`;
  };
  const handleViewImage = (imageData: string | undefined, title: string) => {
    if (!imageData) return;

    const formattedSrc = formatImageSrc(imageData);
    setSelectedImage(formattedSrc);
    setShowImageModal(true);
  };
  const onSubmit = async (data: UpdateOrderForm) => {
    try {
      if (!order) return;
      setSaving(true);

      // Validate order items
      if (itemsArray.length === 0) {
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

                  {/* Compact grouped products */}
                  {(() => {
                    // Group products by their base name (removing size info)
                    const baseProductGroups = products.reduce(
                      (groups, product) => {
                        let baseName = product.name
                          .replace(/\d+\s*kg\s*/gi, "")
                          .replace(/\s+/g, " ")
                          .trim();

                        if (!groups[baseName]) {
                          groups[baseName] = [];
                        }
                        groups[baseName].push(product);
                        return groups;
                      },
                      {} as Record<string, typeof products>
                    );

                    // Categorize the base products
                    const categorizedProducts = Object.entries(
                      baseProductGroups
                    ).reduce((categories, [baseName, variants]) => {
                      let category = "Other";

                      if (
                        baseName.toLowerCase().includes("chakki") &&
                        baseName.toLowerCase().includes("atta")
                      ) {
                        category = "Chakki Fresh Atta";
                      } else if (
                        baseName.toLowerCase().includes("wheat") &&
                        !baseName.toLowerCase().includes("chakki")
                      ) {
                        category = "Wheat Products";
                      } else if (baseName.toLowerCase().includes("flour")) {
                        category = "Flour Products";
                      } else if (baseName.toLowerCase().includes("maida")) {
                        category = "Maida Products";
                      } else if (
                        baseName.toLowerCase().includes("suji") ||
                        baseName.toLowerCase().includes("semolina")
                      ) {
                        category = "Suji/Semolina";
                      } else if (baseName.toLowerCase().includes("besan")) {
                        category = "Besan Products";
                      }

                      if (!categories[category]) {
                        categories[category] = [];
                      }
                      categories[category].push([baseName, variants]);
                      return categories;
                    }, {} as Record<string, Array<[string, typeof products]>>);

                    return (
                      <div className="space-y-3">
                        {Object.entries(categorizedProducts).map(
                          ([category, baseProducts]) => (
                            <div key={category}>
                              <h4 className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                                {category}
                              </h4>
                              <div className="space-y-1.5">
                                {baseProducts.map(([baseName, variants]) => {
                                  const hasSelectedVariant = variants.some(
                                    (v) => !!selectedItems[v.key]
                                  );
                                  const selectedCount = variants.filter(
                                    (v) => !!selectedItems[v.key]
                                  ).length;

                                  return (
                                    <div
                                      key={baseName}
                                      className={`border rounded-lg p-2.5 transition-all duration-200 ${
                                        hasSelectedVariant
                                          ? "bg-emerald-50 border-emerald-300"
                                          : "bg-white border-gray-200 hover:border-gray-300"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs font-semibold text-gray-900 truncate">
                                              {baseName}
                                            </h4>
                                            <span className="text-[10px] text-gray-500 flex-shrink-0">
                                              ₹
                                              {formatNumber(
                                                variants[0].pricePerKg
                                              )}
                                              /kg
                                            </span>
                                            {hasSelectedVariant && (
                                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                {selectedCount}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Package size buttons */}
                                        <div className="flex gap-1 ml-2">
                                          {variants.map((variant) => {
                                            const isSelected =
                                              !!selectedItems[variant.key];
                                            return (
                                              <button
                                                type="button"
                                                key={variant.key}
                                                onClick={() =>
                                                  openQtyModal(variant)
                                                }
                                                className={`px-2 py-1 rounded text-[10px] font-medium transition-all duration-200 ${
                                                  isSelected
                                                    ? "bg-emerald-600 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700 active:scale-95"
                                                }`}
                                              >
                                                {variant.bagSizeKg
                                                  ? `${variant.bagSizeKg}kg`
                                                  : "Loose"}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Show selected quantities inline */}
                                      {hasSelectedVariant && (
                                        <div className="mt-1.5 pt-1.5 border-t border-emerald-200">
                                          <div className="flex flex-wrap gap-1">
                                            {variants
                                              .filter(
                                                (v) => !!selectedItems[v.key]
                                              )
                                              .map((variant) => {
                                                const item =
                                                  selectedItems[variant.key];
                                                const kg = item.quantityKg || 0;

                                                return (
                                                  <div
                                                    key={variant.key}
                                                    className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded"
                                                  >
                                                    {variant.bagSizeKg
                                                      ? `${variant.bagSizeKg}kg`
                                                      : "Loose"}
                                                    : {formatNumber(kg)}kg
                                                  </div>
                                                );
                                              })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Cart */}
                {itemsArray.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                      Cart ({itemsArray.length} items)
                    </h3>

                    <div className="space-y-2">
                      {itemsArray.map((item, index) => {
                        const kg = computeItemKg(item);
                        const lineTotal = kg * item.product.pricePerKg;

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900 truncate">
                                {item.product.name}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {formatNumber(kg)}kg × ₹
                                {formatNumber(item.product.pricePerKg)}/kg
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="text-xs font-semibold text-gray-900">
                                ₹{formatNumber(lineTotal)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openQtyModal(item.product)}
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
                                onClick={() => removeItem(item.product.key)}
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
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                      disabled={saving || orderItems.length === 0}
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
                    type="submit"
                    disabled={saving || orderItems.length === 0}
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
                  onClick={() => setKg(Math.max(0, kg - 1))}
                  disabled={kg <= 0}
                  className="px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-medium active:scale-95"
                >
                  -
                </button>
                <input
                  type="number"
                  value={kg === 0 ? "" : kg}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setKg(0);
                    } else {
                      const num = Math.max(0, Number(value));
                      setKg(num);
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
                  onClick={() => setKg(kg + 1)}
                  className="px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-medium active:scale-95"
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                {[5, 10, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setKg(preset)}
                    className="flex-1 px-2 py-1 text-[10px] border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-600 active:scale-95"
                  >
                    {preset}kg
                  </button>
                ))}
              </div>
            </div>

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
