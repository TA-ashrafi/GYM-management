import { useSyncExternalStore } from "react";

// ==================== Type Definitions ====================

export type PlanType = "Monthly" | "Quarterly" | "HalfYearly" | "Yearly";

export type Member = {
  id: string;
  rollNo: string;
  rfid: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gender: "M" | "F" | "O";
  age: number;
  heightCm: number;
  weightKg: number;
  goal: string;
  medical?: string;
  emergencyContact?: string;
  photo: string;
  joinDate: string;
  plan: PlanType;
  feeAmount: number;
  feePaid: boolean;
  expiryDate: string;
  preferredSlot: string;
  attendance: string[];
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: "Rent" | "Water" | "Electricity" | "Equipment" | "Staff" | "Other";
  date: string;
};

export type Todo = {
  id: string;
  title: string;
  note?: string;
  priority: "low" | "med" | "high";
  done: boolean;
  due?: string;
};

export type Shift = { start: string; end: string };

export type Product = {
  id: string;
  name: string;
  category: "Protein" | "PreWorkout" | "Vitamins" | "Snacks" | "Drinks" | "Accessory";
  price: number;
  cost: number;
  stock: number;
  lowStockAt: number;
};

export type SaleItem = { 
  productId: string; 
  qty: number; 
  price: number; 
  name: string 
};

export type Sale = {
  id: string;
  date: string;
  items: SaleItem[];
  total: number;
  paymentMode: "Cash" | "UPI" | "Card";
  memberId?: string;
  customer?: string;
};

export type ThemeMode = "dark" | "light";
export type ThemePreset = "lime" | "red" | "blue" | "gold" | "purple";
export type DesignStyle = "glass" | "neo" | "classic";

export type WidgetId = "kpi" | "money" | "chart" | "maintenance" | "ghosts" | "expiring";
export type DashboardWidget = { id: WidgetId; visible: boolean };

export type Settings = {
  gymName: string;
  ownerName: string;
  language: "en" | "hi" | "hinglish";
  currency: "INR" | "USD" | "AED" | "PKR" | "EUR" | "GBP";
  address: string;
  phone: string;
  shifts: Shift[];
  slotDurationMin: number;
  slotCapacity: number;
  theme: ThemeMode;
  preset: ThemePreset;
  dashboardLayout: DashboardWidget[];
  dismissedNotifIds: string[];
  designStyle: DesignStyle;
};

// ==================== Constants & Helpers ====================

const KEY = "fitnessstreak_v1";

const CURRENCY_SYMBOL: Record<Settings["currency"], string> = {
  INR: "₹", USD: "$", AED: "د.إ", PKR: "₨", EUR: "€", GBP: "£",
};

function pad(n: number) { 
  return n.toString().padStart(2, "0"); 
}

/**
 * Generate time slots based on shifts and duration
 * @param shifts - Array of shift objects with start and end times
 * @param durMin - Duration in minutes for each slot
 * @returns Array of formatted time slot strings
 */
export function generateSlots(shifts: Shift[], durMin: number): string[] {
  const out: string[] = [];
  for (const s of shifts) {
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    // Generate a single full slot per shift (start to end)
    out.push(
      `${pad(sh)}:${pad(sm)}-${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`
    );
  }
  return out;
}

// ==================== Default Configuration ====================

export const DEFAULT_LAYOUT: DashboardWidget[] = [
  { id: "kpi", visible: true },
  { id: "money", visible: true },
  { id: "chart", visible: true },
  { id: "maintenance", visible: true },
  { id: "ghosts", visible: true },
  { id: "expiring", visible: true },
];

const DEFAULT_SETTINGS: Settings = {
  gymName: "ALPHA FITNESS",
  ownerName: "Owner",
  language: "en",
  currency: "INR",
  address: "",
  phone: "",
  shifts: [
    { start: "06:00", end: "11:00" },
    { start: "17:00", end: "22:00" },
  ],
  slotDurationMin: 60,
  slotCapacity: 20,
  theme: "dark",
  preset: "lime",
  dashboardLayout: DEFAULT_LAYOUT,
  dismissedNotifIds: [],
  designStyle: "glass",
  timeFormat: "12h"
};

// ==================== State Management ====================

/**
 * Create an empty state with default settings
 * @returns Initial State object
 */
function emptyState(): State {
  const settings = DEFAULT_SETTINGS;
  const slotList = generateSlots(settings.shifts, settings.slotDurationMin);
  const slots: Record<string, number> = {};
  slotList.forEach((s) => (slots[s] = settings.slotCapacity));
  return {
    members: [],
    expenses: [],
    todos: [],
    slots,
    products: [],
    sales: [],
    settings,
  };
}

/**
 * Load state from localStorage or create default if not found
 * @returns The loaded or default State object
 */
function load(): State {
  if (typeof window === "undefined") return emptyState();
  
  // Clean up old version
  if (localStorage.getItem("ironsync_v4")) {
    localStorage.removeItem("ironsync_v4");
  }
  
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = emptyState();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    
    const parsed = JSON.parse(raw) as Partial<State>;
    const merged: State = {
      members: parsed.members ?? [],
      expenses: parsed.expenses ?? [],
      todos: parsed.todos ?? [],
      slots: parsed.slots ?? {},
      products: parsed.products ?? [],
      sales: parsed.sales ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
    
    // Ensure all required settings fields exist
    if (!merged.settings.dashboardLayout?.length) merged.settings.dashboardLayout = DEFAULT_LAYOUT;
    if (!merged.settings.theme) merged.settings.theme = "dark";
    if (!merged.settings.preset) merged.settings.preset = "lime";
    if (!merged.settings.dismissedNotifIds) merged.settings.dismissedNotifIds = [];
    if (!merged.settings.designStyle) merged.settings.designStyle = "glass";
    
    return merged;
  } catch {
    return emptyState();
  }
}

let state: State = typeof window === "undefined" ? emptyState() : load();
const listeners = new Set<() => void>();

/**
 * Emit state changes to all listeners and persist to localStorage
 */
function emit() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

/**
 * Subscribe to state changes
 * @param cb - Callback function to be called on state changes
 * @returns Unsubscribe function
 */
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * React hook for accessing gym state
 * @param selector - Selector function to extract specific data from state
 * @returns The selected data
 */
export function useGym<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

// ==================== Gym Store API ====================

export const gym = {
  get state() { return state; },
  
  setState(next: State) { 
    state = next; 
    emit(); 
  },
  
  addMember(m: Omit<Member, "id" | "attendance">) {
    state = { 
      ...state, 
      members: [...state.members, { ...m, id: `mem_${Date.now()}`, attendance: [] }] 
    };
    emit();
  },
  
  updateMember(id: string, patch: Partial<Member>) {
    state = { 
      ...state, 
      members: state.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) 
    };
    emit();
  },
  
  deleteMember(id: string) {
    state = { 
      ...state, 
      members: state.members.filter((m) => m.id !== id) 
    };
    emit();
  },
  
  checkIn(id: string) {
    const now = new Date().toISOString();
    state = {
      ...state,
      members: state.members.map((m) =>
        m.id === id ? { ...m, attendance: [now, ...m.attendance].slice(0, 200) } : m,
      ),
    };
    emit();
  },
  
  punchByRfid(code: string): Member | null {
    const c = code.trim().toLowerCase();
    const m = state.members.find((x) => x.rfid.toLowerCase() === c || x.rollNo.toLowerCase() === c);
    if (!m) return null;
    this.checkIn(m.id);
    return state.members.find((x) => x.id === m.id) ?? null;
  },
  
  addExpense(e: Omit<Expense, "id">) {
    state = { 
      ...state, 
      expenses: [{ ...e, id: `e_${Date.now()}` }, ...state.expenses] 
    };
    emit();
  },
  
  deleteExpense(id: string) {
    state = { 
      ...state, 
      expenses: state.expenses.filter((e) => e.id !== id) 
    };
    emit();
  },
  
  addTodo(t: Omit<Todo, "id" | "done">) {
    state = { 
      ...state, 
      todos: [{ ...t, id: `t_${Date.now()}`, done: false }, ...state.todos] 
    };
    emit();
  },
  
  toggleTodo(id: string) {
    state = { 
      ...state, 
      todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) 
    };
    emit();
  },
  
  deleteTodo(id: string) {
    state = { 
      ...state, 
      todos: state.todos.filter((t) => t.id !== id) 
    };
    emit();
  },
  
  setSlotCapacity(slot: string, cap: number) {
    state = { 
      ...state, 
      slots: { ...state.slots, [slot]: cap } 
    };
    emit();
  },
  
  updateSettings(patch: Partial<Settings>) {
    const next = { ...state.settings, ...patch };
    const newSlotList = generateSlots(next.shifts, next.slotDurationMin);
    const slots: Record<string, number> = {};
    newSlotList.forEach((s) => (slots[s] = state.slots[s] ?? next.slotCapacity));
    state = { ...state, settings: next, slots };
    emit();
  },
  
  setLayout(layout: DashboardWidget[]) {
    state = { 
      ...state, 
      settings: { ...state.settings, dashboardLayout: layout } 
    };
    emit();
  },
  
  dismissNotification(id: string) {
    const ids = [...state.settings.dismissedNotifIds, id];
    state = { 
      ...state, 
      settings: { ...state.settings, dismissedNotifIds: ids.slice(-200) } 
    };
    emit();
  },
  
  upsertProduct(p: Product) {
    const exists = state.products.find((x) => x.id === p.id);
    state = {
      ...state,
      products: exists ? state.products.map((x) => (x.id === p.id ? p : x)) : [p, ...state.products],
    };
    emit();
  },
  
  deleteProduct(id: string) {
    state = { 
      ...state, 
      products: state.products.filter((p) => p.id !== id) 
    };
    emit();
  },
  
  recordSale(s: Omit<Sale, "id" | "date">) {
    const sale: Sale = { ...s, id: `s_${Date.now()}`, date: new Date().toISOString() };
    const products = state.products.map((p) => {
      const item = s.items.find((i) => i.productId === p.id);
      return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
    });
    state = { ...state, products, sales: [sale, ...state.sales] };
    emit();
  },
  
  reset() { 
    state = emptyState(); 
    emit(); 
  },
};

// ==================== Utility Functions ====================

/**
 * Calculate days until a given date
 * @param iso - ISO date string
 * @returns Number of days until the date (negative if past)
 */
export function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

/**
 * Calculate days since a given date
 * @param iso - ISO date string
 * @returns Number of days since the date
 */
export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/**
 * Determine a member's status based on expiry and attendance
 * @param m - Member object
 * @returns Status string: "active" | "expiring" | "expired" | "ghost"
 */
export function memberStatus(m: Member): "active" | "expiring" | "expired" | "ghost" {
  const d = daysUntil(m.expiryDate ?? m.expiry_date ?? m.expiry_date);
  if (d < 0) return "expired";
  const lastVisit = m.attendance[0];
  const since = lastVisit ? daysSince(lastVisit) : 999;
  if (since >= 4 && d >= 0) return "ghost";
  if (d <= 7) return "expiring";
  return "active";
}

/**
 * Get currency symbol for a given currency code
 * @param c - Currency code (default: "INR")
 * @returns Currency symbol string
 */
export function currencySymbol(c: Settings["currency"] = "INR") {
  return CURRENCY_SYMBOL[c] ?? "₹";
}

/**
 * Format a number as currency
 * @param n - Number to format
 * @param c - Currency code (default: state.settings.currency)
 * @returns Formatted currency string
 */
export function money(n: number, c: Settings["currency"] = state.settings?.currency ?? "INR") {
  return currencySymbol(c) + n.toLocaleString("en-IN");
}

/**
 * Alias for money() with INR currency
 * @param n - Number to format
 * @returns Formatted INR string
 */
export function inr(n: number) {
  return money(n);
}

// ==================== Notification System ====================

export type Notification = {
  id: string;
  type: "expiry" | "ghost" | "dues" | "task" | "stock";
  title: string;
  desc: string;
  href: string;
  tone: "danger" | "warn" | "info";
  ts: number;
};

/**
 * Compute all active notifications from the current state
 * @param s - Current State object
 * @returns Array of Notification objects
 */
export function computeNotifications(s: State): Notification[] {
  const out: Notification[] = [];
  
  // Member-related notifications
  for (const m of s.members) {
    const st = memberStatus(m);
    if (st === "expired") {
      out.push({
        id: `exp_${m.id}`, type: "expiry", tone: "danger",
        title: `${m.name}'s membership expired`,
        desc: `${Math.abs(daysUntil(m.expiryDate))} days ago — renewal pending`,
        href: "/members?filter=expired", ts: Date.now(),
      });
    } else if (st === "expiring") {
      out.push({
        id: `expg_${m.id}`, type: "expiry", tone: "warn",
        title: `${m.name}'s membership expiring soon`,
        desc: `${daysUntil(m.expiryDate)} days remaining`,
        href: "/members?filter=expiring", ts: Date.now(),
      });
    } else if (st === "ghost") {
      const last = m.attendance[0];
      out.push({
        id: `gh_${m.id}`, type: "ghost", tone: "danger",
        title: `Ghost member: ${m.name}`,
        desc: `${last ? daysSince(last) : "30+"} days since last punch`,
        href: "/members?filter=ghost", ts: Date.now(),
      });
    }
    if (!m.feePaid) {
      out.push({
        id: `dues_${m.id}`, type: "dues", tone: "warn",
        title: `Pending dues: ${m.name}`,
        desc: `${currencySymbol(s.settings.currency)}${m.feeAmount.toLocaleString("en-IN")} unpaid`,
        href: "/members?filter=unpaid", ts: Date.now(),
      });
    }
  }
  
  // Todo notifications
  for (const t of s.todos) {
    if (!t.done && t.priority === "high") {
      out.push({
        id: `task_${t.id}`, type: "task", tone: "warn",
        title: `Pending task: ${t.title}`, desc: t.note ?? "High priority",
        href: "/todos", ts: Date.now(),
      });
    }
  }
  
  // Stock notifications
  for (const p of s.products) {
    if (p.stock <= p.lowStockAt) {
      out.push({
        id: `stock_${p.id}`, type: "stock", tone: p.stock === 0 ? "danger" : "warn",
        title: `Low stock: ${p.name}`,
        desc: `${p.stock} units left (alert at ${p.lowStockAt})`,
        href: "/store", ts: Date.now(),
      });
    }
  }
  
  // Filter out dismissed notifications
  const dismissed = new Set(s.settings.dismissedNotifIds);
  return out.filter((n) => !dismissed.has(n.id)).slice(0, 50);
}