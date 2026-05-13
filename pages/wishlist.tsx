import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

interface Shoe {
  id: number;
  name: string;
  model_line: string;
  price: number;
  image_url: string;
  gender: string;
}

interface WishlistEntry {
  id: number;
  shoe_id: number;
  shoe: Shoe;
}

export default function WishlistPage() {
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  useEffect(() => {
    const fetchWishlist = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("wishlist")
        .select("id, shoe_id, shoe:shoe_id(id, name, model_line, price, image_url, gender)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Wishlist fetch error:", error.message);
      else setEntries((data as any) || []);

      setLoading(false);
    };

    fetchWishlist();
  }, []);

  const removeFromWishlist = async (wishlistId: number, shoeId: number) => {
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("id", wishlistId);

    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== wishlistId));
    }
  };

  // ── Not logged in ─────────────────────────────────────────────────────
  if (notLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto mt-20 bg-white rounded-2xl p-10 shadow text-center">
          <p className="text-4xl mb-4">🤍</p>
          <h2 className="text-2xl font-semibold mb-3">Sign in to view your wishlist</h2>
          <p className="text-gray-500 mb-6">Save shoes you love and come back to them anytime.</p>
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-1">My Wishlist</h1>
          {!loading && (
            <p className="text-gray-400 text-sm">
              {entries.length === 0
                ? "No saved shoes yet"
                : `${entries.length} saved shoe${entries.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-center text-gray-500 py-20">Loading your wishlist...</p>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <div className="bg-white rounded-2xl p-14 shadow-sm text-center">
            <p className="text-5xl mb-4">🤍</p>
            <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">
              Browse the catalog and tap the heart on any shoe to save it here.
            </p>
            <Link
              href="/catalog"
              className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
            >
              Browse Catalog
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="group bg-white rounded-2xl overflow-hidden transition hover:shadow-xl relative"
              >
                {/* Remove heart button */}
                <button
                  onClick={() => removeFromWishlist(entry.id, entry.shoe_id)}
                  title="Remove from wishlist"
                  className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center
                             bg-white rounded-full shadow-md hover:scale-110 transition"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>

                <Link href={`/shoes/${entry.shoe.id}`}>
                  <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={entry.shoe.image_url}
                      alt={entry.shoe.name}
                      className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </Link>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-lg">{entry.shoe.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{entry.shoe.model_line}</p>
                  <p className="text-sm text-gray-400">{entry.shoe.gender}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-bold text-lg">${entry.shoe.price}</span>
                    <Link href={`/shoes/${entry.shoe.id}`}>
                      <button className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800 transition">
                        View
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
