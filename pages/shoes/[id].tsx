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

  const [shoe, setShoe]       = useState<Shoe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [reviews, setReviews]       = useState<Review[]>([]);
  const [rating, setRating]         = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Wishlist state
  const [isSaved, setIsSaved]             = useState(false);
  const [wishlistId, setWishlistId]       = useState<number | null>(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [userId, setUserId]               = useState<string | null>(null);
  const [heartHovered, setHeartHovered]   = useState(false)

  // ── Fetch shoe ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady || !id) return;
    const numericId = Number(id);
    if (isNaN(numericId)) { setError("Invalid shoe ID."); setLoading(false); return; }

    async function fetchShoe() {
      setLoading(true);
      const { data, error } = await supabase
        .from("shoe").select("*").eq("id", numericId).single();
      if (error || !data) { setError("Shoe not found."); setLoading(false); return; }
      setShoe(data);
      setLoading(false);
    }
    fetchShoe();
  }, [router.isReady, id]);

  // ── Fetch reviews ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady || !id) return;
    const numericId = Number(id);
    if (isNaN(numericId)) return;

    supabase.from("review").select("*").eq("shoe_id", numericId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews(data || []));
  }, [router.isReady, id]);

  // ── Check if shoe is already in wishlist ──────────────────────────────
  useEffect(() => {
    if (!router.isReady || !id) return;
    const numericId = Number(id);

    const checkWishlist = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("shoe_id", numericId)
        .maybeSingle();

      if (data) {
        setIsSaved(true);
        setWishlistId(data.id);
      }
    };
    checkWishlist();
  }, [router.isReady, id]);

  // ── Toggle wishlist ───────────────────────────────────────────────────
  const toggleWishlist = async () => {
    if (!userId) {
      router.push("/login");
      return;
    }

    setWishlistLoading(true);

    if (isSaved && wishlistId) {
      // Remove from wishlist
      const { error } = await supabase
        .from("wishlist").delete().eq("id", wishlistId);
      if (!error) {
        setIsSaved(false);
        setWishlistId(null);
      }
    } else {
      // Add to wishlist
      const { data, error } = await supabase
        .from("wishlist")
        .insert({ user_id: userId, shoe_id: Number(id) })
        .select("id")
        .single();
      if (!error && data) {
        setIsSaved(true);
        setWishlistId(data.id);
      }
    }

    setWishlistLoading(false);
  };

  // ── Submit review ─────────────────────────────────────────────────────
  async function submitReview() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { alert("You must be logged in to leave a review."); return; }
    if (rating === 0)   { alert("Please select a star rating."); return; }
    if (!reviewText.trim()) { alert("Please write a review before submitting."); return; }

    setSubmitting(true);
    const { error } = await supabase.from("review").insert({
      shoe_id: Number(id),
      user_id: userData.user.id,
      rating,
      review_text: reviewText.trim(),
    });
    if (error) { alert("Something went wrong."); setSubmitting(false); return; }

    setReviewText("");
    setRating(0);
    setSubmitting(false);

    const { data } = await supabase.from("review").select("*")
      .eq("shoe_id", Number(id)).order("created_at", { ascending: false });
    setReviews(data || []);
  }

  // ── Loading / error states ────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-white"><Navbar />
      <p className="text-center mt-20 text-gray-500">Loading...</p>
    </div>
  );

  if (error || !shoe) return (
    <div className="min-h-screen bg-white"><Navbar />
      <div className="text-center mt-20 space-y-3">
        <p className="text-gray-500">{error ?? "Shoe not found."}</p>
        <Link href="/catalog" className="text-sm text-black underline">← Back to catalog</Link>
      </div>
    </div>
  );

  const averageRating = reviews.length > 0
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
            <img src={shoe.image_url} alt={shoe.name}
              className="w-full h-full object-contain p-8" />
          </div>

          {/* Details */}
          <div>
            {/* Name + heart button row */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{shoe.name}</h1>

              {/* ── Heart / Wishlist button ── */}
              <div className="relative shrink-0 mt-1">
                <button
                  onClick={toggleWishlist}
                  onMouseEnter={() => setHeartHovered(true)}
                  onMouseLeave={() => setHeartHovered(false)}
                  disabled={wishlistLoading}
                  className={`w-11 h-11 flex items-center justify-center rounded-full border-2 transition
                    ${isSaved
                      ? "bg-red-50 border-red-300 hover:bg-red-100"
                      : "bg-white border-gray-200 hover:border-red-300 hover:bg-red-50"
                    } disabled:opacity-40`}
                  title={isSaved ? "Remove from wishlist" : "Save to wishlist"}
                >
                  <svg
                    className={`w-5 h-5 transition-colors ${
                      isSaved ? "text-red-500" : "text-gray-300 group-hover:text-red-400"
                    }`}
                    fill={isSaved ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={isSaved ? 0 : 2}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Tooltip */}
                {heartHovered && (
                  <div className="absolute right-0 top-12 bg-gray-900 text-white text-xs
                                  px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-10">
                    {isSaved ? "Remove from wishlist" : "Save to wishlist"}
                    {/* Arrow */}
                    <div className="absolute -top-1 right-3.5 w-2 h-2 bg-gray-900 rotate-45" />
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-500 mt-2">{shoe.model_line}</p>
            <p className="text-gray-500">{shoe.gender}</p>

            {averageRating && (
              <p className="text-yellow-500 mt-2 text-sm font-medium">
                ★ {averageRating} / 5{" "}
                <span className="text-gray-400 font-normal">
                  ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                </span>
              </p>
            )}

            <p className="text-2xl font-bold mt-6">${shoe.price}</p>

            {shoe.external_url && (
              <a href={shoe.external_url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-6 bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition">
                View on Brand Site
              </a>
            )}

            {/* Saved confirmation */}
            {isSaved && (
              <p className="mt-4 text-sm text-red-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                           2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                           C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                           c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                Saved to your{" "}
                <Link href="/wishlist" className="underline hover:text-red-500 transition">
                  wishlist
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-12 border-t pt-8">
          <h2 className="text-xl font-semibold mb-6">Reviews</h2>

          <div className="mb-8 bg-gray-50 rounded-xl p-5">
            <p className="text-sm font-medium mb-3">Leave a review</p>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} type="button" className="text-2xl transition">
                  <span className={star <= rating ? "text-yellow-400" : "text-gray-300"}>★</span>
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
            <button onClick={submitReview} disabled={submitting}
              className="mt-3 bg-black text-white px-5 py-2 rounded-lg text-sm
                         hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>

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
