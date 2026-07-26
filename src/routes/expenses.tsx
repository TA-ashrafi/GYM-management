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

  // Fetch expenses — current branch only
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

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const branchId = getActiveBranchId();
    if (!branchId) {
      toast.error("Branch select nahi hai");
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
      toast.success("Expense added");
    } else {
      toast.error(error?.message || "Failed to add expense");
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (!error) {
      setExpenses((prev) => prev.filter((x) => x.id !== id));
      toast.success("Expense deleted");
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader 
        title="Expenses" 
        subtitle={`Total: ${inr(total)} across ${expenses.length} entries`} 
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {byCat.map(({ c, total }) => (
          <div key={c} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">{c}</span>
            <span className="font-heading text-lg">{inr(total)}</span>
          </div>
        ))}
      </div>

      {/* Add Expense Form */}
      <form onSubmit={add} className="bg-card border border-border rounded-2xl p-4 grid sm:grid-cols-[1fr,140px,140px,auto] gap-3 mb-6">
        <input
          placeholder="What for?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inp}
        />
        <input
          type="number"
          placeholder="Amount ₹"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inp}
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
        <button className="px-5 bg-brand text-brand-foreground rounded-lg font-semibold text-sm">
          Add
        </button>
      </form>

      {/* Expenses Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
              <th className="px-6 py-3">Date</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3"></th>
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
                  <span className="px-2 py-0.5 bg-secondary text-xs rounded">{e.category}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{inr(e.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteExpense(e.id)}
                    className="text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  No expenses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp = "px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40";