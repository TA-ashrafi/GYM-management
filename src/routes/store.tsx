import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Plus, Trash2, Minus, Receipt, Package, Edit3, X } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { money, type Product, type SaleItem } from "@/lib/gym-store";
import { supabase, fetchMembers, getActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/store")({
  head: () => ({ meta: [{ title: "Supplement Store — IronSync" }] }),
  component: StorePage,
});

const CATEGORIES: Product["category"][] = ["Protein", "PreWorkout", "Vitamins", "Snacks", "Drinks", "Accessory"];
const input = "px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40 w-full";

function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [tab, setTab] = useState<"pos" | "inventory" | "sales">("pos");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [payment, setPayment] = useState<"Cash" | "UPI" | "Card">("Cash");
  const [memberId, setMemberId] = useState("");
  const [customer, setCustomer] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);

  // Fetch data for current branch only
  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    fetchMembers().then(setMembers);

    supabase
      .from("products")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at")
      .then(({ data }) => setProducts(data ?? []));

    supabase
      .from("sales")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSales(data ?? []));
  }, []);

  // Filter products by search
  const filtered = useMemo(() =>
    products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Add product to cart
  function addToCart(p: Product) {
    if (p.stock <= 0) { toast.error("Product out of stock"); return; }
    setCart((c) => {
      const existing = c.find((i) => i.productId === p.id);
      if (existing) {
        if (existing.qty >= p.stock) { toast.error("Stock limit reached"); return c; }
        return c.map((i) => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...c, { productId: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  }

  // Update quantity in cart
  function updateQty(id: string, delta: number) {
    setCart((c) => c.flatMap((i) => {
      if (i.productId !== id) return [i];
      const q = i.qty + delta;
      if (q <= 0) return [];
      return [{ ...i, qty: q }];
    }));
  }

  // Process checkout
  async function checkout() {
    if (cart.length === 0) return;

    const branchId = getActiveBranchId();
    if (!branchId) {
      toast.error("No branch selected");
      return;
    }

    const { error: saleError } = await supabase.from("sales").insert({
      branch_id: branchId,
      items: cart,
      total,
      payment_mode: payment,
      member_id: memberId || null,
      customer: customer || null,
    });

    if (saleError) {
      toast.error("Sale Error: " + saleError.message);
      return;
    }

    // Update stock for each product
    for (const item of cart) {
      await supabase
        .from("products")
        .update({ stock: Math.max(0, (products.find(p => p.id === item.productId)?.stock || 0) - item.qty) })
        .eq("id", item.productId);
    }

    // Refresh data for current branch
    const { data: refreshedProducts } = await supabase
      .from("products")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at");
    const { data: refreshedSales } = await supabase
      .from("sales")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    if (refreshedProducts) setProducts(refreshedProducts);
    if (refreshedSales) setSales(refreshedSales);

    toast.success(`Sale recorded: ${money(total)}`);
    setCart([]);
    setMemberId("");
    setCustomer("");
  }

  const lowStock = products.filter((p) => p.stock <= (p.lowStockAt || 3));
  const totalRevenue = sales.reduce((s, x) => s + (x.total || 0), 0);
  const totalProfit = sales.reduce((s, x) => {
    return s + x.items.reduce((ii: number, it: any) => {
      const p = products.find((pp) => pp.id === it.productId);
      return ii + (it.price - (p?.cost ?? 0)) * it.qty;
    }, 0);
  }, 0);

  return (
    <div className="p-8 max-w-[1600px]">
      <PageHeader
        title="Supplement Store"
        subtitle="POS billing and inventory tracking"
        actions={
          <>
            <button
              onClick={() => setEditing({ id: "", name: "", category: "Protein", price: 0, cost: 0, stock: 0, lowStockAt: 3 } as Product)}
              className="px-4 py-2.5 bg-secondary rounded-xl text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand/10 hover:text-brand"
            >
              <Plus className="size-4" /> Add Product
            </button>
          </>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total Products" value={products.length} />
        <Stat label="Low Stock" value={lowStock.length} tone="warn" />
        <Stat label="Total Revenue" value={money(totalRevenue)} />
        <Stat label="Estimated Profit" value={money(totalProfit)} tone="brand" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-5">
        {[
          ["pos", "POS"],
          ["inventory", "Inventory"],
          ["sales", `Sales History (${sales.length})`]
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm border ${tab === id ? "bg-brand text-brand-foreground border-brand" : "bg-secondary border-border text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* POS Tab */}
      {tab === "pos" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className={input + " mb-4"} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} className="text-left p-4 bg-card border border-border rounded-xl hover:border-brand/40 hover:bg-card/80 transition">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.category}</span>
                    <span className={`text-[10px] px-2 py-1 rounded ${p.stock === 0 ? "bg-danger/15 text-danger" : p.stock <= (p.lowStockAt || 3) ? "bg-warn/15 text-warn" : "bg-brand/10 text-brand"}`}>
                      {p.stock} left
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                  <p className="text-lg font-heading text-foreground">{money(p.price)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Shopping Cart */}
          <div className="bg-card border border-border rounded-2xl p-5 sticky top-24 h-fit">
            <h3 className="font-heading text-lg mb-3 flex items-center gap-2">
              <ShoppingBag className="size-4" /> Cart ({cart.length})
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin mb-4">
              {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Cart is empty</p>}
              {cart.map((i) => (
                <div key={i.productId} className="flex items-center gap-2 p-2 bg-secondary/40 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{i.name}</p>
                    <p className="text-[11px] text-muted-foreground">{money(i.price)} × {i.qty}</p>
                  </div>
                  <button onClick={() => updateQty(i.productId, -1)} className="size-6 rounded bg-secondary hover:bg-danger/10 hover:text-danger grid place-items-center">
                    <Minus className="size-3" />
                  </button>
                  <span className="text-sm font-semibold w-6 text-center">{i.qty}</span>
                  <button onClick={() => updateQty(i.productId, +1)} className="size-6 rounded bg-secondary hover:bg-brand/10 hover:text-brand grid place-items-center">
                    <Plus className="size-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Checkout Details */}
            <div className="space-y-2 mb-3">
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={input}>
                <option value="">-- Walk-in customer --</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.rollNo})</option>)}
              </select>
              {!memberId && (
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name (optional)" className={input} />
              )}
              <div className="flex gap-1">
                {(["Cash", "UPI", "Card"] as const).map((p) => (
                  <button key={p} onClick={() => setPayment(p)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs ${payment === p ? "bg-brand text-brand-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3 flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-heading text-brand">{money(total)}</span>
            </div>
            <button onClick={checkout} disabled={cart.length === 0}
              className="w-full py-2.5 bg-brand text-brand-foreground rounded-xl font-semibold text-sm disabled:opacity-50">
              Checkout
            </button>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {tab === "inventory" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Margin</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const margin = p.price - p.cost;
                const low = p.stock <= (p.lowStockAt || 3);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3"><span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-secondary rounded">{p.category}</span></td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{money(p.cost)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(p.price)}</td>
                    <td className={`px-4 py-3 text-right ${margin > 0 ? "text-brand" : "text-danger"}`}>{money(margin)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${low ? "bg-danger/10 text-danger" : "bg-brand/10 text-brand"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(p)} className="size-8 grid place-items-center rounded bg-secondary hover:bg-brand/10 hover:text-brand inline-flex">
                        <Edit3 className="size-3.5" />
                      </button>
                      <button onClick={async () => {
                        if (!confirm("Delete this product?")) return;
                        await supabase.from("products").delete().eq("id", p.id);
                        setProducts(prev => prev.filter(x => x.id !== p.id));
                        toast.success("Product deleted successfully");
                      }} className="size-8 grid place-items-center rounded bg-secondary hover:bg-danger/10 hover:text-danger inline-flex ml-1">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sales Tab */}
      {tab === "sales" && (
        <div className="space-y-2">
          {sales.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No sales recorded yet.</p>}
          {sales.map((s) => {
            const m = s.member_id ? members.find((x: any) => x.id === s.member_id) : null;
            return (
              <div key={s.id} className="p-4 bg-card border border-border rounded-xl flex items-center gap-4">
                <div className="size-10 rounded-lg bg-brand/10 text-brand grid place-items-center">
                  <Receipt className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{m?.name ?? s.customer ?? "Walk-in"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()} · {s.items.length} items · {s.payment_mode}
                  </p>
                </div>
                <p className="font-heading text-xl text-brand">{money(s.total)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Edit/Add Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg flex items-center gap-2">
                <Package className="size-4" /> {editing.id ? "Edit" : "New"} Product
              </h3>
              <button onClick={() => setEditing(null)}><X className="size-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Name"><input className={input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Category">
                <select className={input} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Product["category"] })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost"><input type="number" className={input} value={editing.cost} onChange={(e) => setEditing({ ...editing, cost: +e.target.value })} /></Field>
                <Field label="Sell Price"><input type="number" className={input} value={editing.price} onChange={(e) => setEditing({ ...editing, price: +e.target.value })} /></Field>
                <Field label="Stock"><input type="number" className={input} value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: +e.target.value })} /></Field>
                <Field label="Low Stock At"><input type="number" className={input} value={editing.lowStockAt} onChange={(e) => setEditing({ ...editing, lowStockAt: +e.target.value })} /></Field>
              </div>
              <button
                onClick={async () => {
                  if (!editing.name.trim()) { toast.error("Product name is required"); return; }

                  const branchId = getActiveBranchId();
                  if (!branchId) {
                    toast.error("No branch selected");
                    return;
                  }

                  if (editing.id) {
                    const { error } = await supabase
                      .from("products")
                      .update({
                        name: editing.name,
                        category: editing.category,
                        price: editing.price,
                        cost: editing.cost,
                        stock: editing.stock,
                        low_stock_at: editing.lowStockAt,
                      })
                      .eq("id", editing.id);
                    if (error) toast.error(error.message);
                  } else {
                    const { error } = await supabase.from("products").insert({
                      branch_id: branchId,
                      name: editing.name,
                      category: editing.category,
                      price: editing.price,
                      cost: editing.cost,
                      stock: editing.stock,
                      low_stock_at: editing.lowStockAt,
                    });
                    if (error) toast.error(error.message);
                  }

                  const { data } = await supabase
                    .from("products")
                    .select("*")
                    .eq("branch_id", branchId)
                    .order("created_at");
                  if (data) setProducts(data);
                  toast.success(editing.id ? "Product updated successfully" : "Product added successfully");
                  setEditing(null);
                }}
                className="w-full py-2.5 bg-brand text-brand-foreground rounded-xl font-semibold text-sm"
              >
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "brand" | "warn" }) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-2xl font-heading mt-1 ${tone === "brand" ? "text-brand" : tone === "warn" ? "text-warn" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}