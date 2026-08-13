import { supabase } from "@/lib/supabase";

/**
 * Register a new user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @param name - User's full name
 * @param phone - User's phone number
 * @returns The authentication data from Supabase
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  phone: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone }, // This will be saved in the gym_owners trigger
      emailRedirectTo: window.location.origin + "/auth",
    },
  });
  if (error) throw error;

  // Insert into gym_owners table as required
  if (data?.user) {
    try {
      await supabase.from("gym_owners").insert({
        id: data.user.id,
        name,
        email,
        phone,
      });
    } catch (e) {
      console.warn(
        "Could not insert directly into gym_owners on signUp. This is normal if email confirmation is required, onboarding will handle it:",
        e,
      );
    }
  }

  return data;
}

/**
 * Sign in an existing user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns The session data from Supabase
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Log out the current user and clear local storage
 */
export async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem("fs_active_branch");
}

/**
 * Get the currently authenticated user
 * @returns The user object or null if not authenticated
 */
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Subscribe to authentication state changes
 * @param cb - Callback function that receives the user ID or null
 * @returns The subscription object for cleanup
 */
export function onAuthChange(cb: (userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((_evt, session) => {
    cb(session?.user?.id ?? null);
  });
}

/**
 * Check if a user is currently logged in (legacy method)
 * @returns boolean indicating login status
 */
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ironsync_auth_v1") === "1";
}

/**
 * Legacy login function - not used with Supabase auth
 * @deprecated Supabase authentication is now used instead
 */
export function login(username: string, password: string): boolean {
  return false; // Not used anymore (Supabase auth is being used)
}

/**
 * Clear local authentication state
 */
export function logoutLocal() {
  localStorage.removeItem("ironsync_auth_v1");
}
