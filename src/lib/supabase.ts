import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

// Branch context
const BRANCH_KEY = "fs_active_branch";

export function getActiveBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BRANCH_KEY);
}

export function setActiveBranchId(id: string) {
  localStorage.setItem(BRANCH_KEY, id);
}

export function clearActiveBranch() {
  localStorage.removeItem(BRANCH_KEY);
}

// Branches fetch
export async function fetchBranches() {
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) { console.error(error); return []; }
  return data ?? [];
}

// Members fetch for active branch
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