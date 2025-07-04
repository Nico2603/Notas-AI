import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Only throw error in browser context, not during build
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('Variables de entorno Supabase faltantes');
  throw new Error('Variables de entorno Supabase faltantes');
}

// Only log and create client if we have valid env vars
if (supabaseUrl && supabaseAnonKey) {
  console.log('✅ Variables de entorno Supabase validadas correctamente');
  console.log('📍 URL:', supabaseUrl);
  console.log('🔑 Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
}

// Create a placeholder client during build time or a real one with valid env vars
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
};

export const auth = {
  signInWithGoogle: async () => {
    try {
      console.log('🔄 Iniciando autenticación con Google...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      });
      
      if (error) {
        console.error('❌ Error en signInWithGoogle:', error);
        throw error;
      }
      
      console.log('✅ Redirección iniciada correctamente');
      return { data, error: null };
    } catch (err) {
      console.error('❌ Excepción en signInWithGoogle:', err);
      return { data: null, error: err };
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user, error: null };
    } catch (err) {
      return { user: null, error: err };
    }
  },

  getSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { session, error: null };
    } catch (err) {
      return { session: null, error: err };
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};
