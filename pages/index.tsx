'use client';

import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data: profile, error } = await supabase
        .from('user_profile')
        .select('gender, shoe_size, shoe_width, category_id')
        .eq('id', userId)          // ← was 'user_id', your table uses 'id'
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error.message);
        setShowQuestionnaire(true);
        return;
      }

      // No profile row at all → show button
      if (!profile) {
        setShowQuestionnaire(true);
        return;
      }

      // Profile exists but any field is still null → show button
      const incomplete =
        profile.gender == null ||
        profile.shoe_size == null ||
        profile.shoe_width == null ||
        profile.category_id == null;

      setShowQuestionnaire(incomplete);
    };

    const init = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setShowQuestionnaire(false);
      }

      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setShowQuestionnaire(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="h-screen flex items-center justify-center text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <section
        className="relative h-[80vh] flex flex-col justify-center items-center text-center bg-cover bg-center"
        style={{ backgroundImage: "url('/images/home.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10">
          <h1 className="text-5xl font-bold mb-4 text-white">
            Find Your Perfect Shoe
          </h1>
          <p className="text-lg text-gray-200 mb-6">
            Compare brands. Find your fit. Discover your style.
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/catalog">
              <button className="bg-white text-black px-6 py-3 rounded-full hover:bg-gray-200 transition">
                Shop Now
              </button>
            </Link>

            {/* Only shows if logged in AND profile is incomplete */}
            {user && showQuestionnaire && (
              <Link href="/questionnaire">
                <button className="bg-black text-white border border-white px-6 py-3 rounded-full hover:bg-gray-800 transition">
                  Take Questionnaire
                </button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
