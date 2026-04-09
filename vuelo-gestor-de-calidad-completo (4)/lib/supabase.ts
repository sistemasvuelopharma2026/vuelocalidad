/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Try to get from process.env (Vite define) or import.meta.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if both URL and Key are present
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn('Supabase URL or Anon Key is missing. Database features will be disabled until configured in Settings > Secrets.');
  console.log('Variables detectadas:', { 
    url: !!supabaseUrl, 
    key: !!supabaseAnonKey 
  });
}
