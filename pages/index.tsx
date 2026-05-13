'use client';

import { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

// ── Slide definitions ─────────────────────────────────────────────────────
// For slide 2, try all 3 photos and uncomment whichever looks best.
// bgFit: 'cover'   → fills the whole area, may crop edges (good for wide shots)
// bgFit: 'contain' → shows the full image, dark bars on sides (good for portrait/tall shots)
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
    // ── Swap between your 3 photos here ──
    // Option A: image: "/images/running.jpg",
    // Option B: image: "/images/running1.jpg",
    // Option C: image: "/images/running2.jpg",
    image: "/images/running.jpg",
    bgFit: 'cover' as const,
    bgPosition: 'center bottom' as const,  // keeps shoes in frame
    heading: "Let AI Find Your\nPerfect Match",
    sub: "Answer a few quick questions and our AI will match you to the shoes built for your feet.",
    primaryLabel: "Take the Quiz",
    primaryHref: "/questionnaire",
    secondaryLabel: "Browse Catalog",
    secondaryHref: "/catalog",
  },
] as const;

const AUTOPLAY_MS = 5000   // slide every 5 seconds

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [loading, setLoading] = useState(true);

  // Slider state
  const [current, setCurrent]       = useState(0);
  const [animating, setAnimating]   = useState(false);
  const [direction, setDirection]   = useState<'left' | 'right'>('left');
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // ── Auth + profile ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data: profile, error } = await supabase
        .from('user_profile')
        .select('gender, shoe_size, shoe_width, category_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) { setShowQuestionnaire(true); return; }
      if (!profile) { setShowQuestionnaire(true); return; }

      const incomplete =
        profile.gender == null ||
        profile.shoe_size == null ||
        profile.shoe_width == null ||
        profile.category_id == null;

      setShowQuestionnaire(incomplete);
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

  // ── Autoplay ──────────────────────────────────────────────────────────
  const startAutoplay = () => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      goTo('left');
    }, AUTOPLAY_MS);
  };

  useEffect(() => {
    if (!loading) startAutoplay();
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [loading]);

  // ── Navigation ────────────────────────────────────────────────────────
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

  const handlePrev = () => {
    startAutoplay();   // reset timer on manual navigation
    goTo('right');
  };

  const handleNext = () => {
    startAutoplay();
    goTo('left');
  };

  const handleDot = (index: number) => {
    if (index === current || animating) return;
    startAutoplay();
    goTo(index > current ? 'left' : 'right');
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="h-screen flex items-center justify-center text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  const slide = SLIDES[current];

  return (
    <div>
      <Navbar />

      {/* ── Hero slider ── */}
      <div className="relative h-[80vh] overflow-hidden select-none">

        {/* Background image — uses object-fit so shoes are never cropped */}
        <div
          key={current}
          className={`absolute inset-0 bg-black transition-opacity duration-500
            ${animating ? 'opacity-0' : 'opacity-100'}`}
        >
          {slide.image && (
            <img
              src={slide.image}
              alt=""
              className="w-full h-full"
              style={{
                objectFit: slide.bgFit,
                objectPosition: slide.bgPosition,
              }}
            />
          )}
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content */}
        <div
          className={`absolute inset-0 flex flex-col justify-center items-center text-center
            transition-all duration-400 px-6
            ${animating
              ? direction === 'left'
                ? '-translate-x-16 opacity-0'
                : 'translate-x-16 opacity-0'
              : 'translate-x-0 opacity-100'
            }`}
        >
          <h1 className="text-5xl font-bold mb-4 text-white leading-tight whitespace-pre-line">
            {slide.heading}
          </h1>
          <p className="text-lg text-gray-200 mb-8 max-w-xl">
            {slide.sub}
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            {/* Primary button */}
            {/* Slide 1 questionnaire button only shows if user needs it */}
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

        {/* ── Left arrow ── */}
        <button
          onClick={handlePrev}
          className="absolute left-5 top-1/2 -translate-y-1/2 z-20
                     w-10 h-10 flex items-center justify-center
                     bg-white/20 hover:bg-white/40 rounded-full
                     backdrop-blur-sm transition text-white"
          aria-label="Previous slide"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* ── Right arrow ── */}
        <button
          onClick={handleNext}
          className="absolute right-5 top-1/2 -translate-y-1/2 z-20
                     w-10 h-10 flex items-center justify-center
                     bg-white/20 hover:bg-white/40 rounded-full
                     backdrop-blur-sm transition text-white"
          aria-label="Next slide"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* ── Dot indicators ── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDot(i)}
              className={`rounded-full transition-all duration-300
                ${i === current
                  ? 'bg-white w-6 h-2.5'
                  : 'bg-white/40 hover:bg-white/70 w-2.5 h-2.5'
                }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
