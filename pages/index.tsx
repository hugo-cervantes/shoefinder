'use client';

import { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const SLIDES = [
  {
    image: "/images/home.jpg",
    bgFit: 'cover' as const,
    bgPosition: 'center' as const,
    heading: "Find Your Perfect Shoe",
    sub: "Compare brands. Find your fit. Discover your style.",
    primaryLabel: "Shop Now",
    primaryHref: "/catalog",
    secondaryLabel: null,
    secondaryHref: "/questionnaire",
  },
  {
    image: "/images/running.jpg",
    bgFit: 'cover' as const,
    bgPosition: 'center bottom' as const,
    heading: "Let AI Find Your\nPerfect Match",
    sub: "Answer a few quick questions and our AI will match you to the shoes built for your feet.",
    primaryLabel: "Take the Quiz",
    primaryHref: "/questionnaire",
    secondaryLabel: "Browse Catalog",
    secondaryHref: "/catalog",
  },
] as const;

const AUTOPLAY_MS = 5000;

interface TrendingShoe {
  id: number;
  name: string;
  model_line: string;
  price: number;
  image_url: string;
  wishlist_count: number;
}

export default function Home() {
  const [user, setUser]                     = useState<any>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [loading, setLoading]               = useState(true);
  const [trending, setTrending]             = useState<TrendingShoe[]>([]);

  const [current, setCurrent]   = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Auth + profile
  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data: profile, error } = await supabase
        .from('user_profile')
        .select('gender, shoe_size, shoe_width, category_id')
        .eq('id', userId)
        .maybeSingle();

      if (error || !profile) { setShowQuestionnaire(true); return; }

      setShowQuestionnaire(
        profile.gender == null ||
        profile.shoe_size == null ||
        profile.shoe_width == null ||
        profile.category_id == null
      );
    };

    const init = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUser(currentUser);
      if (currentUser) await fetchProfile(currentUser.id);
      else setShowQuestionnaire(false);
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) await fetchProfile(currentUser.id);
        else setShowQuestionnaire(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch trending shoes - most wishlisted this week
  useEffect(() => {
    const fetchTrending = async () => {
      // Get wishlist entries from the past 7 days, count per shoe
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: wishlistData } = await supabase
        .from('wishlist')
        .select('shoe_id')
        .gte('created_at', oneWeekAgo);

      if (!wishlistData || wishlistData.length === 0) {
        // Fallback: just show newest shoes if no wishlist data
        const { data: newest } = await supabase
          .from('shoe')
          .select('id, name, model_line, price, image_url')
          .order('id', { ascending: false })
          .limit(6);
        setTrending((newest || []).map(s => ({ ...s, wishlist_count: 0 })));
        return;
      }

      // Count saves per shoe
      const counts: Record<number, number> = {};
      wishlistData.forEach(({ shoe_id }) => {
        counts[shoe_id] = (counts[shoe_id] ?? 0) + 1;
      });

      // Get top 6 shoe IDs by count
      const topIds = Object.entries(counts)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 6)
        .map(([id]) => Number(id));

      const { data: shoes } = await supabase
        .from('shoe')
        .select('id, name, model_line, price, image_url')
        .in('id', topIds);

      if (shoes) {
        const sorted = topIds
          .map(id => {
            const shoe = shoes.find(s => s.id === id);
            return shoe ? { ...shoe, wishlist_count: counts[id] } : null;
          })
          .filter(Boolean) as TrendingShoe[];
        setTrending(sorted);
      }
    };

    fetchTrending();
  }, []);

  // Autoplay
  const startAutoplay = () => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => goTo('left'), AUTOPLAY_MS);
  };

  useEffect(() => {
    if (!loading) startAutoplay();
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [loading]);

  const goTo = (dir: 'left' | 'right') => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(prev =>
        dir === 'left'
          ? (prev + 1) % SLIDES.length
          : (prev - 1 + SLIDES.length) % SLIDES.length
      );
      setAnimating(false);
    }, 400);
  };

  const handlePrev = () => { startAutoplay(); goTo('right'); };
  const handleNext = () => { startAutoplay(); goTo('left'); };
  const handleDot  = (i: number) => {
    if (i === current || animating) return;
    startAutoplay();
    goTo(i > current ? 'left' : 'right');
  };

  if (loading) {
    return (
      <div><Navbar />
        <div className="h-screen flex items-center justify-center text-gray-400">Loading...</div>
      </div>
    );
  }

  const slide = SLIDES[current];

  return (
    <div>
      <Navbar />

      {/* Hero slider */}
      <div className="relative h-[80vh] overflow-hidden select-none">
        <div key={current}
          className={`absolute inset-0 bg-black transition-opacity duration-500
            ${animating ? 'opacity-0' : 'opacity-100'}`}>
          {slide.image && (
            <img src={slide.image} alt="" className="w-full h-full"
              style={{ objectFit: slide.bgFit, objectPosition: slide.bgPosition }} />
          )}
        </div>

        <div className="absolute inset-0 bg-black/50" />

        <div className={`absolute inset-0 flex flex-col justify-center items-center text-center
          transition-all duration-400 px-6
          ${animating
            ? direction === 'left' ? '-translate-x-16 opacity-0' : 'translate-x-16 opacity-0'
            : 'translate-x-0 opacity-100'}`}>
          <h1 className="text-5xl font-bold mb-4 text-white leading-tight whitespace-pre-line">
            {slide.heading}
          </h1>
          <p className="text-lg text-gray-200 mb-8 max-w-xl">{slide.sub}</p>

          <div className="flex gap-4 justify-center flex-wrap">
            {current === 0 ? (
              <>
                <Link href={slide.primaryHref}>
                  <button className="bg-white text-black px-6 py-3 rounded-full hover:bg-gray-200 transition font-medium">
                    {slide.primaryLabel}
                  </button>
                </Link>
                {user && showQuestionnaire && (
                  <Link href="/questionnaire">
                    <button className="bg-black text-white border border-white px-6 py-3 rounded-full hover:bg-gray-800 transition font-medium">
                      Take Questionnaire
                    </button>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href={slide.primaryHref}>
                  <button className="bg-white text-black px-6 py-3 rounded-full hover:bg-gray-200 transition font-medium">
                    {slide.primaryLabel}
                  </button>
                </Link>
                {slide.secondaryLabel && (
                  <Link href={slide.secondaryHref}>
                    <button className="bg-transparent text-white border border-white px-6 py-3 rounded-full hover:bg-white/10 transition font-medium">
                      {slide.secondaryLabel}
                    </button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        <button onClick={handlePrev}
          className="absolute left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center
                     justify-center bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button onClick={handleNext}
          className="absolute right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center
                     justify-center bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => handleDot(i)}
              className={`rounded-full transition-all duration-300
                ${i === current ? 'bg-white w-6 h-2.5' : 'bg-white/40 hover:bg-white/70 w-2.5 h-2.5'}`}
              aria-label={`Go to slide ${i + 1}`} />
          ))}
        </div>
      </div>

      {/* Trending this week */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Trending This Week</h2>
            <p className="text-sm text-gray-400 mt-0.5">Most saved by shoppers in the last 7 days</p>
          </div>
          <Link href="/catalog"
            className="text-sm font-medium text-gray-500 hover:text-black transition flex items-center gap-1">
            View all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {trending.length === 0 ? (
          // Skeleton placeholders while loading
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl animate-pulse">
                <div className="aspect-square rounded-t-2xl bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {trending.map((shoe, index) => (
              <Link key={shoe.id} href={`/shoes/${shoe.id}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm
                           hover:shadow-lg transition overflow-hidden">
                {/* Hot badge for top 3 */}
                <div className="relative">
                  {index < 3 && (
                    <div className={`absolute top-2 left-2 z-10 text-xs font-bold px-2 py-0.5 rounded-full text-white
                      ${index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-400' : 'bg-yellow-500'}`}>
                      {index === 0 ? 'Hot' : index === 1 ? '#2' : '#3'}
                    </div>
                  )}
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img src={shoe.image_url} alt={shoe.name}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition duration-300" />
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-400 truncate">{shoe.model_line}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{shoe.name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-sm font-bold">${shoe.price}</p>
                    {shoe.wishlist_count > 0 && (
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        {shoe.wishlist_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
