"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, Truck, Shield, Zap, X, ChevronLeft, ChevronRight, User, Package, Coins, LogOut, Menu, AtSign, Globe, Music2 } from "lucide-react";
import Image from "next/image";
import { guestAuth, type GuestUser } from "@/lib/guest-auth";

interface Product {
  id: number;
  name: string;
  price: number;
  weight: string;
  description: string;
  category: string;
  image_url?: string;
}

interface Banner {
  id: number;
  image_url: string;
  title: string;
  description?: string;
  link_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Bundle {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  bundle_price: number;
  original_price?: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Program {
  id: number;
  title: string;
  description?: string | null;
  program_type: string;
  image_url?: string | null;
  benefits?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ContactSettings {
  call_number: string;
  whatsapp_number: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

const normalizePhoneForLink = (value: string) => value.replace(/[^\d+]/g, "");
const normalizeSocialName = (value: string) =>
  value.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/^@/, "").replace(/^\//, "");

export default function Home() {
  const router = useRouter();
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState("");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [selectedProductForCart, setSelectedProductForCart] = useState<Product | null>(null);
  const [cartQuantity, setCartQuantity] = useState(1);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [contactSettings, setContactSettings] = useState<ContactSettings>({
    call_number: "",
    whatsapp_number: "",
    instagram: "",
    facebook: "",
    tiktok: "",
  });

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await fetch("/api/products", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        setProducts(data);
        setErrorProducts("");
      } catch (err) {
        console.error("Error fetching products:", err);
        setErrorProducts(`Failed to load products: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch banners from Supabase
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoadingBanners(true);
        const response = await fetch("/api/banners", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        const activeBanners = data.filter((banner: Banner) => banner.is_active);
        setBanners(activeBanners.length > 0 ? activeBanners : data);
      } catch (err) {
        console.error("Error fetching banners:", err);
        setBanners([]);
      } finally {
        setLoadingBanners(false);
      }
    };

    fetchBanners();
  }, []);

  // Fetch active bundles from Supabase
  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const response = await fetch("/api/bundles?active=true", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setBundles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching bundles:", err);
        setBundles([]);
      }
    };

    fetchBundles();
  }, []);

  // Fetch active programs from Supabase
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoadingPrograms(true);
        const response = await fetch("/api/programs?active=true", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setPrograms(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching programs:", err);
        setPrograms([]);
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error("Error loading cart:", err);
      }
    }
  }, []);

  // Load guest session from localStorage
  useEffect(() => {
    const savedSession = guestAuth.getGuestSession();
    if (savedSession) {
      setGuestUser(savedSession);
    }
  }, []);

  useEffect(() => {
    const fetchContactSettings = async () => {
      try {
        const response = await fetch("/api/settings/contact");
        if (!response.ok) return;
        const data = await response.json();
        setContactSettings({
          call_number: String(data.call_number || ""),
          whatsapp_number: String(data.whatsapp_number || ""),
          instagram: String(data.instagram || ""),
          facebook: String(data.facebook || ""),
          tiktok: String(data.tiktok || ""),
        });
      } catch (error) {
        console.error("Error loading contact settings:", error);
      }
    };

    void fetchContactSettings();
  }, []);

  // Handle checkout with auth check
  const handleCheckout = () => {
    if (!guestUser) {
      router.push("/guest-auth?return=/checkout");
      return;
    }
    router.push("/checkout");
  };

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoplay, banners.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setAutoplay(false);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
    setAutoplay(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
    setAutoplay(false);
  };

  const closeAddToCartModal = () => {
    setSelectedProductForCart(null);
    setCartQuantity(1);
  };

  const confirmAddToCart = () => {
    if (selectedProductForCart) {
      const newCart = {
        ...cart,
        [selectedProductForCart.id]: (cart[selectedProductForCart.id] || 0) + cartQuantity,
      };
      setCart(newCart);
      localStorage.setItem("cart", JSON.stringify(newCart));
      closeAddToCartModal();
    }
  };

  const addToCart = (productId: number) => {
    const newCart = {
      ...cart,
      [productId]: (cart[productId] || 0) + 1,
    };
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const removeFromCart = (productId: number) => {
    const newCart = { ...cart };
    if (newCart[productId] > 1) {
      newCart[productId] -= 1;
    } else {
      delete newCart[productId];
    }
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = products.reduce((sum, product) => {
    return sum + (product.price * (cart[product.id] || 0));
  }, 0);

  const callNumber = contactSettings.call_number || "+2347010000000";
  const whatsappNumber = contactSettings.whatsapp_number || "+2348010000000";
  const callHref = `tel:${normalizePhoneForLink(callNumber)}`;
  const whatsappHref = `https://wa.me/${normalizePhoneForLink(whatsappNumber).replace(/^\+/, "")}`;
  const instagramName = normalizeSocialName(contactSettings.instagram);
  const facebookName = normalizeSocialName(contactSettings.facebook);
  const tiktokName = normalizeSocialName(contactSettings.tiktok).replace(/^@/, "");

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close menu overlay"
          />

          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl border-r border-slate-200 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">❄️</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Menu</p>
                  <p className="text-xs text-slate-500">Frost Chicken</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            {guestUser ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    router.push("/profile");
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-blue-600" />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    router.push("/orders");
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                >
                  <Package className="w-4 h-4 text-blue-600" />
                  My Orders
                </button>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    router.push("/loyalty");
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                >
                  <Coins className="w-4 h-4 text-amber-500" />
                  My Loyalty
                </button>

                <hr className="my-2" />

                <button
                  onClick={() => {
                    guestAuth.clearGuestSession();
                    setGuestUser(null);
                    setIsDrawerOpen(false);
                    router.push("/");
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    router.push("/guest-auth?return=/");
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Sign In
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">❄️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Frost</h1>
              <p className="text-xs text-slate-500">Premium Chicken</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-3 h-3 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-full mx-auto w-full px-0 sm:px-0 py-0">
        {/* Carousel Banner - Full Width */}
        {loadingBanners ? (
          <div className="relative w-full h-48 sm:h-96 bg-slate-200 animate-pulse flex items-center justify-center mb-4">
            <p className="text-slate-600">Loading banners...</p>
          </div>
        ) : banners.length > 0 ? (
          <div className="relative w-full h-48 sm:h-96 group mb-4">
            <div className="relative w-full h-full">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Image
                    src={banner.image_url}
                    alt={banner.title || `Slide ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  {banner.title && (
                    <div className="absolute inset-0 flex items-center px-8 sm:px-16">
                      <div className="text-white max-w-2xl">
                        <h2 className="text-2xl sm:text-5xl font-bold mb-2">{banner.title}</h2>
                        {banner.description && (
                          <p className="text-sm sm:text-lg text-white/90 mb-6">{banner.description}</p>
                        )}
                        {banner.link_url && (
                          <a
                            href={banner.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-2 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            Learn More
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-6 h-6 text-slate-900" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-6 h-6 text-slate-900" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide ? "bg-white w-8" : "bg-white/50 w-2 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-8">

        {/* Hero */}
        <div className="mb-16">
          <h2 className="text-2xl sm:text-5xl font-bold text-slate-900 mb-4">
            Premium Frozen Chicken
          </h2>
          <p className="text-ls text-slate-600 max-w-2xl mb-8">
            High-quality, freshly frozen chicken delivered to your door. Perfect for every meal.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Fast Delivery</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Secure</span>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Fresh</span>
            </div>
          </div>
        </div>

        {/* Weekend Bundle Section */}
        {bundles.length > 0 && (
          <div className="mb-12">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-8xs font-medium text-slate-900">Weekend Bundle Offers</h3>
              <div className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 animate-pulse select-none">
                <span>Swipe</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  onClick={() => router.push(`/bundles/${bundle.id}`)}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow min-w-[320px] max-w-[360px] w-full flex-shrink-0 snap-start"
                >
                  <div className="flex">
                    {bundle.image_url ? (
                      <div className="relative w-28 sm:w-36 h-32 bg-slate-100 flex-shrink-0">
                        <Image
                          src={bundle.image_url}
                          alt={bundle.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-28 sm:w-36 h-32 bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                        🎁
                      </div>
                    )}

                    <div className="p-4 flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{bundle.title}</h4>
                      {bundle.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{bundle.description}</p>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">
                          ₦{Number(bundle.bundle_price).toLocaleString("en-NG")}
                        </span>
                        {bundle.original_price ? (
                          <span className="text-xs text-slate-500 line-through">
                            ₦{Number(bundle.original_price).toLocaleString("en-NG")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Programs Section */}
        {(loadingPrograms || programs.length > 0) && (
          <div className="mb-12">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-8xs font-medium text-slate-900">Programs</h3>
              <div className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 animate-pulse select-none">
                <span>Swipe</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {loadingPrograms ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                <div className="h-32 min-w-[320px] max-w-[360px] w-full bg-slate-200 animate-pulse rounded-lg" />
                <div className="h-32 min-w-[320px] max-w-[360px] w-full bg-slate-200 animate-pulse rounded-lg" />
                <div className="h-32 min-w-[320px] max-w-[360px] w-full bg-slate-200 animate-pulse rounded-lg" />
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
                {programs.map((program) => (
                  <div
                    key={program.id}
                    onClick={() => router.push(`/programs/${program.id}`)}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow min-w-[320px] max-w-[360px] w-full flex-shrink-0 snap-start cursor-pointer"
                  >
                    <div className="flex">
                      {program.image_url ? (
                        <div className="relative w-28 sm:w-36 h-32 bg-slate-100 flex-shrink-0">
                          <Image
                            src={program.image_url}
                            alt={program.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-28 sm:w-36 h-32 bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                          🤝
                        </div>
                      )}

                      <div className="p-4 flex-1 min-w-0">
                        <span className="inline-flex text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 mb-2">
                          {program.program_type}
                        </span>
                        <h4 className="font-semibold text-slate-900 truncate">{program.title}</h4>
                        {program.description && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{program.description}</p>
                        )}

                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-blue-700 font-semibold">View Program</span>
                          <span className="text-blue-700">→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-8">
          <h3 className="text-8xs font-medium text-slate-900 mb-4">Shop by Category</h3>
          <div className="flex gap-3 overflow-x-auto whitespace-nowrap pb-2 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Products
            </button>
            {["Whole Chicken", "Drumsticks", "Wings", "Breast", "Thighs"].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {errorProducts && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {errorProducts}
          </div>
        )}

        {/* Loading State */}
        {loadingProducts ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">No products available</p>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {products
              .filter((product) => !selectedCategory || product.category === selectedCategory)
              .map((product) => (
              <div
                key={product.id}
                onClick={() => window.location.href = `/products/${product.id}`}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-slate-300 transition-all hover:shadow-md cursor-pointer flex flex-col"
              >
                {/* Product Image - Larger */}
                {product.image_url ? (
                  <div className="relative w-full h-30 bg-slate-100">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-slate-100 to-slate-50 h-40 flex items-center justify-center border-b border-slate-200">
                    <div className="text-6xl">❄️</div>
                  </div>
                )}
                
                {/* Product Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xs font-semibold text-slate-900 mb-3">
                      {product.name}
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xs font-bold text-slate-900">
                      ₦{product.price.toLocaleString('en-NG')}
                    </span>
                    <span className="text-xs text-slate-500">{product.weight}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-sm bg-white shadow-xl flex flex-col max-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Items */}
            {totalItems > 0 ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {products.map((product) =>
                    cart[product.id] ? (
                      <div key={product.id} className="flex gap-4 items-start border-b border-slate-200 pb-4">
                        {/* Product Image with Remove */}
                        <div className="flex flex-col items-center gap-2">
                          {product.image_url ? (
                            <div className="relative w-20 h-20 bg-slate-100 rounded">
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center text-2xl">
                              ❄️
                            </div>
                          )}
                          <button
                            onClick={() => {
                              const newCart = { ...cart };
                              delete newCart[product.id];
                              setCart(newCart);
                              localStorage.setItem("cart", JSON.stringify(newCart));
                            }}
                            className="text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Remove
                          </button>
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm">{product.name}</p>
                          <p className="text-xs text-slate-500 mt-1">In Stock</p>
                        </div>

                        {/* Quantity and Price Controls */}
                        <div className="flex flex-col items-end gap-3">
                          <p className="font-bold text-slate-900">
                            ₦{(product.price * cart[product.id]).toLocaleString('en-NG')}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="p-1.5 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                            >
                              <Minus className="w-4 h-4 text-blue-700" />
                            </button>
                            <span className="w-8 text-center font-semibold text-slate-900">
                              {cart[product.id]}
                            </span>
                            <button
                              onClick={() => addToCart(product.id)}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-white"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-6 space-y-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="font-bold text-slate-900">
                      ₦{totalPrice.toLocaleString('en-NG')}
                    </span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Checkout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500 text-center">Your cart is empty</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add to Cart Modal */}
      {selectedProductForCart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full">
            {/* Header */}
            <div className="border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Add to Cart</h2>
              <button
                onClick={closeAddToCartModal}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Product Info */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-1">
                  {selectedProductForCart.name}
                </h3>
                <p className="text-sm text-slate-500 mb-3">{selectedProductForCart.weight}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    ₦{selectedProductForCart.price.toLocaleString('en-NG')}
                  </span>
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-900">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCartQuantity(Math.max(1, cartQuantity - 1))}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Minus className="w-5 h-5 text-slate-600" />
                  </button>
                  <span className="flex-1 text-center text-2xl font-bold text-slate-900">
                    {cartQuantity}
                  </span>
                  <button
                    onClick={() => setCartQuantity(cartQuantity + 1)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Subtotal:</span>
                  <span className="text-2xl font-bold text-slate-900">
                    ₦{(selectedProductForCart.price * cartQuantity).toLocaleString('en-NG')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-6 space-y-3">
              <button
                onClick={confirmAddToCart}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
              >
                Add to Cart
              </button>
              <button
                onClick={closeAddToCartModal}
                className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12 md:py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Prefer to Order by Phone?</h2>
            <p className="text-blue-100 text-lg">Call us now to place your order directly</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Phone Number 1 */}
            <a
              href={callHref}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all hover:scale-105 cursor-pointer group"
            >
              <div className="text-center">
                <div className="text-4xl mb-3">📱</div>
                <p className="text-blue-100 text-sm mb-2">Call us</p>
                <p className="text-2xl font-bold group-hover:text-blue-200 transition-colors">
                  {callNumber}
                </p>
                <p className="text-blue-100 text-xs mt-2">Available 8am - 8pm</p>
              </div>
            </a>

            {/* Phone Number 2 */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all hover:scale-105 cursor-pointer group"
            >
              <div className="text-center">
                <div className="text-4xl mb-3">📲</div>
                <p className="text-blue-100 text-sm mb-2">WhatsApp us</p>
                <p className="text-2xl font-bold group-hover:text-blue-200 transition-colors">
                  {whatsappNumber}
                </p>
                <p className="text-blue-100 text-xs mt-2">Fast replies guaranteed</p>
              </div>
            </a>
          </div>

          <div className="mt-8 text-center text-blue-100 text-sm">
            <p>💡 Tip: Use the chat or order online for the fastest service</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-600 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm space-y-4">
          <div className="flex items-center justify-center gap-3">
            <a
              href={instagramName ? `https://instagram.com/${instagramName}` : "#"}
              target={instagramName ? "_blank" : undefined}
              rel={instagramName ? "noopener noreferrer" : undefined}
              aria-disabled={!instagramName}
              onClick={(event) => {
                if (!instagramName) {
                  event.preventDefault();
                }
              }}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                instagramName
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-white/5 opacity-70 cursor-not-allowed"
              }`}
              title={instagramName ? "Open Instagram" : "Instagram not configured yet"}
            >
              <AtSign className="w-4 h-4" /> Instagram
            </a>
            <a
              href={facebookName ? `https://facebook.com/${facebookName}` : "#"}
              target={facebookName ? "_blank" : undefined}
              rel={facebookName ? "noopener noreferrer" : undefined}
              aria-disabled={!facebookName}
              onClick={(event) => {
                if (!facebookName) {
                  event.preventDefault();
                }
              }}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                facebookName
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-white/5 opacity-70 cursor-not-allowed"
              }`}
              title={facebookName ? "Open Facebook" : "Facebook not configured yet"}
            >
              <Globe className="w-4 h-4" /> Facebook
            </a>
            <a
              href={tiktokName ? `https://tiktok.com/@${tiktokName}` : "#"}
              target={tiktokName ? "_blank" : undefined}
              rel={tiktokName ? "noopener noreferrer" : undefined}
              aria-disabled={!tiktokName}
              onClick={(event) => {
                if (!tiktokName) {
                  event.preventDefault();
                }
              }}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                tiktokName
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-white/5 opacity-70 cursor-not-allowed"
              }`}
              title={tiktokName ? "Open TikTok" : "TikTok not configured yet"}
            >
              <Music2 className="w-4 h-4" /> TikTok
            </a>
          </div>
          <p>&copy; 2024 Frost Chicken. Premium frozen chicken delivered.</p>
        </div>
      </footer>
    </div>
  );
}
