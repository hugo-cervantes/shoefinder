import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import Navbar from "../../components/Navbar";

interface Shoe {
  id: number;
  name: string;
  model_line: string;
  price: number;
  image_url: string;
  gender: string;
  external_url: string;
}

interface Review {
  id: string;
  rating: number;
  review_text: string;
}

export default function ShoePage() {
  const router = useRouter();
  const { id } = router.query;

  const [shoe, setShoe] = useState<Shoe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("shoe")
        .select("*")
        .eq("id", numericId)   // ← number, not string
        .single();

      if (error || !data) {
        console.error("Shoe fetch error:", error?.message);
        setError("Shoe not found.");
        setShoe(null);
      } else {
        setShoe(data);
      }

      setLoading(false);
    }

    fetchShoe();
  }, [router.isReady, id]);

  // ── Fetch reviews ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady || !id) return;

    const numericId = Number(id);
    if (isNaN(numericId)) return;

    async function fetchReviews() {
      const { data } = await supabase
        .from("review")
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

    setReviews(data || []);
  }

  // ── Render states ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <p className="text-center mt-20 text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !shoe) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="text-center mt-20 space-y-3">
          <p className="text-gray-500">{error ?? "Shoe not found."}</p>
          <Link href="/catalog" className="text-sm text-black underline">
            ← Back to catalog
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
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
