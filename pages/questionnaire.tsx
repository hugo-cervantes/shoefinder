import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

export default function Questionnaire() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [gender, setGender] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [shoeWidth, setShoeWidth] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [shoeSizeError, setShoeSizeError] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    };
    getUser();
  }, []);

  // ── Shoe size sanitization ─────────────────────────────────────────────
  const handleShoeSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Block the letter "e", "+", "-", and any non-numeric chars except "."
    const cleaned = raw.replace(/[^0-9.]/g, "");

    // Only allow one decimal point
    const parts = cleaned.split(".");
    const sanitized =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;

    // Max 2 digits before the decimal
    const [whole, decimal] = sanitized.split(".");
    if (whole && whole.length > 2) return; // reject if more than 2 digits

    setShoeSizeError("");

    // Validate range: 1–99, no negatives
    const num = parseFloat(sanitized);
    if (sanitized !== "" && !isNaN(num)) {
      if (num <= 0) {
        setShoeSizeError("Shoe size must be a positive number.");
        return;
      }
      if (num > 99) {
        setShoeSizeError("Shoe size cannot exceed 2 digits.");
        return;
      }
      // Only allow 0.5 increments
      if (decimal !== undefined && decimal !== "" && decimal !== "5") {
        setShoeSizeError("Only half sizes are allowed (e.g. 9, 9.5).");
      }
    }

    setShoeSize(sanitized);
  };

  // Block "e", "-", "+" at the keyboard level
  const handleShoeSizeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "-", "+"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      console.error("User not logged in");
      return;
    }

    if (shoeSizeError) return; // don't submit with validation errors

    const sizeNum = parseFloat(shoeSize);
    if (isNaN(sizeNum) || sizeNum <= 0 || sizeNum > 99) {
      setShoeSizeError("Please enter a valid shoe size.");
      return;
    }

    // Sanitize gender and shoeWidth against unexpected values
    const allowedGenders = ["Men", "Women", "Unisex"];
    const allowedWidths = ["narrow", "medium", "wide", "extra-wide"];
    const allowedCategories = [1, 2, 3, 4];

    if (!allowedGenders.includes(gender)) return;
    if (!allowedWidths.includes(shoeWidth)) return;
    if (categoryId !== "" && !allowedCategories.includes(Number(categoryId))) return;

    const { error } = await supabase
      .from("user_profile")
      .update({
        gender,
        shoe_size: sizeNum,
        shoe_width: shoeWidth,
        category_id: categoryId || null,
      })
      .eq("id", userId);

    if (error) {
      console.error("Update error:", error.message);
      return;
    }

    router.push("/recommendation");
  };

  return (
    <div>
      <Navbar />

      <section className="min-h-[80vh] flex items-center justify-center bg-gray-100 p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-md space-y-6"
        >
          <h1 className="text-3xl font-bold text-center">
            Shoe Fit Questionnaire
          </h1>

          {/* Gender */}
          <div>
            <label className="block font-medium mb-2">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select gender</option>
              <option value="Men">Mens</option>
              <option value="Women">Womens</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>

          {/* Shoe Size — sanitized */}
          <div>
            <label className="block font-medium mb-2">Shoe Size</label>
            <input
              type="text"           // text not number — gives us full control
              inputMode="decimal"   // shows numeric keyboard on mobile
              value={shoeSize}
              onChange={handleShoeSizeChange}
              onKeyDown={handleShoeSizeKeyDown}
              placeholder="e.g. 9 or 9.5"
              maxLength={4}         // max "99.5"
              className={`w-full p-2 border rounded transition ${
                shoeSizeError ? "border-red-400 bg-red-50" : ""
              }`}
              required
            />
            {shoeSizeError && (
              <p className="text-red-500 text-sm mt-1">{shoeSizeError}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">
              Whole or half sizes only (e.g. 8, 8.5, 12). Max 2 digits.
            </p>
          </div>

          {/* Shoe Width */}
          <div>
            <label className="block font-medium mb-2">Width</label>
            <select
              value={shoeWidth}
              onChange={(e) => setShoeWidth(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select width</option>
              <option value="narrow">Narrow</option>
              <option value="medium">Medium</option>
              <option value="wide">Wide</option>
              <option value="extra-wide">Extra Wide</option>
            </select>
          </div>

          {/* Activity */}
          <div>
            <label className="block font-medium mb-2">Activity</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select activity</option>
              <option value={1}>Running</option>
              <option value={2}>Casual</option>
              <option value={3}>Sports</option>
              <option value={4}>Hiking</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!!shoeSizeError}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Save Profile
          </button>
        </form>
      </section>
    </div>
  );
}
