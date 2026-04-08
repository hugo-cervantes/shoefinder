import { createClient } from '@supabase/supabase-js';

// Use environment variables for safety
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchShoes() {
  const { data, error } = await supabase
    .from('shoe')
    .select(`
      id,
      name,
      model_line,
      price,
      size,
      gender,
      brand:brand_id(name),
      category:category_id(name)
    `);

  if (error) {
    console.error('Error fetching shoes:', error);
    return [];
  }

  return data;
}