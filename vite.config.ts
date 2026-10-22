import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const safeSupabaseUrl = (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL.startsWith('http')) 
    ? env.VITE_SUPABASE_URL 
    : 'https://hriyiiuxlnzpbzgucbga.supabase.co';
  const safeSupabaseKey = (env.VITE_SUPABASE_ANON_KEY && env.VITE_SUPABASE_ANON_KEY.length > 10 && !env.VITE_SUPABASE_ANON_KEY.includes('•••') && env.VITE_SUPABASE_ANON_KEY !== 'VITE_SUPABASE_ANON_KEY')
    ? env.VITE_SUPABASE_ANON_KEY
    : 'sb_publishable_xW0mHd93ynTyMwwlInNuFA_J-RYQJfB';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || ''),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(safeSupabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(safeSupabaseKey),
      'process.env.SUPABASE_URL': JSON.stringify(safeSupabaseUrl),
      'process.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(safeSupabaseKey),
      'process.env.SUPABASE_JWKS_URL': JSON.stringify(env.SUPABASE_JWKS_URL || 'https://hriyiiuxlnzpbzgucbga.supabase.co/auth/v1/.well-known/jwks.json'),
      'process.env': {}
    },
    server: {
      port: 5173,
      host: true
    },
    build: {
      outDir: 'dist',
    }
  }
})
