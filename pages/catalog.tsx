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

export default function CatalogPage() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShoes() {
      const { data, error } = await supabase
        .from("shoe")
        .select("*")
        .order("id", { ascending: true });

      if (error) console.error(error);
      else setShoes(data || []);

      setLoading(false);
    }
    fetchShoes();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* HERO */}
      <section
        className="bg-cover bg-center h-56 md:h-96"
        style={{ backgroundImage: "url('/images/catalog-hero.jpg')" }}
      >
        <div className="bg-black/50 h-full w-full flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            Explore Our Collection
          </h1>
        </div>
      </section>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {loading && (
          <p className="text-center text-gray-600">Loading shoes...</p>
        )}

        {!loading && shoes.length === 0 && (
          <p className="text-center text-gray-500">No shoes available.</p>
        )}

        {/* ✅ GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {shoes.map((shoe) => (
            <div
              key={shoe.id}
              className="group bg-white rounded-2xl overflow-hidden transition hover:shadow-xl"
            >
              {/* ✅ FIXED IMAGE */}
              <Link href={`/shoes/${shoe.id}`}>
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={shoe.image_url}
                    alt={shoe.name}
                    className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </Link>

              {/* INFO */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {shoe.name}
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {shoe.model_line}
                </p>

                <p className="text-sm text-gray-500">
                  {shoe.gender}
                </p>

                <div className="flex justify-between items-center mt-3">
                  <span className="font-bold text-lg">
                    ${shoe.price}
                  </span>

                  <Link href={`/shoes/${shoe.id}`}>
                    <button className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800">
                      View
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}