import { useRouter } from "next/router";
// pages/recommendations.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

interface Shoe {
type Shoe = {
id: number;
name: string;
model_line: string;
  price: number;
image_url: string;
  price: number;
  width: string;
  category_id: number;
gender: string;
  external_url: string;
}
};

interface Review {
  id: string;
  rating: number;
  review_text: string;
}
type UserProfile = {
  shoe_width: string;
  category_id: number;
};

export default function ShoePage() {
  const router = useRouter();
  const { id } = router.query;
const CATEGORY_MAP: Record<number, string> = {
  1: "Running",
  2: "Casual",
  3: "Sports",
  4: "Hiking",
};

  const [shoe, setShoe] = useState<Shoe | null>(null);
export default function Recommendations() {
const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  // ── Fetch shoe ────────────────────────────────────────────────────────
useEffect(() => {
    // Wait until router is ready and id is available
    if (!router.isReady || !id) return;

    // id from useRouter is always a string — must convert to number
    const numericId = Number(id);
    if (isNaN(numericId)) {
      setError("Invalid shoe ID.");
      setLoading(false);
      return;
    }

    async function fetchShoe() {
    const loadRecommendations = async () => {
setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("shoe")
        .select("*")
        .eq("id", numericId)   // ← number, not string
        .single();
      // Get logged in user
      const { data: { user } } = await supabase.auth.getUser();

      if (error || !data) {
        console.error("Shoe fetch error:", error?.message);
        setError("Shoe not found.");
        setShoe(null);
      } else {
        setShoe(data);
      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
}

      setLoading(false);
    }

    fetchShoe();
  }, [router.isReady, id]);
      // Get user profile — shoe_width is lowercase e.g. "medium", "wide"
      const { data: profileData, error: profileError } = await supabase
        .from("user_profile")
        .select("shoe_width, category_id")
        .eq("id", user.id)
        .single();

  // ── Fetch reviews ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady || !id) return;
      if (profileError || !profileData) {
        console.error("Profile fetch error:", profileError?.message);
        setLoading(false);
        return;
      }

    const numericId = Number(id);
    if (isNaN(numericId)) return;
      setProfile(profileData);

    async function fetchReviews() {
      const { data } = await supabase
        .from("review")
      // Query correct table "shoe" with correct columns "width" and "category_id"
      const { data: shoeData, error: shoeError } = await supabase
        .from("shoe")                                   // ← was "shoes" (wrong)
.select("*")
        .eq("shoe_id", numericId)
        .order("created_at", { ascending: false });

      setReviews(data || []);
    }

    fetchReviews();
  }, [router.isReady, id]);

  // ── Submit review ─────────────────────────────────────────────────────
  async function submitReview() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("You must be logged in to leave a review.");
      return;
    }

    if (rating === 0) {
      alert("Please select a star rating.");
      return;
    }
        .eq("width", profileData.shoe_width)            // ← lowercase match e.g. "medium"
        .eq("category_id", profileData.category_id);   // ← was "cat_id" (wrong)

    if (!reviewText.trim()) {
      alert("Please write a review before submitting.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("review").insert({
      shoe_id: Number(id),
      user_id: userData.user.id,
      rating,
      review_text: reviewText.trim(),
    });

    if (error) {
      console.error("Review submit error:", error.message);
      alert("Something went wrong submitting your review.");
      setSubmitting(false);
      return;
    }

    setReviewText("");
    setRating(0);
    setSubmitting(false);

    // Refresh reviews
    const { data } = await supabase
      .from("review")
      .select("*")
      .eq("shoe_id", Number(id))
      .order("created_at", { ascending: false });
      if (shoeError) {
        console.error("Shoe fetch error:", shoeError.message);
        setLoading(false);
        return;
      }

    setReviews(data || []);
  }
      setShoes(shoeData || []);
      setLoading(false);
    };

  // ── Render states ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <p className="text-center mt-20 text-gray-500">Loading...</p>
      </div>
    );
  }
    loadRecommendations();
  }, []);

  if (error || !shoe) {
  // ── Not logged in ─────────────────────────────────────────────────────
  if (notLoggedIn) {
return (
      <div className="min-h-screen bg-white">
      <div className="min-h-screen bg-gray-100">
<Navbar />
        <div className="text-center mt-20 space-y-3">
          <p className="text-gray-500">{error ?? "Shoe not found."}</p>
          <Link href="/catalog" className="text-sm text-black underline">
            ← Back to catalog
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

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

return (
    <div className="min-h-screen bg-white">
    <div className="min-h-screen bg-gray-100">
<Navbar />

      <div className="px-6 py-10 max-w-5xl mx-auto">
        <Link href="/catalog" className="text-sm text-gray-500 hover:text-black transition">
          ← Back to catalog
        </Link>

        <div className="grid md:grid-cols-2 gap-10 mt-6">
          {/* Image */}
          <div className="bg-gray-100 rounded-2xl aspect-square flex items-center justify-center overflow-hidden">
            <img
              src={shoe.image_url}
              alt={shoe.name}
              className="w-full h-full object-contain p-8"
            />
          </div>

          {/* Details */}
          <div>
            <h1 className="text-3xl font-bold">{shoe.name}</h1>
            <p className="text-gray-500 mt-2">{shoe.model_line}</p>
            <p className="text-gray-500">{shoe.gender}</p>

            {/* Average rating */}
            {averageRating && (
              <p className="text-yellow-500 mt-2 text-sm font-medium">
                ★ {averageRating} / 5 &nbsp;
                <span className="text-gray-400 font-normal">
                  ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                </span>
              </p>
            )}

            <p className="text-2xl font-bold mt-6">${shoe.price}</p>

            {shoe.external_url && (
              <a
                href={shoe.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition"
              >
                View on Brand Site
              </a>
            )}
          </div>
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

        {/* REVIEWS */}
        <div className="mt-12 border-t pt-8">
          <h2 className="text-xl font-semibold mb-6">Reviews</h2>

          {/* Submit form */}
          <div className="mb-8 bg-gray-50 rounded-xl p-5">
            <p className="text-sm font-medium mb-3">Leave a review</p>

            {/* Stars */}
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-2xl transition"
                  type="button"
                >
                  <span className={star <= rating ? "text-yellow-400" : "text-gray-300"}>
                    ★
                  </span>
                </button>
              ))}
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write your review..."
              rows={3}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />

            <button
              onClick={submitReview}
              disabled={submitting}
              className="mt-3 bg-black text-white px-5 py-2 rounded-lg text-sm
                         hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
              Update Preferences
            </Link>
</div>

          {/* Review list */}
          <div className="space-y-4">
            {reviews.length === 0 && (
              <p className="text-gray-400 text-sm">No reviews yet — be the first!</p>
            )}

            {reviews.map((r) => (
              <div key={r.id} className="border-b border-gray-100 pb-4">
                <p className="text-yellow-400 text-sm">
                  {"★".repeat(r.rating)}
                  <span className="text-gray-300">{"★".repeat(5 - r.rating)}</span>
                </p>
                <p className="text-gray-700 text-sm mt-1">{r.review_text}</p>
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
        </div>
      </div>
        )}
      </main>
</div>
);
}
