import { createClient } from '@supabase/supabase-js';

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

export async function login(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error logging in:', error);
      return null;
    }

    return data.session;
  } catch (error) {
    console.error('Error logging in:', error);
    return null;
  }
}

export async function register(email: string, password: string, firstName: string, lastName: string) {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Error registering:', error);
      return null;
    }

    const { data: userData } = await supabase.auth.getUser();
    // Store additional user information in the user_profile table
    const { error: insertError } = await supabase.from('user_profile').insert({
      id: userData.user?.id,
      email,
      first_name: firstName,
      last_name: lastName,
    });

    console.log('Inserting additional user information...');

    if (insertError) {
      console.error('Error inserting additional user information:', insertError);
      return null;
    }

    return 'User registered successfully!';
  } catch (error) {
    console.error('Error registering:', error);
    return null;
  }
}
