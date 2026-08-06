import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { inr } from "@/lib/gym-store";
import { supabase, getActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses — IronSync" }] }),
  component: Expenses,
});

const CATS: string[] = ["Rent", "Water", "Electricity", "Equipment", "Staff", "Other"];

function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Other");

  // Fetch expenses for the current branch only
  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    supabase
      .from("expenses")
      .select("*")
      .eq("branch_id", branchId)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setExpenses(data ?? []);
      });
  }, []);

  const total = expenses.reduce((a, e) => a + (e.amount ?? 0), 0);

  const byCat = CATS.map((c) => ({
    c,
    total: expenses.filter((e) => e.category === c).reduce((a, e) => a + (e.amount ?? 0), 0),
  }));

  // Add a new expense
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const branchId = getActiveBranchId();
    if (!branchId) {
      toast.error("No branch selected");
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        branch_id: branchId,
        title: title.trim(),
        amount: +amount,
        category,
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      setExpenses((prev) => [data, ...prev]);
      setTitle("");
      setAmount("");
      setCategory("Other");
      toast.success("Expense added successfully");
    } else {
      toast.error(error?.message || "Failed to add expense");
    }
  }

  // Delete an expense
  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (!error) {
      setExpenses((prev) => prev.filter((x) => x.id !== id));
      toast.success("Expense deleted successfully");
    } else {
      toast.error("Failed to delete expense");
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] w-full">
      <PageHeader 
        title="Expenses" 
        subtitle={`Total: ${inr(total)} across ${expenses.length} entries`} 
      />

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {byCat.map(({ c, total }) => (
          <div key={c} className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{c}</span>
            <span className="font-heading text-base sm:text-lg font-bold">{inr(total)}</span>
          </div>
        ))}
      </div>

      {/* Add Expense Form */}
      <form onSubmit={add} className="bg-card border border-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-[1fr,140px,140px,auto] gap-3 mb-6">
        <input
          placeholder="What for?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inp}
          required
        />
        <input
          type="number"
          placeholder="Amount ₹"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inp}
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inp}
        >
          {CATS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="px-5 py-2.5 bg-brand text-brand-foreground rounded-lg font-semibold text-sm hover:scale-[1.01] transition-transform cursor-pointer text-center">
          Add Expense
        </button>
      </form>

      {/* Expenses Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Desktop view */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="px-6 py-3">Date</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-secondary/30">
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(e.date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-medium">{e.title}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-secondary text-xs rounded font-medium">{e.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{inr(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="text-muted-foreground hover:text-danger p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    No expenses recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-border">
          {expenses.map((e) => (
            <div key={e.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{e.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(e.date).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <span className="font-mono font-bold text-sm text-foreground">
                  {inr(e.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="px-2 py-0.5 bg-secondary text-[10px] rounded font-medium text-muted-foreground">
                  {e.category}
                </span>
                <button
                  onClick={() => deleteExpense(e.id)}
                  className="text-muted-foreground hover:text-danger p-1.5"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No expenses recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = "px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40 w-full";