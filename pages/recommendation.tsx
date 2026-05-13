// pages/recommendations.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

type Shoe = {
  id: string;
  name: string;
  brand: string;
  image_url: string;
  price: number;
  width: string;
  cat_id: number;
};

type UserProfile = {
  shoe_width: string;
  category_id: number;
};

export default function Recommendations() {
  const [loading, setLoading] = useState(true);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoading(true);

      // Get logged in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Get user preferences
      const { data: profileData, error: profileError } = await supabase
        .from("user_profile")
        .select("shoe_width, category_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error(profileError);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Get matching shoes
      const { data: shoeData, error: shoeError } = await supabase
        .from("shoes")
        .select("*")
        .eq("width", profileData.shoe_width)
        .eq("cat_id", profileData.category_id);

      if (shoeError) {
        console.error(shoeError);
        setLoading(false);
        return;
      }

      setShoes(shoeData || []);
      setLoading(false);
    };

    loadRecommendations();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Recommended Shoes
          </h1>

          {profile && (
            <p className="text-gray-600">
              Based on your preferred width (
              <span className="font-semibold">
                {profile.shoe_width}
              </span>
              ) and activity category.
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-lg">
            Loading recommendations...
          </div>
        ) : shoes.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow text-center">
            <h2 className="text-2xl font-semibold mb-3">
              No matching shoes found
            </h2>

            <p className="text-gray-600">
              Try updating your questionnaire preferences.
            </p>

            <Link
              href="/questionnaire"
              className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800"
            >
              Update Preferences
            </Link>
          </div>
        ) : (
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
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                  />
                </div>

                <div className="p-4 space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">
                      {shoe.brand}
                    </p>

                    <h2 className="text-lg font-semibold">
                      {shoe.name}
                    </h2>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="font-bold text-lg">
                      ${shoe.price}
                    </p>

                    <span className="text-sm bg-gray-100 px-3 py-1 rounded-full capitalize">
                      {shoe.width}
                    </span>
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
