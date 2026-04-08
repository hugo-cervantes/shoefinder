// pages/catalog.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Shoe = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  external_url: string;
  gender: string;
  model_line: string;
  brand_id: number;
  category_id: number;
};

export default function Catalog() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShoes() {
      const { data, error } = await supabase.from('shoe').select('*');
      if (error) {
        console.error('Error fetching shoes:', error);
        setError(error.message);
      } else {
        setShoes(data);
      }
    }
    fetchShoes();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-8 text-center">Shoe Catalog</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}

      {shoes.length === 0 && !error && (
        <p className="text-gray-500 text-center">No shoes available yet. Try adding some sample data!</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {shoes.map((shoe) => (
          <div
            key={shoe.id}
            className="border rounded-lg shadow hover:shadow-lg transition overflow-hidden"
          >
            <img
              src={shoe.image_url || 'https://via.placeholder.com/300?text=No+Image'}
              alt={shoe.name}
              className="w-full h-64 object-cover"
            />
            <div className="p-4">
              <h2 className="font-semibold text-lg">{shoe.name}</h2>
              <p className="text-gray-500">{shoe.model_line || 'Model not specified'}</p>
              <p className="text-gray-500">{shoe.gender ? `Gender: ${shoe.gender}` : ''}</p>
              <p className="font-bold text-xl mt-2">${shoe.price?.toFixed(2) || '0.00'}</p>
              <a
                href={shoe.external_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Buy on Brand Site
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}