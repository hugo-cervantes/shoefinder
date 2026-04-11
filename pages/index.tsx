import Navbar from '../components/Navbar';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <Navbar />

      <section className="h-[80vh] flex flex-col justify-center items-center text-center bg-gray-100">
        <h1 className="text-5xl font-bold mb-4">
          Find Your Perfect Shoe
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Compare brands. Find your fit. Discover your style.
        </p>

        <Link href="/catalog">
          <button className="bg-black text-white px-6 py-3 rounded-full hover:bg-gray-800 transition">
            Shop Now
          </button>
        </Link>
      </section>
    </div>
  );
}