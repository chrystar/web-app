"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Loader, Search, Filter, AlertCircle } from "lucide-react";

interface OrderItem {
  id: string;
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  guest_user_id: string | null;
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
  order_status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "completed";
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();
      // Handle both single order and array of orders
      const ordersArray = Array.isArray(data) ? data : [data];
      setOrders(ordersArray.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order["order_status"]) => {
    try {
      setUpdatingId(orderId);
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, order_status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update order status");
      }
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNotesChange = async (orderId: string, notes: string) => {
    try {
      setUpdatingId(orderId);
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, notes }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update order notes");
      }
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, notes } : o));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notes");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: Order["order_status"]) => {
    const colors: Record<Order["order_status"], string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      processing: "bg-purple-100 text-purple-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      completed: "bg-emerald-100 text-emerald-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: Order["order_status"]) => {
    const icons: Record<Order["order_status"], string> = {
      pending: "⏳",
      confirmed: "✓",
      processing: "⚙️",
      shipped: "📦",
      delivered: "🚚",
      completed: "✅",
    };
    return icons[status] || "•";
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.order_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.order_status === "pending").length,
    processing: orders.filter(o => o.order_status === "processing").length,
    shipped: orders.filter(o => o.order_status === "shipped").length,
    delivered: orders.filter(o => o.order_status === "delivered").length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Orders Management</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-sm text-slate-600">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-slate-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <p className="text-sm text-slate-600">Processing</p>
            <p className="text-2xl font-bold text-purple-600">{stats.processing}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <p className="text-sm text-slate-600">Shipped</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.shipped}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-slate-600">Delivered</p>
            <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <Filter className="w-5 h-5 text-slate-600 mt-2" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <p className="ml-3 text-slate-600">Loading orders...</p>
          </div>
        )}

        {/* Orders List */}
        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-slate-600">No orders found</p>
          </div>
        )}

        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow"
              >
                {/* Order Header */}
                <button
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{order.id}</p>
                      <p className="text-sm text-slate-600 truncate">{order.customer_name}</p>
                    </div>
                    <div className="hidden sm:block min-w-0">
                      <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(order.order_status)}`}>
                        {getStatusIcon(order.order_status)} {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                      </span>
                    </div>
                    <div className="text-right min-w-0">
                      <p className="font-semibold text-slate-900">₦{order.total.toLocaleString()}</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${
                      expandedId === order.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Order Details */}
                {expandedId === order.id && (
                  <div className="border-t border-slate-200 px-6 py-6 bg-slate-50 space-y-6">
                    {/* Customer & Delivery Info */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Customer Info</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-slate-600">Name:</span> <span className="font-medium">{order.customer_name}</span></p>
                          <p><span className="text-slate-600">Email:</span> <span className="font-medium">{order.customer_email}</span></p>
                          <p><span className="text-slate-600">Phone:</span> <span className="font-medium">{order.customer_phone}</span></p>
                          <p><span className="text-slate-600">Date:</span> <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span></p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Delivery Info</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-slate-600">Address:</span> <span className="font-medium">{order.delivery_address}</span></p>
                          <p><span className="text-slate-600">LGA:</span> <span className="font-medium">{order.delivery_lga}</span></p>
                          <p><span className="text-slate-600">Payment:</span> <span className="font-medium capitalize">{order.payment_method}</span></p>
                          <p><span className="text-slate-600">Reference:</span> <span className="font-medium text-xs">{order.payment_reference}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Status Update */}
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Update Status</h4>
                      <select
                        value={order.order_status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as Order["order_status"])}
                        disabled={updatingId === order.id}
                        className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Delivery Notes</h4>
                      <textarea
                        value={order.notes || ""}
                        onChange={(e) => handleNotesChange(order.id, e.target.value)}
                        disabled={updatingId === order.id}
                        placeholder="Add delivery notes, special instructions, etc..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed text-sm"
                        rows={3}
                      />
                    </div>

                    {/* Order Items */}
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Order Items</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-slate-300 bg-slate-100">
                            <tr>
                              <th className="text-left py-2 px-2 text-slate-700">Product</th>
                              <th className="text-right py-2 px-2 text-slate-700">Price</th>
                              <th className="text-right py-2 px-2 text-slate-700">Qty</th>
                              <th className="text-right py-2 px-2 text-slate-700">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.order_items.map((item: OrderItem, idx: number) => (
                              <tr key={idx} className="border-b border-slate-200">
                                <td className="py-2 px-2 text-slate-900">{item.product_name}</td>
                                <td className="text-right py-2 px-2 text-slate-600">₦{item.product_price.toLocaleString()}</td>
                                <td className="text-right py-2 px-2 text-slate-600">{item.quantity}</td>
                                <td className="text-right py-2 px-2 font-semibold text-slate-900">
                                  ₦{item.subtotal.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Order Total */}
                      <div className="flex justify-end mt-4 pt-4 border-t border-slate-300">
                        <div className="space-y-1 min-w-0">
                          <p className="text-right text-slate-600">Subtotal: ₦{order.subtotal.toLocaleString()}</p>
                          <p className="text-right text-slate-600">Delivery Fee: ₦{order.delivery_fee.toLocaleString()}</p>
                          <p className="text-right font-semibold text-slate-900 text-lg border-t border-slate-300 pt-2">
                            Total: ₦{order.total.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
