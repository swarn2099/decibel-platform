import { createClient } from "@supabase/supabase-js";
import { mmkv, createSupabaseStorageAdapter } from "./storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createSupabaseStorageAdapter(mmkv),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
