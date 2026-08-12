import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Building2, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/tanstack-react-start";
import { supabase, fetchBranchesForUser, getActiveBranchId, setActiveBranchId } from "@/lib/supabase";

export const Route = createFileRoute("/branches")({
  head: () => ({ meta: [{ title: "Branches — ALPHA FITNESS" }] }),
  component: Branches,
});

function Branches() {
  const nav = useNavigate();
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const activeBranchId = getActiveBranchId();

  // Fetch branches on component mount
  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchBranchesForUser(userId).then((data) => {
      setBranches(data);
      setLoading(false);
    });
  }, [userId, isAuthLoaded]);

  // Switch to a different branch
  async function switchBranch(id: string) {
    setActiveBranchId(id);
    toast.success("Branch switched successfully!");
    nav({ to: "/" });
  }

  // Delete a branch
  async function deleteBranch(id: string, name: string) {
    if (!confirm(`Delete "${name}"? All associated data will be permanently removed.`)) return;
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (!error) {
      setBranches((prev) => prev.filter((b) => b.id !== id));
      if (activeBranchId === id) {
        const remaining = branches.filter((b) => b.id !== id);
        if (remaining.length > 0) setActiveBranchId(remaining[0].id);
        else localStorage.removeItem("fs_active_branch");
      }
      toast.success("Branch deleted successfully");
    } else {
      toast.error(error.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading">Your Branches</h1>
            <p className="text-muted-foreground mt-1">{branches.length} branch{branches.length !== 1 ? "es" : ""}</p>
          </div>
          <button
            onClick={() => nav({ to: "/onboarding", search: { skipChoice: true } as any })}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-xl text-sm font-semibold"
          >
            <Plus className="size-4" /> New Branch
          </button>
        </div>

        {/* Branches List */}
        <div className="space-y-3">
          {branches.map((b) => {
            const isActive = b.id === activeBranchId;
            return (
              <div
                key={b.id}
                className={"p-5 bg-card border rounded-2xl flex items-center gap-4 transition " +
                  (isActive ? "border-brand/60 bg-brand/5" : "border-border hover:border-border/80")}
              >
                {/* Branch Icon */}
                <div className={"size-12 rounded-xl grid place-items-center shrink-0 " +
                  (isActive ? "bg-brand text-brand-foreground" : "bg-secondary text-muted-foreground")}>
                  <Building2 className="size-6" />
                </div>
                
                {/* Branch Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg">{b.gym_name}</p>
                  <p className="text-sm text-muted-foreground">{b.branch_name} {b.address ? `· ${b.address}` : ""}</p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <span className="flex items-center gap-1.5 text-brand text-xs font-bold px-3 py-1.5 bg-brand/10 rounded-lg">
                      <CheckCircle2 className="size-3.5" /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => switchBranch(b.id)}
                      className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-medium hover:bg-brand hover:text-brand-foreground transition"
                    >
                      Switch
                    </button>
                  )}
                  {branches.length > 1 && (
                    <button
                      onClick={() => deleteBranch(b.id, b.gym_name)}
                      className="size-8 rounded-lg bg-secondary hover:bg-danger/10 hover:text-danger grid place-items-center transition"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Button */}
        {branches.length > 0 && (
          <button
            onClick={() => nav({ to: "/" })}
            className="mt-6 w-full py-3 bg-secondary text-foreground rounded-xl text-sm font-medium"
          >
            Go to Dashboard →
          </button>
        )}
      </div>
    </div>
  );
}