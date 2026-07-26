import { supabase } from "@/lib/supabase";

export async function signUp(email: string, password: string, name: string, phone: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone }, // Yeh gym_owners trigger mein save hoga
      emailRedirectTo: window.location.origin + "/auth",
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem("fs_active_branch");
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function onAuthChange(cb: (userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((_evt, session) => {
    cb(session?.user?.id ?? null);
  });
}

// Claude ke hisaab se new exports
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ironsync_auth_v1") === "1";
}

export function login(username: string, password: string): boolean {
  return false; // Not used anymore (Supabase auth use ho raha hai)
} 

export function logoutLocal() {
  localStorage.removeItem("ironsync_auth_v1");
}