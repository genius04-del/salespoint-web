"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, Minus, Trash2, CircleAlert, ShoppingCart } from "lucide-react";
import type { Business, Category, Customer, Product, Sale, SalePaymentMethod } from "@/lib/types";
import { listProducts, listCategories } from "@/lib/api/products";
import { listCustomers } from "@/lib/api/customers";
import { getBusiness } from "@/lib/api/business";
import { checkout, getSale } from "@/lib/api/sales";
import { initializePaystackPayment } from "@/lib/api/payments";
import { ApiError } from "@/lib/apiClient";
import { ReceiptModal } from "@/components/ReceiptModal";
import { PaystackCheckoutModal } from "@/components/PaystackCheckoutModal";

interface CartLine {
  productId: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

const PAYMENT_METHODS: { value: SalePaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "PAYSTACK", label: "Paystack" },
  { value: "OTHER", label: "Other" },
];

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("CASH");
  const [amountTendered, setAmountTendered] = useState("");

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [saleWarning, setSaleWarning] = useState<string | null>(null);

  const [paystackSession, setPaystackSession] = useState<{
    reference: string;
    authorizationUrl: string;
    amount: number;
  } | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await listProducts({ search: search || undefined, categoryId: categoryFilter || undefined });
      setProducts(res.products.filter((p) => p.isActive));
    } catch {
      // Surfaced via the empty-state message below rather than a separate banner.
    } finally {
      setIsLoadingProducts(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    (async () => {
      await Promise.all([
        listCategories()
          .then((res) => setCategories(res.categories))
          .catch(() => {}),
        listCustomers()
          .then((res) => setCustomers(res.customers))
          .catch(() => {}),
        getBusiness()
          .then((res) => setBusiness(res.business))
          .catch(() => {}),
      ]);
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadProducts, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // Restaurants that deduct stock at day end sell freely: no stock limits on the till.
  const unlimited = !!(business as (Business & { deductStockAtDayEnd?: boolean }) | null)?.deductStockAtDayEnd;

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((l) => l.productId === product.id);
      if (existing) {
        if (!unlimited && existing.quantity >= product.currentQuantity) return current; // can't exceed stock
        return current.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      if (!unlimited && product.currentQuantity < 1) return current;
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          unitPrice: Number(product.sellingPrice),
          quantity: 1,
          maxStock: unlimited ? Number.MAX_SAFE_INTEGER : product.currentQuantity,
        },
      ];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.min(Math.max(l.quantity + delta, 0), l.maxStock) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((current) => current.filter((l) => l.productId !== productId));
  }

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const tenderedAmount = Number(amountTendered) || 0;
  const change = paymentMethod === "CASH" && tenderedAmount > subtotal ? tenderedAmount - subtotal : 0;

  function resetForNewSale() {
    setCart([]);
    setCustomerId("");
    setCustomerEmail("");
    setAmountTendered("");
    setCheckoutError(null);
    setCompletedSale(null);
    setSaleWarning(null);
    setPaystackSession(null);
    loadProducts();
  }

  async function handleCheckout() {
    setCheckoutError(null);
    if (cart.length === 0) return setCheckoutError("Add at least one item to the cart.");

    if (paymentMethod === "PAYSTACK") {
      return handlePaystackInitialize();
    }

    if (paymentMethod === "CASH" && amountTendered !== "" && tenderedAmount < subtotal) {
      return setCheckoutError("Amount tendered is less than the total due.");
    }

    setIsCheckingOut(true);
    try {
      const res = await checkout({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, discount: 0 })),
        customerId: customerId || undefined,
        paymentMethod,
        amountTendered:
          paymentMethod === "CASH" && amountTendered !== "" ? tenderedAmount : undefined,
      });
      setCompletedSale(res.sale);
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : "Checkout failed. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function handlePaystackInitialize() {
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      return setCheckoutError("Enter a valid email — Paystack needs one to open the payment page.");
    }

    setIsCheckingOut(true);
    try {
      const res = await initializePaystackPayment({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, discount: 0 })),
        customerId: customerId || undefined,
        customerEmail: customerEmail.trim(),
      });
      setPaystackSession({
        reference: res.reference,
        authorizationUrl: res.authorizationUrl,
        amount: Number(res.amount),
      });
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : "Could not start the Paystack payment.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function handlePaystackSuccess(saleId: string, reconciliationNeeded: boolean) {
    setPaystackSession(null);
    try {
      const res = await getSale(saleId);
      setCompletedSale(res.sale);
      if (reconciliationNeeded) {
        setSaleWarning(
          "Payment was received, but stock ran short when this was confirmed — a manager should review this sale for reconciliation."
        );
      }
    } catch {
      setCheckoutError("Payment succeeded, but the receipt could not be loaded. Check Sales for this transaction.");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* Product picker */}
      <div>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isLoadingProducts ? (
          <div className="py-16 text-center text-gray-400">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No products found.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const outOfStock = !unlimited && product.currentQuantity < 1;
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={outOfStock}
                  className="flex flex-col items-start rounded-xl bg-white p-3.5 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <span className="mb-1 line-clamp-2 text-sm font-medium text-primary-navy">
                    {product.name}
                  </span>
                  <span className="text-sm font-semibold text-brand-orange">
                    GHS {Number(product.sellingPrice).toFixed(2)}
                  </span>
                  <span className="mt-1 text-xs text-gray-400">
                    {unlimited ? product.unit : outOfStock ? "Out of stock" : `${product.currentQuantity} ${product.unit} left`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart + checkout */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 lg:sticky lg:top-4 lg:h-fit">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-primary-navy">
          <ShoppingCart size={18} />
          Cart
        </h2>

        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Tap a product to add it.</p>
        ) : (
          <div className="mb-4 max-h-80 space-y-2 overflow-y-auto">
            {cart.map((line) => (
              <div key={line.productId} className="flex items-center gap-2 rounded-lg bg-app-background p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary-navy">{line.name}</p>
                  <p className="text-xs text-gray-500">GHS {line.unitPrice.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeQuantity(line.productId, -1)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-200"
                    aria-label="Decrease"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                  <button
                    onClick={() => changeQuantity(line.productId, 1)}
                    disabled={line.quantity >= line.maxStock}
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30"
                    aria-label="Increase"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  onClick={() => removeLine(line.productId)}
                  className="rounded p-1 text-gray-400 hover:bg-danger/10 hover:text-danger"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mb-3 flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-primary-navy">
          <span>Total</span>
          <span>GHS {subtotal.toFixed(2)}</span>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Customer (optional)</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
          >
            <option value="">Walk-in customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Payment method</label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const disabled = m.value === "PAYSTACK" && !business?.paystackConfigured;
              return (
                <button
                  key={m.value}
                  onClick={() => !disabled && setPaymentMethod(m.value)}
                  disabled={disabled}
                  title={disabled ? "Set up Paystack in Settings first" : undefined}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    disabled
                      ? "cursor-not-allowed border-gray-200 text-gray-300"
                      : paymentMethod === m.value
                        ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                        : "border-gray-300 text-gray-600"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          {!business?.paystackConfigured && (
            <p className="mt-1.5 text-xs text-gray-400">
              Paystack isn&apos;t set up yet —{" "}
              <Link href="/dashboard/settings/paystack" className="text-brand-orange hover:underline">
                add your keys in Settings
              </Link>
              .
            </p>
          )}
        </div>

        {paymentMethod === "CASH" && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">Amount tendered (optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountTendered}
              onChange={(e) => setAmountTendered(e.target.value)}
              placeholder={subtotal.toFixed(2)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
            />
            {change > 0 && (
              <p className="mt-1 text-xs font-medium text-success">Change: GHS {change.toFixed(2)}</p>
            )}
          </div>
        )}

        {paymentMethod === "PAYSTACK" && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">Customer email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
            />
            <p className="mt-1 text-xs text-gray-500">Paystack needs this to open the payment page.</p>
          </div>
        )}

        {checkoutError && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            <CircleAlert size={16} className="mt-0.5 shrink-0" />
            <span>{checkoutError}</span>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={isCheckingOut || cart.length === 0}
          className="w-full rounded-lg bg-brand-orange px-4 py-3 font-semibold text-white transition hover:bg-light-orange disabled:opacity-50"
        >
          {isCheckingOut
            ? "Processing…"
            : paymentMethod === "PAYSTACK"
              ? `Pay GHS ${subtotal.toFixed(2)} with Paystack`
              : `Charge GHS ${subtotal.toFixed(2)}`}
        </button>
      </div>

      {paystackSession && (
        <PaystackCheckoutModal
          reference={paystackSession.reference}
          authorizationUrl={paystackSession.authorizationUrl}
          amount={String(paystackSession.amount)}
          onSuccess={handlePaystackSuccess}
          onCancel={() => setPaystackSession(null)}
        />
      )}

      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          business={business}
          warning={saleWarning}
          onNewSale={resetForNewSale}
        />
      )}
    </div>
  );
}
