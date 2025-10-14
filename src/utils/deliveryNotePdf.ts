import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import React from "react";
import ReactDOM from "react-dom/client";
import type { Order, DeliveryTimePdfChanges } from "../types";
import DeliveryInvoiceTemplate from "../components/delivery/DeliveryInvoiceTemplate";
import { orderService } from "../services/orderService";

// A4 dimensions in pixels at 96 DPI
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

// Helper function to transform Order data to match DeliveryInvoiceTemplate expected format
const transformOrderToDeliveryData = (
  order: Order,
  deliveryTimePdfChanges?: DeliveryTimePdfChanges
) => {
  return {
    company: {
      name: "Dullet Industries",
      address: "KK. No. 24/38 KH No. 41/127 Main Majri, Bassi Pathana",
      city: "Fatehgarh Saheb",
      state: "Punjab",
      pincode: "140407",
      gstin: "03AATFD7213P1Z0",
      hsnCode: "110100",
      pan: "AATFD7213P",
    },
    order: {
      _id: order._id,
      type: "order",
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customer: {
        ...order.customer,
        customerId:
          order.customer?.customerId ||
          `CUST${Date.now().toString().slice(-4)}`,
        __v: 0,
      },
      godown: order.godown || {
        _id: "default",
        name: "Default Godown",
        location: {
          city: "Fatehgarh Saheb",
          state: "Punjab",
        },
        contact: {
          phone: "+91 90329 20022",
          email: "dulletindustries@gmail.com",
        },
      },
      items:
        deliveryTimePdfChanges?.items?.map((item, index) => ({
          ...item,
          _id: item._id || `item_${index}_${Date.now()}`,
          grade: item.grade || "",
          isBagSelection: true,
        })) || [],
      subtotal: deliveryTimePdfChanges?.subTotal,
      totalAmount: deliveryTimePdfChanges?.totalAmount,
      taxAmount: deliveryTimePdfChanges?.taxAmount ?? 0,
      previousBalance: deliveryTimePdfChanges?.previousBalance ?? 0,
      discount: order.discount,
      discountPercentage: order.discountPercentage || 0,
      paidAmount: deliveryTimePdfChanges?.paidAmount,
      netBalanceRemaining: deliveryTimePdfChanges?.netBalanceRemaining,
      paymentStatus: order.paymentStatus,
      paymentTerms: order.paymentTerms,
      status: order.status,
      priority: order.priority || "normal",
      isTaxable: order?.isTaxable || false,
      taxPercentage: order?.taxPercentage || 0,
      managerApproval: order.approvedBy
        ? {
            _id: (order.approvedBy as any)?._id || order.approvedBy,
          }
        : undefined,
      driverAssignment: order.driverAssignment
        ? {
            ...order.driverAssignment,
            _id: `driver_${Date.now()}`,
            driverNotes: order.driverAssignment.driverNotes || "",
          }
        : undefined,
      signatures: order.signatures
        ? {
            ...order.signatures,
            _id: `sig_${Date.now()}`,
          }
        : undefined,
      deliveryAddress: order.deliveryAddress || {
        country: "India",
      },
      deliveryInstructions: order.deliveryInstructions || "",
      notes: order.notes || "",
      internalNotes: order.internalNotes || "",
      createdBy: order.createdBy,
      createdByRole: (order.createdBy as any)?.role || "Admin",
      approvedBy: order.approvedBy,
      settlements: order.settlements || [],
      capturedImage: order.capturedImage,
      captureLocation: order.captureLocation,
      requiredDate: order.requiredDate || null,
      updatedBy: order.updatedBy,
      __v: 0,
    },
  };
};

// Helper function to convert component to image
const convertComponentToImage = async (deliveryData: any): Promise<string> => {
  // Create a temporary container for rendering the component
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "-9999px";
  tempContainer.style.top = "-9999px";
  tempContainer.style.width = `${A4_WIDTH_PX}px`;
  tempContainer.style.background = "white";
  tempContainer.style.padding = "15px";
  tempContainer.style.margin = "0";
  tempContainer.style.boxSizing = "border-box";
  tempContainer.style.fontFamily = '"DejaVu Sans", Arial, sans-serif';
  tempContainer.style.fontSize = "12px";
  tempContainer.style.lineHeight = "1.3";
  tempContainer.style.overflow = "hidden";
  tempContainer.className = "pdf-generation-container";
  document.body.appendChild(tempContainer);

  // Create React root and render the component
  const root = ReactDOM.createRoot(tempContainer);

  return new Promise((resolve, reject) => {
    root.render(
      React.createElement(
        "div",
        { className: "delivery-invoice pdf-generation" },
        React.createElement(DeliveryInvoiceTemplate, {
          data: deliveryData,
        })
      )
    );

    // Wait for component to render completely
    setTimeout(async () => {
      try {
        // Convert the rendered component to canvas
        const canvas = await html2canvas(tempContainer, {
          scale: 1.5, // Balanced scale for quality and performance
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          removeContainer: false,
          imageTimeout: 0,
          width: A4_WIDTH_PX,
          height: tempContainer.scrollHeight,
          onclone: (clonedDoc) => {
            // Ensure all styles are applied in the cloned document
            const clonedContainer = clonedDoc.querySelector(
              ".pdf-generation-container"
            ) as HTMLElement;
            if (clonedContainer) {
              clonedContainer.style.width = `${A4_WIDTH_PX}px`;
              clonedContainer.style.background = "white";
              clonedContainer.style.padding = "15px";
              clonedContainer.style.fontFamily =
                '"DejaVu Sans", Arial, sans-serif';
              clonedContainer.style.overflow = "hidden";
            }

            // Apply PDF-specific styles to the delivery invoice
            const deliveryInvoice = clonedDoc.querySelector(
              ".delivery-invoice"
            ) as HTMLElement;
            if (deliveryInvoice) {
              deliveryInvoice.classList.add("pdf-generation");
            }
          },
        });

        // Convert canvas to base64 image
        const imageData = canvas.toDataURL("image/png", 1.0);

        // Clean up
        root.unmount();
        document.body.removeChild(tempContainer);

        resolve(imageData);
      } catch (error) {
        // Clean up on error
        try {
          root.unmount();
          document.body.removeChild(tempContainer);
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
        reject(error);
      }
    }, 4000); // Wait longer for complete rendering and font loading
  });
};

// Helper function to convert image to PDF
const convertImageToPDF = (
  imageData: string,
  fileName: string,
  downloadDirectly: boolean = true
): Promise<Blob | void> => {
  return new Promise((resolve) => {
    // Create a new image to get dimensions
    const img = new Image();
    img.onload = () => {
      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Get PDF dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions to fit A4 with margins
      const margin = 10; // 10mm margin
      const maxWidth = pdfWidth - margin * 2;
      const maxHeight = pdfHeight - margin * 2;

      // Calculate scaling to maintain aspect ratio
      const imgAspectRatio = img.width / img.height;
      const pdfAspectRatio = maxWidth / maxHeight;

      let finalWidth, finalHeight;

      if (imgAspectRatio > pdfAspectRatio) {
        // Image is wider, scale by width
        finalWidth = maxWidth;
        finalHeight = maxWidth / imgAspectRatio;
      } else {
        // Image is taller, scale by height
        finalHeight = maxHeight;
        finalWidth = maxHeight * imgAspectRatio;
      }

      // Center the image on the page
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;

      // Add image to PDF
      pdf.addImage(imageData, "PNG", xOffset, yOffset, finalWidth, finalHeight);

      if (downloadDirectly) {
        pdf.save(fileName);
        resolve();
      } else {
        const blob = pdf.output("blob");
        resolve(blob);
      }
    };

    img.src = imageData;
  });
};

export const generateDeliveryNotePDF = async (
  order: Order,
  downloadDirectly: boolean = true
): Promise<Blob | void> => {
  try {
    // Step 1: Fetch or create deliveryTimePdfChanges data
    let deliveryTimePdfChanges: DeliveryTimePdfChanges | undefined;

    try {
      deliveryTimePdfChanges =
        await orderService.getOrCreateDeliveryTimePdfChanges(order._id);
    } catch (error) {
      console.warn(
        "Failed to fetch/create delivery time PDF changes, using order data:",
        error
      );
      // Continue with order data if deliveryTimePdfChanges fails
      deliveryTimePdfChanges = undefined;
    }

    // Step 2: Transform order data to match DeliveryInvoiceTemplate format
    const deliveryData = transformOrderToDeliveryData(
      order,
      deliveryTimePdfChanges
    );

    // Step 3: Convert component to image
    const imageData = await convertComponentToImage(deliveryData);

    // Step 4: Convert image to PDF
    const fileName = `Delivery_Note_${order.orderNumber}_${new Date()
      .toLocaleDateString("en-IN")
      .replace(/\//g, "-")}.pdf`;

    return await convertImageToPDF(imageData, fileName, downloadDirectly);
  } catch (error) {
    console.error("Error generating delivery note PDF:", error);
    throw error;
  }
};

export const getDeliveryNotePDFFileName = (order: Order): string => {
  return `Delivery_Note_${order.orderNumber}_${new Date()
    .toLocaleDateString("en-IN")
    .replace(/\//g, "-")}.pdf`;
};

// Helper function to fetch deliveryTimePdfChanges data for an order
export const fetchDeliveryTimePdfChanges = async (
  orderId: string
): Promise<DeliveryTimePdfChanges | null> => {
  try {
    const deliveryTimePdfChanges =
      await orderService.getOrCreateDeliveryTimePdfChanges(orderId);
    return deliveryTimePdfChanges;
  } catch (error) {
    console.error("Error fetching delivery time PDF changes:", error);
    return null;
  }
};
