'client use'
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current session
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    getUser();

    // Listen for auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div>
      <Navbar />

      <section className="h-[80vh] flex flex-col justify-center items-center text-center bg-gray-100">
        <h1 className="text-5xl font-bold mb-4">
          Find Your Perfect Shoe
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Compare brands. Find your fit. Discover your style.
        </p>

        <div className="flex gap-4">
          <Link href="/catalog">
            <button className="bg-black text-white px-6 py-3 rounded-full hover:bg-gray-800 transition">
              Shop Now
            </button>
          </Link>

          {user && (
            <Link href="/questionnaire">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition">
                Take Questionnaire
              </button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
