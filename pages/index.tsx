'use client';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      setUser(currentUser);

      if (currentUser) {
        const { data: profile, error } = await supabase
          .from('user_profile')
          .select('gender, shoe_size, shoe_width, category_id')
          .eq('user_id', currentUser.id)
          .single();

        if (!error && profile) {
          const incomplete =
            profile.gender === null ||
            profile.shoe_size === null ||
            profile.shoe_width === null ||
            profile.category_id === null;

          setShowQuestionnaire(incomplete);
        }
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: profile, error } = await supabase
            .from('user_profile')
            .select('gender, shoe_size, shoe_width, category_id')
            .eq('user_id', currentUser.id)
            .single();

          if (!error && profile) {
            const incomplete =
              profile.gender === null ||
              profile.shoe_size === null ||
              profile.shoe_width === null ||
              profile.category_id === null;

            setShowQuestionnaire(incomplete);
          }
        } else {
          setShowQuestionnaire(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div>
      <Navbar />

      <section
        className="relative h-[80vh] flex flex-col justify-center items-center text-center bg-cover bg-center"
        style={{ backgroundImage: "url('/images/home.jpg')" }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Content */}
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
