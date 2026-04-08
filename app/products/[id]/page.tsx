"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Plus, Minus, Share2, Phone, MessageCircle } from "lucide-react";
import Image from "next/image";

interface Product {
  id: number;
  name: string;
  price: number;
  weight: string;
  description: string;
  category: string;
  image_url?: string;
}

interface ContactSettings {
  call_number: string;
  whatsapp_number: string;
}

const normalizePhoneForLink = (value: string) => value.replace(/[^\d+]/g, "");

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [showQuantityControls, setShowQuantityControls] = useState(false);
  const [contactSettings, setContactSettings] = useState<ContactSettings>({
    call_number: "",
    whatsapp_number: "",
  });

  // Load product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error("Product not found");
        const data = await response.json();
        setProduct(data);
        setError("");
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
        // Check if current product is already in cart
        const productId = params.id as string;
        if (parsedCart[productId]) {
          setShowQuantityControls(true);
        }
      } catch (err) {
        console.error("Error loading cart:", err);
      }
    }
  }, [params.id]);

  useEffect(() => {
    const fetchContactSettings = async () => {
      try {
        const response = await fetch("/api/settings/contact");
        if (!response.ok) return;
        const data = await response.json();
        setContactSettings({
          call_number: String(data.call_number || ""),
          whatsapp_number: String(data.whatsapp_number || ""),
        });
      } catch (err) {
        console.error("Error loading contact settings:", err);
      }
    };

    fetchContactSettings();
  }, []);

  const handleCallToOrder = () => {
    const number = normalizePhoneForLink(contactSettings.call_number);
    if (!number) return;
    window.location.href = `tel:${number}`;
  };

  const handleWhatsAppOrder = () => {
    const number = normalizePhoneForLink(contactSettings.whatsapp_number);
    if (!number || !product) return;

    const message = `Hello, I want to order ${product.name} (₦${product.price.toLocaleString("en-NG")}).`;
    const whatsappUrl = `https://wa.me/${number.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const addToCart = () => {
    if (!product) return;
    
    const newCart = {
      ...cart,
      [product.id]: (cart[product.id] || 0) + 1,
    };
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    
    // Show quantity controls
    setShowQuantityControls(true);
  };

  const increaseQuantity = () => {
    if (!product) return;
    const newCart = {
      ...cart,
      [product.id]: (cart[product.id] || 0) + 1,
    };
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const decreaseQuantity = () => {
    if (!product) return;
    if ((cart[product.id] || 0) <= 1) {
      setShowQuantityControls(false);
      const newCart = { ...cart };
      delete newCart[product.id];
      setCart(newCart);
      localStorage.setItem("cart", JSON.stringify(newCart));
    } else {
      const newCart = {
        ...cart,
        [product.id]: (cart[product.id] || 0) - 1,
      };
      setCart(newCart);
      localStorage.setItem("cart", JSON.stringify(newCart));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Product not found"}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go Back
          </button>
        </div>
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
          <div>
            <h1 className="text-xl font-bold text-slate-900">Product Details</h1>
            <p className="text-xs text-slate-500">{product.name}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {product.image_url ? (
                <div className="relative w-full aspect-square bg-slate-100">
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                  <div className="text-8xl">❄️</div>
                </div>
              )}
            </div>
            
            {/* Share Button */}
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700">
              <Share2 className="w-5 h-5" />
              Share Product
            </button>
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-6">
            {/* Title and Price */}
            <div>
              <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">
                {product.category}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                {product.name}
              </h1>
              <p className="text-sm text-slate-500 mb-4">{product.weight}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">
                  ₦{product.price.toLocaleString('en-NG')}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-700 leading-relaxed">{product.description}</p>
            </div>

            {/* Product Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-1">Weight</p>
                <p className="text-lg font-semibold text-slate-900">{product.weight}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-1">Category</p>
                <p className="text-lg font-semibold text-slate-900">{product.category}</p>
              </div>
            </div>

            {/* Add to Cart and Buy Now Buttons */}
            <div className="flex flex-col gap-3">
              {showQuantityControls ? (
                <div className="flex items-center gap-2 bg-slate-900 text-white rounded-lg overflow-hidden">
                  <button
                    onClick={decreaseQuantity}
                    className="p-3 hover:bg-slate-800 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="flex-1 text-center font-bold text-lg">
                    {cart[product.id] || 0}
                  </span>
                  <button
                    onClick={increaseQuantity}
                    className="p-3 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={addToCart}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold text-lg"
                >
                  <ShoppingCart className="w-6 h-6" />
                  Add to Cart
                </button>
              )}
              
              <button
                onClick={() => {
                  // Only add if not already in cart, otherwise go directly to checkout
                  if (!cart[product.id]) {
                    const newCart = {
                      ...cart,
                      [product.id]: 1,
                    };
                    localStorage.setItem("cart", JSON.stringify(newCart));
                  }
                  // Redirect to checkout
                  router.push("/checkout");
                }}
                  className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg"
              >
                Buy Now
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleCallToOrder}
                  disabled={!contactSettings.call_number}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Phone className="w-5 h-5" />
                  Call to Order
                </button>

                <button
                  onClick={handleWhatsAppOrder}
                  disabled={!contactSettings.whatsapp_number}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp Chat
                </button>
              </div>
            </div>

            {/* Stock Info */}
            <div className="text-center">
              <p className="text-sm text-slate-600">
                ✓ In Stock • Free Delivery on Orders Over ₦5,000
              </p>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Related Products</h2>
          <div className="text-center text-slate-500">
            <p>More products coming soon</p>
          </div>
        </div>
      </main>
    </div>
  );
}
