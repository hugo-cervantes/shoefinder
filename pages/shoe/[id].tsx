import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type Shoe = {
  id: number;
  created_at: string;
  name: string;
  price: number;
  image_url: string;
  external_url: string;
  gender: string;
  model_line: string;
  brand_id: number;
  category_id: number;
};

export default function ShoePage() {
  const router = useRouter();
  const { id } = router.query;
  const [shoe, setShoe] = useState<Shoe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchShoe() {
      const { data, error } = await supabase.from('shoe').select('*').eq('id', id).single();
      if (error) {
        console.error('Error fetching shoe:', error);
        setError(error.message);
      } else {
        setShoe(data);
      }
    }

    fetchShoe();
  }, [id]);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!shoe) return <p>Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <img src={shoe.image_url} alt={shoe.name} className="w-full h-96 object-cover mb-6 rounded" />
      <h1 className="text-3xl font-bold">{shoe.name}</h1>
      <p className="text-gray-600 mb-2">{shoe.model_line}</p>
      <p className="text-gray-500 mb-2">Gender: {shoe.gender}</p>
      <p className="text-2xl font-bold mb-4">${shoe.price.toFixed(2)}</p>
      <a
        href={shoe.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
      >
        Buy on Brand Site
      </a>
    </div>
  );
}