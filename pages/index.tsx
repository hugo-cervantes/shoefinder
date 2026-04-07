import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Shoe {
  id: number;
  brand_id: number;
  category_id: number;
  model: string;
  size: string;
  price: number;
}

export default function Home() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShoes() {
      const { data, error } = await supabase.from('Shoe').select('*'); // <- Correct table name
      if (error) {
        console.error('Error fetching shoes:', error);
        setError(error.message);
      } else {
        setShoes(data);
      }
      setLoading(false);
    }

    fetchShoes();
  }, []);

  if (loading) return <p>Loading shoes...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Shoes</h1>
      <ul>
        {shoes.map((shoe) => (
          <li key={shoe.id}>
            <strong>{shoe.model}</strong> — {shoe.size} — ${shoe.price}
          </li>
        ))}
      </ul>
    </div>
  );
}