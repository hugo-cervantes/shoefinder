import { useState } from "react";
import Navbar from "../components/Navbar";

export default function Questionnaire() {
  const [gender, setGender] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [width, setWidth] = useState("");
  const [activity, setActivity] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      gender,
      shoeSize,
      width,
      activity,
    };

    console.log("User Input:", formData);
    // later: send to Supabase or state manager
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
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          {/* Shoe Size */}
          <div>
            <label className="block font-medium mb-2">Shoe Size (US)</label>
            <input
              type="number"
              step="0.5"
              min="3"
              max="18"
              value={shoeSize}
              onChange={(e) => setShoeSize(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="e.g. 10.5"
              required
            />
          </div>

          {/* Width */}
          <div>
            <label className="block font-medium mb-2">Width</label>
            <select
              value={width}
              onChange={(e) => setWidth(e.target.value)}
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
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select activity</option>
              <option value="running">Running</option>
              <option value="walking">Walking</option>
              <option value="basketball">Basketball</option>
              <option value="training">Training / Gym</option>
              <option value="casual">Casual / Everyday</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
          >
            Continue
          </button>
        </form>
      </section>
    </div>
  );
}
