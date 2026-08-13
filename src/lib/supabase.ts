import { createClient } from "@supabase/supabase-js";

// ==================== Supabase Client Initialization ====================

const url =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  "https://placeholder-project-url.supabase.co";
const key =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  "placeholder-anon-key-string-value-for-booting-safely";

export const isPlaceholder =
  !import.meta.env.VITE_SUPABASE_URL ||
  url.includes("placeholder-project-url") ||
  key.includes("placeholder-anon-key");

const rawSupabase = createClient(url, key);

// Mock storage for offline demo / fallback mode to avoid any slow network timeouts on placeholder credentials
const mockStore = {
  session: null as any,
  user: null as any,
  branches: [] as any[],
  members: [] as any[],
  attendance: [] as any[],
};

const authListeners = new Set<any>();

if (isPlaceholder && typeof window !== "undefined") {
  const savedSession = localStorage.getItem("fs_mock_session");
  if (savedSession) {
    mockStore.session = JSON.parse(savedSession);
    mockStore.user = mockStore.session?.user;
  }
  const savedBranches = localStorage.getItem("fs_mock_branches");
  if (savedBranches) {
    mockStore.branches = JSON.parse(savedBranches);
  } else {
    // Inject a default branch so the user goes straight to the dashboard instead of onboarding loop!
    mockStore.branches = [
      {
        id: "mock_branch_1",
        gym_name: "ALPHA FITNESS (DEMO)",
        branch_name: "Main Branch",
        address: "123 Power Gym Street",
        phone: "+91 99999 99999",
        owner_id: "mock_user_1",
        theme: "dark",
        preset: "lime",
        slot_duration_min: 60,
        slot_capacity: 20,
        currency: "INR",
        language: "hinglish",
      },
    ];
    localStorage.setItem("fs_mock_branches", JSON.stringify(mockStore.branches));
  }
}

// Intercept client queries when in placeholder mode to enable 100% instantaneous, lag-free operations!
export const supabase = (
  isPlaceholder
    ? new Proxy(rawSupabase, {
        get(target, prop) {
          if (prop === "auth") {
            return {
              async getSession() {
                return { data: { session: mockStore.session }, error: null };
              },
              async getUser() {
                return { data: { user: mockStore.user }, error: null };
              },
              async signInWithPassword({ email, password }: any) {
                const user = {
                  id: "mock_user_1",
                  email,
                  user_metadata: { name: email.split("@")[0] || "Owner" },
                };
                const session = { user, access_token: "mock_token" };
                mockStore.session = session;
                mockStore.user = user;
                localStorage.setItem("fs_mock_session", JSON.stringify(session));
                authListeners.forEach((cb) => cb("SIGNED_IN", session));
                return { data: { session, user }, error: null };
              },
              async signUp({ email, password, options }: any) {
                const user = {
                  id: "mock_user_1",
                  email,
                  user_metadata: { name: options?.data?.name || "Owner" },
                };
                const session = { user, access_token: "mock_token" };
                mockStore.session = session;
                mockStore.user = user;
                localStorage.setItem("fs_mock_session", JSON.stringify(session));
                authListeners.forEach((cb) => cb("SIGNED_IN", session));
                return { data: { session, user }, error: null };
              },
              async signOut() {
                mockStore.session = null;
                mockStore.user = null;
                localStorage.removeItem("fs_mock_session");
                localStorage.removeItem("fs_active_branch");
                authListeners.forEach((cb) => cb("SIGNED_OUT", null));
                return { error: null };
              },
              onAuthStateChange(callback: any) {
                authListeners.add(callback);
                setTimeout(() => {
                  callback(mockStore.session ? "SIGNED_IN" : "SIGNED_OUT", mockStore.session);
                }, 0);
                return {
                  data: {
                    subscription: {
                      unsubscribe() {
                        authListeners.delete(callback);
                      },
                    },
                  },
                };
              },
              async resetPasswordForEmail() {
                return { error: null };
              },
              async updateUser({ password }: any) {
                return { data: { user: mockStore.user }, error: null };
              },
            };
          }

          if (prop === "from") {
            return (tableName: string) => {
              return {
                select(columns?: string, options?: any) {
                  return {
                    eq(col: string, val: any) {
                      return this;
                    },
                    gte(col: string, val: any) {
                      return this;
                    },
                    lte(col: string, val: any) {
                      return this;
                    },
                    order(col: string, options?: any) {
                      return this;
                    },
                    single() {
                      return {
                        async then(resolve: any) {
                          if (tableName === "branches") {
                            resolve({ data: mockStore.branches[0] || null, error: null });
                          } else {
                            resolve({ data: null, error: null });
                          }
                        },
                      };
                    },
                    async then(resolve: any) {
                      if (tableName === "branches") {
                        resolve({ data: mockStore.branches, error: null });
                      } else if (tableName === "members") {
                        resolve({ data: mockStore.members, error: null });
                      } else if (tableName === "attendance_logs") {
                        resolve({ data: mockStore.attendance, error: null });
                      } else {
                        resolve({ data: [], error: null });
                      }
                    },
                  };
                },
                insert(rows: any) {
                  return {
                    select() {
                      return {
                        single() {
                          return {
                            async then(resolve: any) {
                              const items = Array.isArray(rows) ? rows : [rows];
                              const added = { id: `mock_${Date.now()}`, ...items[0] };
                              if (tableName === "branches") {
                                mockStore.branches.push(added);
                                localStorage.setItem("fs_mock_branches", JSON.stringify(mockStore.branches));
                              } else if (tableName === "members") {
                                mockStore.members.push(added);
                              } else if (tableName === "attendance_logs") {
                                mockStore.attendance.push(added);
                              }
                              resolve({ data: added, error: null });
                            },
                          };
                        },
                      };
                    },
                    async then(resolve: any) {
                      resolve({ data: rows, error: null });
                    },
                  };
                },
                update(patch: any) {
                  return {
                    eq(col: string, val: any) {
                      return {
                        async then(resolve: any) {
                          resolve({ error: null });
                        },
                      };
                    },
                  };
                },
                delete() {
                  return {
                    eq(col: string, val: any) {
                      return {
                        async then(resolve: any) {
                          resolve({ error: null });
                        },
                      };
                    },
                  };
                },
              };
            };
          }

          if (prop === "channel") {
            return () => ({
              on() {
                return this;
              },
              subscribe() {
                return this;
              },
            });
          }

          if (prop === "removeChannel") {
            return () => {};
          }

          return Reflect.get(target, prop);
        },
      })
    : rawSupabase
) as any;

// ==================== Branch Context Management ====================

const BRANCH_KEY = "fs_active_branch";

/**
 * Get the currently active branch ID from localStorage
 * @returns The active branch ID or null if not set
 */
export function getActiveBranchId(): string | null {
  if (typeof window === "undefined") return null;
  const active = localStorage.getItem(BRANCH_KEY);
  if (!active && isPlaceholder && mockStore.branches.length > 0) {
    return mockStore.branches[0].id;
  }
  return active;
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("Error in fetchBranches:", err);
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
  if (error) {
    console.error(error);
    return [];
  }
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
