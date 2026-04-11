import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

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

  // ⭐ REVIEWS STATE
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  // ---------------- FETCH SHOE ----------------
  useEffect(() => {
    if (!id) return;

    async function fetchShoe() {
      const { data } = await supabase
        .from("shoe")
        .select("*")
        .eq("id", id)
        .single();

      setShoe(data);
      setLoading(false);
    }

    fetchShoe();
  }, [id]);

  // ---------------- FETCH REVIEWS ----------------
  useEffect(() => {
    if (!id) return;

    async function fetchReviews() {
      const { data } = await supabase
        .from("review")
        .select("*")
        .eq("shoe_id", id)
        .order("created_at", { ascending: false });

      setReviews(data || []);
    }

    fetchReviews();
  }, [id]);

  // ---------------- SUBMIT REVIEW ----------------
  async function submitReview() {
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      alert("You must be logged in to review");
      return;
    }

    await supabase.from("review").insert({
      shoe_id: Number(id),
      user_id: user.data.user.id,
      rating,
      review_text: reviewText,
    });

    setReviewText("");
    setRating(5);

    // refresh reviews
    const { data } = await supabase
      .from("review")
      .select("*")
      .eq("shoe_id", id)
      .order("created_at", { ascending: false });

    setReviews(data || []);
  }

  // ---------------- LOADING ----------------
  if (loading) {
    return <p className="text-center mt-20">Loading...</p>;
  }

  if (!shoe) {
    return <p className="text-center mt-20">Shoe not found.</p>;
  }

  return (
    <div className="min-h-screen bg-white px-6 py-10 max-w-5xl mx-auto">

      <Link href="/catalog" className="text-sm text-gray-500">
        ← Back to catalog
      </Link>

      <div className="grid md:grid-cols-2 gap-10 mt-6">

        {/* IMAGE */}
        <div className="bg-gray-100 aspect-square flex items-center justify-center">
          <img
            src={shoe.image_url}
            alt={shoe.name}
            className="w-full h-full object-contain p-8"
          />
        </div>

        {/* INFO */}
        <div>
          <h1 className="text-3xl font-bold">{shoe.name}</h1>

          <p className="text-gray-500 mt-2">{shoe.model_line}</p>
          <p className="text-gray-500">{shoe.gender}</p>

          <p className="text-2xl font-bold mt-6">${shoe.price}</p>

          <a
            href={shoe.external_url}
            target="_blank"
            className="inline-block mt-6 bg-black text-white px-6 py-3 rounded"
          >
            View on Brand Site
          </a>
        </div>
      </div>

      {/* ⭐ REVIEW SECTION */}
      <div className="mt-12 border-t pt-8">

        <h2 className="text-xl font-semibold mb-4">Reviews</h2>

        {/* FORM */}
        <div className="mb-6">
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border p-2 rounded"
          >
            {[5,4,3,2,1].map((r) => (
              <option key={r} value={r}>
                {r} Stars
              </option>
            ))}
          </select>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Write your review..."
            className="w-full border mt-3 p-2 rounded"
          />

          <button
            onClick={submitReview}
            className="mt-3 bg-black text-white px-4 py-2 rounded"
          >
            Submit Review
          </button>
        </div>

        {/* LIST */}
        <div className="space-y-4">
          {reviews.length === 0 && (
            <p className="text-gray-500">No reviews yet.</p>
          )}

          {reviews.map((r) => (
            <div key={r.id} className="border-b pb-3">
              <p className="font-medium">{r.rating} ⭐</p>
              <p className="text-gray-700">{r.review_text}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}