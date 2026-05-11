import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";

export default function Questionnaire() {
  const [userId, setUserId] = useState<string | null>(null);

  const [gender, setGender] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [shoeWidth, setShoeWidth] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    };

    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      console.error("User not logged in");
      return;
    }

    const { error } = await supabase.from("user_profile").upsert({
      id: userId,
      gender,
      shoe_size: Number(shoeSize),
      shoe_width: shoeWidth,
      category_id: categoryId || null,
    });

    if (error) {
      console.error("Upsert error:", error.message);
      return;
    }

    console.log("Profile updated successfully");
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

          <div>
            <label className="block font-medium mb-2">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2">Shoe Size</label>
            <input
              type="number"
              step="0.5"
              value={shoeSize}
              onChange={(e) => setShoeSize(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

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
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
          >
            Save Profile
          </button>
        </form>
      </section>
    </div>
  );
}
