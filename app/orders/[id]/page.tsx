"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Package, Truck, CheckCircle, Clock, ArrowLeft, Phone, Mail } from "lucide-react";
import Image from "next/image";

interface OrderItem {
  id: string | number;
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string | number;
  guest_user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_lga: string;
  payment_method: string;
  payment_reference: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  order_status: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  order_items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
    icon: <Clock className="w-5 h-5" />,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-800",
    icon: <Package className="w-5 h-5" />,
  },
  shipped: {
    label: "Shipped",
    color: "bg-indigo-100 text-indigo-800",
    icon: <Truck className="w-5 h-5" />,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle className="w-5 h-5" />,
  },
};

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/orders?id=${orderId}`);

        if (!response.ok) {
          throw new Error("Order not found");
        }

        const data = await response.json();
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-bounce" />
          <p className="text-xl text-gray-700 font-medium">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">{error || "We couldn't find your order."}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.pending;
  const formattedDate = new Date(order.created_at).toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const orderCode = String(order.id).slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        {/* Order Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Confirmed</h1>
              <p className="text-gray-600 text-sm mt-1">Order #{orderCode}</p>
            </div>
            <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${statusConfig.color} font-semibold`}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>
          </div>

          <p className="text-gray-700 mb-6">Order placed on {formattedDate}</p>

          {/* Order Progress */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
              <div>
                <p className="font-semibold text-gray-900">Order Confirmed</p>
                <p className="text-sm text-gray-600">Payment received and verified</p>
              </div>
            </div>
            <div className={`flex items-center ${order.order_status !== "pending" ? "" : "opacity-50"}`}>
              <Package className={`w-6 h-6 mr-3 ${order.order_status !== "pending" ? "text-blue-600" : "text-gray-400"}`} />
              <div>
                <p className="font-semibold text-gray-900">Processing</p>
                <p className="text-sm text-gray-600">We're packing your order</p>
              </div>
            </div>
            <div className={`flex items-center ${["shipped", "delivered", "completed"].includes(order.order_status) ? "" : "opacity-50"}`}>
              <Truck className={`w-6 h-6 mr-3 ${["shipped", "delivered", "completed"].includes(order.order_status) ? "text-blue-600" : "text-gray-400"}`} />
              <div>
                <p className="font-semibold text-gray-900">On the Way</p>
                <p className="text-sm text-gray-600">Your order is being delivered</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Delivery Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Recipient</p>
                <p className="font-semibold text-gray-900">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-semibold text-gray-900">{order.delivery_address}</p>
                <p className="text-gray-700">{order.delivery_lga}, Nigeria</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact Information</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone size={16} className="text-gray-600" />
                  <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline">
                    {order.customer_phone}
                  </a>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Mail size={16} className="text-gray-600" />
                  <a href={`mailto:${order.customer_email}`} className="text-blue-600 hover:underline">
                    {order.customer_email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-semibold text-gray-900 capitalize">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Reference</p>
                <p className="font-mono text-sm text-gray-900 break-all">{order.payment_reference}</p>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₦{order.subtotal.toLocaleString("en-NG")}</span>
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">₦{order.delivery_fee.toLocaleString("en-NG")}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">₦{order.total.toLocaleString("en-NG")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.product_name}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">₦{item.product_price.toLocaleString("en-NG")}</p>
                  <p className="text-sm text-gray-600">Subtotal: ₦{item.subtotal.toLocaleString("en-NG")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Notes */}
        {order.notes && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Notes</h2>
            <p className="text-gray-700">{order.notes}</p>
          </div>
        )}

        {/* Support */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-700 mb-4">
            If you have any questions about your order, please contact our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="tel:+2347010000000"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
            >
              📱 Call Us
            </a>
            <a
              href={`mailto:support@frostchicken.com`}
              className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-center"
            >
              📧 Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
