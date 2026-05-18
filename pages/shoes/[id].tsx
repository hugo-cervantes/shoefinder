import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { BRANDS, BrandKey, BrandSizes, getAllConversions, detectBrand } from "../../lib/brandSizes";
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
  category_id: number;
  width: string;
  ai_description?: string;
}

interface Review {
  id: string;
  rating: number;
  review_text: string;
  helpful_count: number;
  not_helpful_count: number;
}

const CATEGORY_MAP: Record<number, string> = {
  1: "Running", 2: "Casual", 3: "Sports", 4: "Hiking",
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

  const [isSaved, setIsSaved]                 = useState(false);
  const [wishlistId, setWishlistId]           = useState<number | null>(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [userId, setUserId]                   = useState<string | null>(null);
  const [heartHovered, setHeartHovered]       = useState(false);

  const [personalDesc, setPersonalDesc]         = useState<string | null>(null);
  const [personalLoading, setPersonalLoading]   = useState(false);

  const [brandSizes, setBrandSizes]             = useState<BrandSizes | null>(null);
  const [detectedBrand, setDetectedBrand]       = useState<BrandKey | null>(null);
  const [userSizeForBrand, setUserSizeForBrand] = useState<number | null>(null);

  const [similarShoes, setSimilarShoes] = useState<Shoe[]>([]);
  const [userVotes, setUserVotes]       = useState<Record<string, boolean>>({});
  const [votingId, setVotingId]         = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !id) return;
    const numericId = Number(id);
    if (isNaN(numericId)) { setError("Invalid shoe ID."); setLoading(false); return; }
    supabase.from("shoe").select("*").eq("id", numericId).single()
      .then(({ data, error: e }) => {
        if (e || !data) { setError("Shoe not found."); } else { setShoe(data); }
        setLoading(false);
      });
  }, [router.isReady, id]);

  const fetchReviews = () => {
    if (!router.isReady || !id) return;
    supabase.from("review").select("*").eq("shoe_id", Number(id))
      .order("helpful_count", { ascending: false })
      .then(({ data }) => setReviews(data || []));
  };
  useEffect(() => { fetchReviews(); }, [router.isReady, id]);

  useEffect(() => {
    if (!shoe) return;
    supabase.from("shoe").select("*").eq("category_id", shoe.category_id).neq("id", shoe.id).limit(4)
      .then(({ data }) => setSimilarShoes(data || []));
  }, [shoe]);

  useEffect(() => {
    if (!router.isReady || !id) return;
    const numericId = Number(id);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase.from("wishlist").select("id").eq("user_id", user.id).eq("shoe_id", numericId).maybeSingle()
        .then(({ data: wl }) => { if (wl) { setIsSaved(true); setWishlistId(wl.id); } });
      supabase.from("user_profile").select("brand_sizes").eq("id", user.id).single()
        .then(({ data: profile }) => { if (profile?.brand_sizes) setBrandSizes(profile.brand_sizes); });
      supabase.from("review_votes").select("review_id, vote").eq("user_id", user.id)
        .then(({ data: votes }) => {
          if (votes) {
            const voteMap: Record<string, boolean> = {};
            votes.forEach((v: any) => { voteMap[v.review_id] = v.vote; });
            setUserVotes(voteMap);
          }
        });
    });
  }, [router.isReady, id]);

  useEffect(() => {
    if (!shoe || !userId) return;
    setPersonalLoading(true);
    fetch("/api/shoe-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shoeId: shoe.id, userId: userId, mode: "personal" }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) { if (data.reasoning) setPersonalDesc(data.reasoning); })
      .catch(function() {})
      .finally(function() { setPersonalLoading(false); });
  }, [shoe, userId]);

  useEffect(() => {
    if (!shoe?.external_url || !brandSizes) return;
    const brand = detectBrand(shoe.external_url);
    setDetectedBrand(brand);
    if (!brand) return;
    const conversions = getAllConversions(brandSizes);
    if (!conversions) return;
    setUserSizeForBrand(conversions[brand]);
  }, [shoe, brandSizes]);

  const toggleWishlist = async () => {
    if (!userId) { router.push("/login"); return; }
    setWishlistLoading(true);
    if (isSaved && wishlistId) {
      const { error: e } = await supabase.from("wishlist").delete().eq("id", wishlistId);
      if (!e) { setIsSaved(false); setWishlistId(null); window.dispatchEvent(new Event("wishlist-updated")); }
    } else {
      const { data, error: e } = await supabase.from("wishlist")
        .insert({ user_id: userId, shoe_id: Number(id) }).select("id").single();
      if (!e && data) { setIsSaved(true); setWishlistId(data.id); window.dispatchEvent(new Event("wishlist-updated")); }
    }
    setWishlistLoading(false);
  };

  const handleVote = async (reviewId: string, vote: boolean) => {
    if (!userId) { router.push("/login"); return; }
    if (votingId) return;
    setVotingId(reviewId);
    const existing = userVotes[reviewId];
    if (existing === vote) {
      await supabase.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", userId);
      const r = reviews.find(r => r.id === reviewId)!;
      await supabase.from("review")
        .update({ [vote ? "helpful_count" : "not_helpful_count"]: r[vote ? "helpful_count" : "not_helpful_count"] - 1 })
        .eq("id", reviewId);
      setUserVotes(prev => { const n = { ...prev }; delete n[reviewId]; return n; });
    } else {
      if (existing !== undefined) {
        await supabase.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", userId);
        const r = reviews.find(r => r.id === reviewId)!;
        await supabase.from("review").update({
          helpful_count: existing ? r.helpful_count - 1 : r.helpful_count + 1,
          not_helpful_count: existing ? r.not_helpful_count + 1 : r.not_helpful_count - 1,
        }).eq("id", reviewId);
      } else {
        await supabase.from("review_votes").insert({ review_id: reviewId, user_id: userId, vote });
        const r = reviews.find(r => r.id === reviewId)!;
        await supabase.from("review")
          .update({ [vote ? "helpful_count" : "not_helpful_count"]: (vote ? r.helpful_count : r.not_helpful_count) + 1 })
          .eq("id", reviewId);
      }
      setUserVotes(prev => ({ ...prev, [reviewId]: vote }));
    }
    fetchReviews();
    setVotingId(null);
  };

  async function submitReview() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { alert("You must be logged in to leave a review."); return; }
    if (rating === 0) { alert("Please select a star rating."); return; }
    if (!reviewText.trim()) { alert("Please write a review before submitting."); return; }
    setSubmitting(true);
    const { error: e } = await supabase.from("review").insert({
      shoe_id: Number(id), user_id: userData.user.id, rating,
      review_text: reviewText.trim(), helpful_count: 0, not_helpful_count: 0,
    });
    if (e) { alert("Something went wrong."); setSubmitting(false); return; }
    setReviewText(""); setRating(0); setSubmitting(false);
    fetchReviews();
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
        <Link href="/catalog" className="text-sm text-black underline">Back to catalog</Link>
      </div>
    </div>
  );

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const brandLabel = detectedBrand ? BRANDS.find(b => b.key === detectedBrand)?.label : null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="px-6 py-10 max-w-5xl mx-auto">
        <Link href="/catalog" className="text-sm text-gray-500 hover:text-black transition">
          Back to catalog
        </Link>

        <div className="grid md:grid-cols-2 gap-10 mt-6">
          <div className="bg-gray-100 rounded-2xl aspect-square flex items-center justify-center overflow-hidden">
            <img src={shoe.image_url} alt={shoe.name} className="w-full h-full object-contain p-8" />
          </div>

          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{shoe.name}</h1>
              <div className="relative shrink-0 mt-1">
                <button onClick={toggleWishlist}
                  onMouseEnter={() => setHeartHovered(true)}
                  onMouseLeave={() => setHeartHovered(false)}
                  disabled={wishlistLoading}
                  className={"w-11 h-11 flex items-center justify-center rounded-full border-2 transition disabled:opacity-40 " + (isSaved ? "bg-red-50 border-red-300 hover:bg-red-100" : "bg-white border-gray-200 hover:border-red-300 hover:bg-red-50")}>
                  <svg className={"w-5 h-5 " + (isSaved ? "text-red-500" : "text-gray-300")}
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
                {""} {averageRating} / 5{" "}
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
                <a href={shoe.external_url} target="_blank" rel="noopener noreferrer"
                  className="inline-block bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition">
                  View on {brandLabel ?? "Brand"} Site
                </a>
                {userSizeForBrand && brandLabel && (
                  <div className="mt-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 w-fit">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm text-gray-600">Your {brandLabel} size: <span className="font-bold text-gray-900">{userSizeForBrand}</span></span>
                  </div>
                )}
                {!userSizeForBrand && detectedBrand && (
                  <p className="mt-2 text-xs text-gray-400">
                    <Link href="/settings" className="underline hover:text-black transition">Add your {brandLabel} size in settings</Link> to see your size here
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Shoe description + personal fit */}
        <div className="mt-10 space-y-5">
          {shoe.ai_description && (
            <div>
              <h2 className="text-lg font-semibold mb-2">About this shoe</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{shoe.ai_description}</p>
            </div>
          )}
          {userId && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                </svg>
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Your fit analysis</p>
              </div>
              {personalLoading && !personalDesc ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-purple-100 rounded w-full" />
                  <div className="h-3 bg-purple-100 rounded w-4/6" />
                </div>
              ) : (
                <p className="text-sm text-purple-900 leading-relaxed">{personalDesc}</p>
              )}
            </div>
          )}
          {!userId && shoe.ai_description && (
            <Link href={"/login?redirect=/shoes/" + shoe.id}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-black transition group">
              <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
              <span><span className="text-purple-500 font-medium group-hover:underline">Sign in</span> to see a personal fit analysis for this shoe</span>
            </Link>
          )}
        </div>

        {/* You might also like */}
        {similarShoes.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-semibold mb-5">You Might Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {similarShoes.map(s => (
                <Link key={s.id} href={"/shoes/" + s.id}
                  className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden">
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img src={s.image_url} alt={s.name}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition duration-300" />
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.model_line}</p>
                    <p className="font-bold text-sm mt-1">${s.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-14 border-t pt-8">
          <h2 className="text-xl font-semibold mb-6">Reviews</h2>
          <div className="mb-8 bg-gray-50 rounded-xl p-5">
            <p className="text-sm font-medium mb-3">Leave a review</p>
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)} type="button" className="text-2xl">
                  <span className={star <= rating ? "text-yellow-400" : "text-gray-300"}>{""}</span>
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
          <div className="space-y-5">
            {reviews.length === 0 && <p className="text-gray-400 text-sm">No reviews yet - be the first!</p>}
            {reviews.map(r => (
              <div key={r.id} className="border-b border-gray-100 pb-5">
                <p className="text-yellow-400 text-sm">
                  {"".repeat(r.rating)}<span className="text-gray-300">{"".repeat(5 - r.rating)}</span>
                </p>
                <p className="text-gray-700 text-sm mt-1 mb-3">{r.review_text}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Helpful?</span>
                  <button onClick={() => handleVote(r.id, true)} disabled={votingId === r.id}
                    className={"flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition disabled:opacity-40 " + (userVotes[r.id] === true ? "bg-green-50 border-green-300 text-green-600" : "bg-white border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600")}>
                    Up <span>{r.helpful_count}</span>
                  </button>
                  <button onClick={() => handleVote(r.id, false)} disabled={votingId === r.id}
                    className={"flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition disabled:opacity-40 " + (userVotes[r.id] === false ? "bg-red-50 border-red-300 text-red-500" : "bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500")}>
                    Down <span>{r.not_helpful_count}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
