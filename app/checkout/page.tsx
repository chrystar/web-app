"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Loader, User } from "lucide-react";
import Image from "next/image";
import { guestAuth, type GuestUser } from "@/lib/guest-auth";

interface CartItem {
  id: number;
  name: string;
  price: number;
  weight: string;
  category: string;
  image_url?: string;
  quantity: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  weight: string;
  description: string;
  category: string;
  image_url?: string;
}

interface Bundle {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  bundle_price: number;
}

interface PaystackTransaction {
  reference: string;
}

interface PaystackSetupConfig {
  key: string | undefined;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  firstname: string;
  lastname: string;
  phone: string;
  metadata: {
    custom_fields: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  onClose: () => void;
  callback: (transaction: PaystackTransaction) => void;
}

interface PaystackPopup {
  setup: (config: PaystackSetupConfig) => { openIframe: () => void };
}

type WindowWithPaystack = Window & {
  PaystackPop?: PaystackPopup;
};

export default function Checkout() {
  const router = useRouter();
  const [bundleIdParam, setBundleIdParam] = useState<string | null>(null);
  const [queryReady, setQueryReady] = useState(false);
  const CHECKOUT_DETAILS_KEY = "checkout_details";
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [selectedLGA, setSelectedLGA] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBundleIdParam(params.get("bundleId"));
    setQueryReady(true);
  }, []);

  useEffect(() => {
    if (!queryReady) return;

    try {
      // First check if guest user is logged in
      const savedSession = guestAuth.getGuestSession();
      if (!savedSession) {
        // Redirect to guest auth if not logged in
        const returnPath = bundleIdParam ? `/checkout?bundleId=${bundleIdParam}` : "/checkout";
        router.push(`/guest-auth?return=${encodeURIComponent(returnPath)}`);
        return;
      }
      
      setGuestUser(savedSession);
      // Pre-fill customer info from guest user
      setCustomerInfo((prev) => ({
        ...prev,
        firstName: savedSession.firstName,
        lastName: savedSession.lastName,
        email: savedSession.email,
        phone: savedSession.phone || "",
      }));

      // Then load saved checkout details (which may override some fields)
      const savedDetails = localStorage.getItem(CHECKOUT_DETAILS_KEY);
      if (!savedDetails) return;

      const parsed = JSON.parse(savedDetails);
      if (parsed?.customerInfo) {
        setCustomerInfo((prev) => ({
          firstName: parsed.customerInfo.firstName || prev.firstName,
          lastName: parsed.customerInfo.lastName || prev.lastName,
          email: parsed.customerInfo.email || prev.email,
          phone: parsed.customerInfo.phone || prev.phone,
          address: parsed.customerInfo.address || prev.address,
        }));
      }
      if (parsed?.selectedLGA) {
        setSelectedLGA(parsed.selectedLGA);
      }
      if (parsed?.paymentMethod) {
        setPaymentMethod(parsed.paymentMethod);
      }
    } catch (error) {
      console.error("Failed to load checkout details:", error);
    }
  }, [router, bundleIdParam, queryReady]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CHECKOUT_DETAILS_KEY,
        JSON.stringify({ customerInfo, selectedLGA, paymentMethod })
      );
    } catch (error) {
      console.error("Failed to save checkout details:", error);
    }
  }, [customerInfo, selectedLGA, paymentMethod]);

  const clearSavedDetails = () => {
    localStorage.removeItem(CHECKOUT_DETAILS_KEY);
    setCustomerInfo({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
    });
    setSelectedLGA("");
    setPaymentMethod("card");
  };

  // Load cart items from localStorage
  useEffect(() => {
    if (!queryReady) return;

    const loadCart = async () => {
      try {
        if (bundleIdParam) {
          const bundleId = Number(bundleIdParam);
          if (Number.isFinite(bundleId)) {
            const bundleResponse = await fetch(`/api/bundles/${bundleId}`);
            if (bundleResponse.ok) {
              const bundle = (await bundleResponse.json()) as Bundle;
              setCartItems([
                {
                  id: bundle.id,
                  name: bundle.title,
                  price: Number(bundle.bundle_price),
                  weight: "Bundle",
                  category: "Bundle",
                  image_url: bundle.image_url || undefined,
                  quantity: 1,
                },
              ]);
              setLoading(false);
              return;
            }
          }
        }

        const savedCart = localStorage.getItem("cart");
        if (!savedCart) {
          setLoading(false);
          return;
        }

        const cart = JSON.parse(savedCart) as { [key: number]: number };
        const items: CartItem[] = [];

        for (const [productId, quantity] of Object.entries(cart)) {
          const response = await fetch(`/api/products/${productId}`);
          if (response.ok) {
            const product = (await response.json()) as Product;
            items.push({
              ...product,
              quantity,
            });
          }
        }

        setCartItems(items);
        setLoading(false);
      } catch (err) {
        console.error("Error loading cart:", err);
        setLoading(false);
      }
    };

    loadCart();
  }, [bundleIdParam, queryReady]);

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const subtotal = calculateSubtotal();
  const deliveryFee = subtotal > 5000 ? 0 : 500;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone || !customerInfo.address || !selectedLGA) {
      alert("Please fill in all fields");
      return;
    }

    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      alert('Paystack configuration missing. Please contact support.');
      return;
    }

    setProcessingPayment(true);

    try {
      // Load Paystack script if not already loaded
      const paystackWindow = window as WindowWithPaystack;

      if (!paystackWindow.PaystackPop) {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const PaystackPop = paystackWindow.PaystackPop;
      if (!PaystackPop) {
        throw new Error('Paystack script failed to load');
      }
      
      const handlePaymentSuccess = (transaction: { reference: string }) => {
        createOrder(transaction.reference).catch((err) => {
          console.error('Order creation failed in callback:', err);
          setProcessingPayment(false);
        });
      };

      PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: customerInfo.email,
        amount: Math.round(total * 100), // Paystack expects amount in kobo (cents)
        currency: 'NGN',
        ref: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstname: customerInfo.firstName,
        lastname: customerInfo.lastName,
        phone: customerInfo.phone,
        metadata: {
          custom_fields: [
            {
              display_name: "Address",
              variable_name: "address",
              value: customerInfo.address
            },
            {
              display_name: "LGA",
              variable_name: "lga",
              value: selectedLGA
            }
          ]
        },
        onClose: () => {
          setProcessingPayment(false);
          alert('Payment window closed.');
        },
        callback: handlePaymentSuccess,
      }).openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment initialization failed. Please try again.');
      setProcessingPayment(false);
    }
  };

  const createOrder = async (paymentReference: string) => {
    try {
      if (!guestUser) {
        throw new Error('Guest user session not found');
      }

      const orderPayload = {
        guestUserId: guestUser.id,
        customerInfo: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address,
        },
        selectedLGA,
        paymentMethod,
        paymentReference,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal,
        deliveryFee,
        total,
      };
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const order = await response.json();

      // Clear cart only for product-based checkout
      if (!bundleIdParam) {
        localStorage.removeItem("cart");
      }
      
      // Stop loading
      setProcessingPayment(false);
      
      // Redirect to order confirmation
      router.push(`/orders/${order.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Order creation error:', errorMessage);
      
      setProcessingPayment(false);
      
      alert(`Failed to create order: ${errorMessage}\n\nPayment was processed. Please contact support with reference: ${paymentReference}`);
    }
  };

  const ABIA_LGAS = [
    "Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North",
    "Isiala Ngwa South", "Isuikwuato", "Nkuku", "Obi Ngwa", "Ohafia", "Osisioma Ngwa",
    "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu Nneochi"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <h1 className="text-xl font-bold text-slate-900">Checkout</h1>
            </div>
            {guestUser && (
              <button
                onClick={() => router.push("/profile")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative group"
                title={`${guestUser.firstName} ${guestUser.lastName}`}
              >
                <User className="w-6 h-6 text-blue-600" />
                <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {guestUser.firstName}
                </span>
              </button>
            )}
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center">
            <p className="text-slate-600 mb-4">Your cart is empty</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Checkout</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-2 gap-4">
                <h2 className="text-xl font-bold text-slate-900">Customer Information</h2>
                <button
                  type="button"
                  onClick={clearSavedDetails}
                  className="text-sm text-slate-600 hover:text-slate-900 underline"
                >
                  Clear saved details
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">Your details are saved automatically for faster checkout next time.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name"
                  value={customerInfo.firstName}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={customerInfo.lastName}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <input
                  type="text"
                  placeholder="Street Address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 sm:col-span-2"
                />
              </div>
            </div>

            {/* Delivery Location */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Delivery Location
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                  <input
                    type="text"
                    value="Abia, Nigeria"
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Local Government Area</label>
                  <select
                    value={selectedLGA}
                    onChange={(e) => setSelectedLGA(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">Select an LGA</option>
                    {ABIA_LGAS.map((lga) => (
                      <option key={lga} value={lga}>
                        {lga}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50" style={{ borderColor: paymentMethod === 'card' ? '#1e293b' : undefined, backgroundColor: paymentMethod === 'card' ? '#f8fafc' : undefined }}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-slate-900">Credit/Debit Card</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50" style={{ borderColor: paymentMethod === 'bank' ? '#1e293b' : undefined, backgroundColor: paymentMethod === 'bank' ? '#f8fafc' : undefined }}>
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={paymentMethod === "bank"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-slate-900">Bank Transfer</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50" style={{ borderColor: paymentMethod === 'ussd' ? '#1e293b' : undefined, backgroundColor: paymentMethod === 'ussd' ? '#f8fafc' : undefined }}>
                  <input
                    type="radio"
                    name="payment"
                    value="ussd"
                    checked={paymentMethod === "ussd"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-slate-900">USSD</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50" style={{ borderColor: paymentMethod === 'pod' ? '#1e293b' : undefined, backgroundColor: paymentMethod === 'pod' ? '#f8fafc' : undefined }}>
                  <input
                    type="radio"
                    name="payment"
                    value="pod"
                    checked={paymentMethod === "pod"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-slate-900">Pay on Delivery</span>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 pb-4 border-b border-slate-200">
                    {item.image_url && (
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">x {item.quantity}</p>
                      <p className="text-sm font-semibold text-slate-900">
                        ₦{(item.price * item.quantity).toLocaleString('en-NG')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toLocaleString('en-NG')}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Delivery Fee</span>
                  <span className={deliveryFee === 0 ? "text-green-600 font-medium" : ""}>
                    {deliveryFee === 0 ? "FREE" : `₦${deliveryFee.toLocaleString('en-NG')}`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t border-slate-200">
                  <span>Total</span>
                  <span>₦{total.toLocaleString('en-NG')}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={processingPayment}
                className="w-full mt-6 px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  'Place Order'
                )}
              </button>

              {/* Continue Shopping */}
              <button
                onClick={() => router.push("/")}
                className="w-full mt-2 px-4 py-3 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
