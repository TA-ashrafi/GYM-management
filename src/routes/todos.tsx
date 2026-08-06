import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { supabase, getActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/todos")({
  head: () => ({ meta: [{ title: "To-Do — IronSync" }] }),
  component: Todos,
});

function Todos() {
  const [todos, setTodos] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<"low" | "med" | "high">("med");

  // Fetch todos for current branch only
  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    supabase
      .from("todos")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setTodos(data ?? []);
      });
  }, []);

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  // Add a new task
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const branchId = getActiveBranchId();
    if (!branchId) {
      toast.error("No branch selected");
      return;
    }

    const { data, error } = await supabase
      .from("todos")
      .insert({
        branch_id: branchId,
        title: title.trim(),
        note: note.trim() || null,
        priority,
        done: false,
      })
      .select()
      .single();

    if (!error && data) {
      setTodos((prev) => [data, ...prev]);
      setTitle("");
      setNote("");
      setPriority("med");
      toast.success("Task added successfully");
    } else {
      toast.error(error?.message || "Failed to add task");
    }
  }

  // Toggle task completion status
  async function toggleTodo(id: string, currentDone: boolean) {
    const { error } = await supabase
      .from("todos")
      .update({ done: !currentDone })
      .eq("id", id);

    if (!error) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !currentDone } : t))
      );
    } else {
      toast.error("Failed to update task status");
    }
  }

  // Delete a task
  async function deleteTodo(id: string) {
    if (!confirm("Delete this task?")) return;

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (!error) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted successfully");
    } else {
      toast.error("Failed to delete task");
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl w-full">
      <PageHeader title="Maintenance & To-Do" subtitle="Machine repairs, bills, daily operations" />

      {/* Add Task Form */}
      <form onSubmit={add} className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="px-3 py-2.5 bg-secondary rounded-lg text-base font-medium outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40 w-full"
        />
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px,auto] gap-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className={inp}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "med" | "high")}
            className={inp}
          >
            <option value="low">Low</option>
            <option value="med">Medium</option>
            <option value="high">High</option>
          </select>
          <button 
            type="submit"
            className="px-5 py-2.5 bg-brand text-brand-foreground rounded-lg font-semibold text-sm hover:bg-brand/90 transition cursor-pointer text-center"
          >
            Add Task
          </button>
        </div>
      </form>

      {/* Open Tasks */}
      <section>
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">Open ({open.length})</h3>
        <div className="space-y-2 mb-8">
          {open.map((t) => (
            <Row
              key={t.id}
              t={t}
              onToggle={() => toggleTodo(t.id, t.done)}
              onDelete={() => deleteTodo(t.id)}
            />
          ))}
          {open.length === 0 && <p className="text-sm text-muted-foreground">No open tasks. All caught up!</p>}
        </div>

        {/* Completed Tasks */}
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-semibold">Completed ({done.length})</h3>
        <div className="space-y-2 opacity-60">
          {done.map((t) => (
            <Row
              key={t.id}
              t={t}
              onToggle={() => toggleTodo(t.id, t.done)}
              onDelete={() => deleteTodo(t.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// Task Row Component
function Row({ t, onToggle, onDelete }: { t: any; onToggle: () => void; onDelete: () => void }) {
  const tone = t.priority === "high" ? "border-danger" : t.priority === "med" ? "border-warn" : "border-accent";

  return (
    <div className={"p-4 bg-card border border-border rounded-xl border-l-2 flex items-center justify-between gap-3 " + tone}>
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={t.done}
          onChange={onToggle}
          className="accent-brand size-4 cursor-pointer shrink-0"
        />
        <div className="min-w-0">
          <p className={"font-medium text-sm sm:text-base " + (t.done ? "line-through text-muted-foreground" : "")}>{t.title}</p>
          {t.note && <p className="text-xs text-muted-foreground truncate">{t.note}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">{t.priority}</span>
        <button onClick={onDelete} className="text-muted-foreground hover:text-danger p-1">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

const inp = "px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40 border border-transparent focus:border-brand/40 w-full";