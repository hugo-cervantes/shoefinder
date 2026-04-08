import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[80vh] bg-cover bg-center" style={{backgroundImage: "url('/images/hero-shoes.jpg')"}}>
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center px-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Find Your Perfect Shoe</h1>
          <p className="text-white text-lg md:text-xl mb-6">Browse top brands and styles</p>
          <Link
            href="/catalog"
            className="bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-200 transition"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Features / Intro */}
      <section className="py-16 bg-white text-center px-4">
        <h2 className="text-3xl font-bold mb-6">Why Shoefinder?</h2>
        <div className="flex flex-col md:flex-row justify-center gap-8">
          <div className="max-w-xs">
            <img src="/icons/brand.svg" alt="Brands" className="mx-auto mb-4 h-20"/>
            <h3 className="font-semibold mb-2">Top Brands</h3>
            <p>Explore Nike, Adidas, and more with accurate sizing guides.</p>
          </div>
          <div className="max-w-xs">
            <img src="/icons/catalog.svg" alt="Catalog" className="mx-auto mb-4 h-20"/>
            <h3 className="font-semibold mb-2">Curated Catalog</h3>
            <p>Filter by size, category, or type to find your perfect fit.</p>
          </div>
          <div className="max-w-xs">
            <img src="/icons/review.svg" alt="Reviews" className="mx-auto mb-4 h-20"/>
            <h3 className="font-semibold mb-2">Real Reviews</h3>
            <p>Read reviews from other users and see sizing recommendations.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gray-900 text-white text-center px-4">
        <h2 className="text-3xl font-bold mb-4">Ready to Step Up?</h2>
        <Link
          href="/catalog"
          className="bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-200 transition"
        >
          Browse Shoes
        </Link>
      </section>
    </main>
  );
}