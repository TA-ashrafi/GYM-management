import { createClient } from "@supabase/supabase-js";

// ==================== Supabase Client Initialization ====================

const url = (import.meta.env.VITE_SUPABASE_URL as string) || "https://placeholder-project-url.supabase.co";
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "placeholder-anon-key-string-value-for-booting-safely";

export const supabase = createClient(url, key);

// ==================== Branch Context Management ====================

const BRANCH_KEY = "fs_active_branch";

/**
 * Get the currently active branch ID from localStorage
 * @returns The active branch ID or null if not set
 */
export function getActiveBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BRANCH_KEY);
}

/**
 * Set the active branch ID in localStorage
 * @param id - The branch ID to set as active
 */
export function setActiveBranchId(id: string) {
  localStorage.setItem(BRANCH_KEY, id);
}

/**
 * Clear the active branch ID from localStorage
 */
export function clearActiveBranch() {
  localStorage.removeItem(BRANCH_KEY);
}

// ==================== Branch Queries ====================

/**
 * Fetch all branches for the current user
 * @returns Array of branch objects or empty array on error
 */
export async function fetchBranches() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    if (error) { console.error(error); return []; }
    return data ?? [];
  } catch (err) {
    console.error("Error in fetchBranches:", err);
    return [];
  }
}

/**
 * Fetch all branches directly by Clerk user ID (deterministic fallback)
 * @param clerkUserId - Clerk user ID
 * @returns Array of branch objects
 */
export async function fetchBranchesForUser(clerkUserId: string) {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("owner_id", clerkUserId)
      .order("created_at", { ascending: true });
    if (error) { console.error(error); return []; }
    return data ?? [];
  } catch (err) {
    console.error("Error in fetchBranchesForUser:", err);
    return [];
  }
}

// ==================== Member Queries ====================

/**
 * Fetch all members for the currently active branch
 * @returns Array of mapped member objects or empty array on error
 */
export async function fetchMembers() {
  const branchId = getActiveBranchId();
  if (!branchId) return [];
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return (data ?? []).map(mapMember);
}

/**
 * Map a database row to a Member object
 * @param row - The raw database row
 * @returns A formatted Member object
 */
export function mapMember(row: any) {
  return {
    id: row.id,
    branchId: row.branch_id,
    rollNo: row.roll_no,
    rfid: row.rfid ?? "",
    name: row.name,
    phone: row.phone,
    email: row.email ?? "",
    address: row.address ?? "",
    gender: row.gender,
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    goal: row.goal ?? "",
    medical: row.medical ?? "",
    emergencyContact: row.emergency_contact ?? "",
    photo: row.photo ?? "",
    joinDate: row.join_date_manual ?? row.created_at,
    plan: row.plan,
    feeAmount: row.fee_amount,
    feePaid: row.fee_paid,
    expiryDate: row.expiry_date,
    preferredSlot: row.preferred_slot ?? "",
    attendance: [],
  };
}
