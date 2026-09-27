export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
/** Acepta la llave nueva (publishable) o la anon heredada. */
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
