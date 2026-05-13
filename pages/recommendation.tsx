// pages/recommendations.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

type Shoe = {
  id: number;
  name: string;
  model_line: string;
  image_url: string;
  price: number;
  width: string;
  category_id: number;
  gender: string;
};

type UserProfile = {
  shoe_width: string;
  category_id: number;
};

const CATEGORY_MAP: Record<number, string> = {
  1: "Running",
  2: "Casual",
  3: "Sports",
  4: "Hiking",
};

export default function Recommendations() {
  const [loading, setLoading] = useState(true);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoading(true);

      // Get logged in user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      // Get user profile — shoe_width is lowercase e.g. "medium", "wide"
      const { data: profileData, error: profileError } = await supabase
        .from("user_profile")
        .select("shoe_width, category_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error("Profile fetch error:", profileError?.message);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Query correct table "shoe" with correct columns "width" and "category_id"
      const { data: shoeData, error: shoeError } = await supabase
        .from("shoe")                                   // ← was "shoes" (wrong)
        .select("*")
        .eq("width", profileData.shoe_width)            // ← lowercase match e.g. "medium"
        .eq("category_id", profileData.category_id);   // ← was "cat_id" (wrong)

      if (shoeError) {
        console.error("Shoe fetch error:", shoeError.message);
        setLoading(false);
        return;
      }

      setShoes(shoeData || []);
      setLoading(false);
    };

    loadRecommendations();
  }, []);

  // ── Not logged in ─────────────────────────────────────────────────────
  if (notLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="max-w-md mx-auto mt-20 bg-white rounded-2xl p-10 shadow text-center">
          <h2 className="text-2xl font-semibold mb-3">Sign in to see recommendations</h2>
          <p className="text-gray-500 mb-6">
            Create an account and fill out the questionnaire to get personalized shoe matches.
          </p>
          <Link
            href="/login"
            className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Recommended For You</h1>

          {profile && (
            <p className="text-gray-600">
              Matched to your preferred width{" "}
              <span className="font-semibold capitalize">{profile.shoe_width}</span>
              {profile.category_id && CATEGORY_MAP[profile.category_id] && (
                <>
                  {" "}and activity{" "}
                  <span className="font-semibold">{CATEGORY_MAP[profile.category_id]}</span>
                </>
              )}
              .
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 text-lg text-gray-500">
            Loading recommendations...
          </div>
        )}

        {/* No matches */}
        {!loading && shoes.length === 0 && (
          <div className="bg-white rounded-2xl p-10 shadow text-center">
            <h2 className="text-2xl font-semibold mb-3">No matching shoes found</h2>
            <p className="text-gray-600 mb-6">
              Try updating your questionnaire preferences — we may have more options that fit.
            </p>
            <Link
              href="/questionnaire"
              className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
            >
              Update Preferences
            </Link>
          </div>
        )}

        {/* Shoe grid */}
        {!loading && shoes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {shoes.map((shoe) => (
              <Link
                key={shoe.id}
                href={`/shoes/${shoe.id}`}
                className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden"
              >
                <div className="aspect-square bg-gray-200 overflow-hidden">
                  <img
                    src={shoe.image_url}
                    alt={shoe.name}
                    className="w-full h-full object-contain p-6 hover:scale-105 transition duration-300"
                  />
                </div>

                <div className="p-4 space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">{shoe.model_line}</p>
                    <h2 className="text-lg font-semibold">{shoe.name}</h2>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="font-bold text-lg">${shoe.price}</p>
                    <div className="flex gap-1.5">
                      {shoe.category_id && CATEGORY_MAP[shoe.category_id] && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                          {CATEGORY_MAP[shoe.category_id]}
                        </span>
                      )}
                      {shoe.width && shoe.width !== "medium" && (
                        <span className="text-xs bg-blue-50 text-blue-500 px-2 py-1 rounded-full capitalize">
                          {shoe.width}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
