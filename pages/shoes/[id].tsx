import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { BRANDS, BrandKey, BrandSizes, getAllConversions, detectBrand, buildSizeUrl } from "../../lib/brandSizes";
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

  // Wishlist
  const [isSaved, setIsSaved]               = useState(false);
  const [wishlistId, setWishlistId]         = useState<number | null>(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [userId, setUserId]                 = useState<string | null>(null);
  const [heartHovered, setHeartHovered]     = useState(false);

  // Brand size
  const [brandSizes, setBrandSizes]         = useState<BrandSizes | null>(null);
  const [sizeUrl, setSizeUrl]               = useState<string | null>(null);
  const [detectedBrand, setDetectedBrand]   = useState<BrandKey | null>(null);
  const [userSizeForBrand, setUserSizeForBrand] = useState<number | null>(null);

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

  // ── Check wishlist + load brand sizes ─────────────────────────────────
  useEffect(() => {
    if (!router.isReady || !id) return;
    const numericId = Number(id);

    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Check wishlist
      const { data: wl } = await supabase
        .from("wishlist").select("id")
        .eq("user_id", user.id).eq("shoe_id", numericId).maybeSingle();
      if (wl) { setIsSaved(true); setWishlistId(wl.id); }

      // Load brand sizes from user_profile
      const { data: profile } = await supabase
        .from("user_profile").select("brand_sizes")
        .eq("id", user.id).single();

      if (profile?.brand_sizes) {
        setBrandSizes(profile.brand_sizes);
      }
    };
    loadUserData();
  }, [router.isReady, id]);

  // ── Build size-aware URL once we have shoe + brand sizes ──────────────
  useEffect(() => {
    if (!shoe?.external_url || !brandSizes) return;

    const brand = detectBrand(shoe.external_url);
    setDetectedBrand(brand);

    if (!brand) return;

    // Get all conversions and find size for this brand
    const conversions = getAllConversions(brandSizes);
    if (!conversions) return;

    const size = conversions[brand];
    setUserSizeForBrand(size);

    // Build the URL with size pre-filled
    const url = buildSizeUrl(shoe.external_url, brand, size);
    setSizeUrl(url);
  }, [shoe, brandSizes]);

  // ── Toggle wishlist ───────────────────────────────────────────────────
  const toggleWishlist = async () => {
    if (!userId) { router.push("/login"); return; }
    setWishlistLoading(true);

    if (isSaved && wishlistId) {
      const { error } = await supabase.from("wishlist").delete().eq("id", wishlistId);
      if (!error) { setIsSaved(false); setWishlistId(null); window.dispatchEvent(new Event("wishlist-updated")); }
    } else {
      const { data, error } = await supabase.from("wishlist")
        .insert({ user_id: userId, shoe_id: Number(id) }).select("id").single();
      if (!error && data) { setIsSaved(true); setWishlistId(data.id); window.dispatchEvent(new Event("wishlist-updated")); }
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
      shoe_id: Number(id), user_id: userData.user.id, rating, review_text: reviewText.trim(),
    });
    if (error) { alert("Something went wrong."); setSubmitting(false); return; }
    setReviewText(""); setRating(0); setSubmitting(false);
    const { data } = await supabase.from("review").select("*")
      .eq("shoe_id", Number(id)).order("created_at", { ascending: false });
    setReviews(data || []);
  }

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

  const brandLabel = detectedBrand
    ? BRANDS.find(b => b.key === detectedBrand)?.label
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
            <img src={shoe.image_url} alt={shoe.name} className="w-full h-full object-contain p-8" />
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{shoe.name}</h1>

              {/* Heart button */}
              <div className="relative shrink-0 mt-1">
                <button
                  onClick={toggleWishlist}
                  onMouseEnter={() => setHeartHovered(true)}
                  onMouseLeave={() => setHeartHovered(false)}
                  disabled={wishlistLoading}
                  className={`w-11 h-11 flex items-center justify-center rounded-full border-2 transition
                    ${isSaved ? "bg-red-50 border-red-300 hover:bg-red-100" : "bg-white border-gray-200 hover:border-red-300 hover:bg-red-50"}
                    disabled:opacity-40`}
                >
                  <svg className={`w-5 h-5 transition-colors ${isSaved ? "text-red-500" : "text-gray-300"}`}
                    fill={isSaved ? "currentColor" : "none"} stroke={isSaved ? "none" : "currentColor"}
                    strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {heartHovered && (
                  <div className="absolute right-0 top-12 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-10">
                    {isSaved ? "Remove from wishlist" : "Save to wishlist"}
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
                <span className="text-gray-400 font-normal">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
              </p>
            )}

            <p className="text-2xl font-bold mt-6">${shoe.price}</p>

            {isSaved && (
              <p className="mt-3 text-sm text-red-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                Saved to your <Link href="/wishlist" className="underline hover:text-red-500 transition">wishlist</Link>
              </p>
            )}

            {shoe.external_url && (
              <div className="mt-6">
                <a
                  href={sizeUrl ?? shoe.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition"
                >
                  View on {brandLabel ?? "Brand"} Site
                </a>

                {/* Size pre-fill confirmation */}
                {userSizeForBrand && brandLabel && (
                  <p className="mt-2 text-xs text-green-600 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Your {brandLabel} size ({userSizeForBrand}) will be pre-selected on their site
                  </p>
                )}

                {/* Prompt to set brand sizes if not set */}
                {brandSizes && !userSizeForBrand && detectedBrand && (
                  <p className="mt-2 text-xs text-gray-400">
                    <Link href="/questionnaire" className="underline hover:text-black transition">
                      Set your {brandLabel} size
                    </Link>{" "}
                    to auto-fill on their site
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-12 border-t pt-8">
          <h2 className="text-xl font-semibold mb-6">Reviews</h2>
          <div className="mb-8 bg-gray-50 rounded-xl p-5">
            <p className="text-sm font-medium mb-3">Leave a review</p>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)} type="button" className="text-2xl">
                  <span className={star <= rating ? "text-yellow-400" : "text-gray-300"}>★</span>
                </button>
              ))}
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
              placeholder="Write your review..." rows={3}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
            <button onClick={submitReview} disabled={submitting}
              className="mt-3 bg-black text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
          <div className="space-y-4">
            {reviews.length === 0 && <p className="text-gray-400 text-sm">No reviews yet — be the first!</p>}
            {reviews.map(r => (
              <div key={r.id} className="border-b border-gray-100 pb-4">
                <p className="text-yellow-400 text-sm">
                  {"★".repeat(r.rating)}<span className="text-gray-300">{"★".repeat(5 - r.rating)}</span>
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
