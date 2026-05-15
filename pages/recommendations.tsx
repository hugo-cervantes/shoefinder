import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

interface Shoe {
  id: number;
  name: string;
  model_line: string;
  image_url: string;
  price: number;
  width: string;
  category_id: number;
  gender: string;
}

interface UserProfile {
  shoe_width: string;
  category_id: number;
  gender: string;
  brand_sizes?: Record<string, number>;
}

const CATEGORY_MAP: Record<number, string> = {
  1: "Running",
  2: "Casual",
  3: "Sports",
  4: "Hiking",
}

export default function Recommendations() {
  const [loading, setLoading]       = useState(true)
  const [shoes, setShoes]           = useState<Shoe[]>([])
  const [profile, setProfile]       = useState<UserProfile | null>(null)
  const [notLoggedIn, setNotLoggedIn] = useState(false)

  // AI reasoning state — keyed by shoe id
  const [reasonings, setReasonings]   = useState<Record<number, string>>({})
  const [loadingAI, setLoadingAI]     = useState<Record<number, boolean>>({})
  const [expandedId, setExpandedId]   = useState<number | null>(null)

  // ── Load recommendations ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setNotLoggedIn(true); setLoading(false); return }

      const { data: profileData, error: profileError } = await supabase
        .from("user_profile")
        .select("shoe_width, category_id, gender, brand_sizes")
        .eq("id", user.id)
        .single()

      if (profileError || !profileData) {
        console.error(profileError)
        setLoading(false)
        return
      }

      setProfile(profileData)

      const { data: shoeData, error: shoeError } = await supabase
        .from("shoe")
        .select("*")
        .eq("width", profileData.shoe_width)
        .eq("category_id", profileData.category_id)

      if (shoeError) { console.error(shoeError); setLoading(false); return }

      setShoes(shoeData || [])
      setLoading(false)
    }

    load()
  }, [])

  // ── Fetch AI reasoning for a shoe ─────────────────────────────────────
  const fetchReasoning = async (shoe: Shoe) => {
    if (reasonings[shoe.id] || loadingAI[shoe.id] || !profile) return

    setLoadingAI(prev => ({ ...prev, [shoe.id]: true }))
    setExpandedId(shoe.id)

    try {
      const response = await fetch('/api/shoe-reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shoe, userProfile: profile }),
      })

      const data = await response.json()
      if (data.reasoning) {
        setReasonings(prev => ({ ...prev, [shoe.id]: data.reasoning }))
      }
    } catch (err) {
      console.error('Reasoning fetch error:', err)
      setReasonings(prev => ({ ...prev, [shoe.id]: 'Unable to load reasoning right now.' }))
    }

    setLoadingAI(prev => ({ ...prev, [shoe.id]: false }))
  }

  const toggleReasoning = (shoe: Shoe) => {
    if (expandedId === shoe.id) {
      setExpandedId(null)
    } else {
      fetchReasoning(shoe)
    }
  }

  // ── Not logged in ─────────────────────────────────────────────────────
  if (notLoggedIn) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-md mx-auto mt-20 bg-white rounded-2xl p-10 shadow text-center">
        <h2 className="text-2xl font-semibold mb-3">Sign in to see recommendations</h2>
        <p className="text-gray-500 mb-6">Complete the questionnaire to get personalized matches.</p>
        <Link href="/login"
          className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition">
          Log In
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Recommended For You</h1>
          {profile && (
            <p className="text-gray-500">
              Matched to your{" "}
              <span className="font-semibold capitalize">{profile.shoe_width}</span> width
              {profile.category_id && CATEGORY_MAP[profile.category_id] && (
                <> and <span className="font-semibold">{CATEGORY_MAP[profile.category_id]}</span> activity</>
              )}.
              {" "}Click <span className="font-semibold">Why this shoe?</span> on any result for an AI explanation.
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 text-gray-400">Loading recommendations...</div>
        )}

        {/* No matches */}
        {!loading && shoes.length === 0 && (
          <div className="bg-white rounded-2xl p-10 shadow text-center">
            <h2 className="text-2xl font-semibold mb-3">No matching shoes found</h2>
            <p className="text-gray-500 mb-6">Try updating your questionnaire preferences.</p>
            <Link href="/questionnaire"
              className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition">
              Update Preferences
            </Link>
          </div>
        )}

        {/* Shoe grid */}
        {!loading && shoes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {shoes.map(shoe => (
              <div key={shoe.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition overflow-hidden flex flex-col">

                {/* Image */}
                <Link href={`/shoes/${shoe.id}`}>
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    <img src={shoe.image_url} alt={shoe.name}
                      className="w-full h-full object-contain p-6 hover:scale-105 transition duration-300" />
                  </div>
                </Link>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-sm text-gray-400">{shoe.model_line}</p>
                  <h2 className="text-lg font-semibold mt-0.5">{shoe.name}</h2>

                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {shoe.category_id && CATEGORY_MAP[shoe.category_id] && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {CATEGORY_MAP[shoe.category_id]}
                      </span>
                    )}
                    {shoe.width && shoe.width !== 'medium' && (
                      <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full capitalize">
                        {shoe.width}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <p className="font-bold text-lg">${shoe.price}</p>
                    <Link href={`/shoes/${shoe.id}`}
                      className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800 transition">
                      View
                    </Link>
                  </div>

                  {/* AI reasoning toggle */}
                  <button
                    onClick={() => toggleReasoning(shoe)}
                    className="mt-3 w-full flex items-center justify-between gap-2 px-3 py-2
                               rounded-lg border border-gray-200 hover:border-gray-400
                               text-sm text-gray-600 hover:text-black transition"
                  >
                    <span className="flex items-center gap-1.5">
                      {/* Sparkle icon */}
                      <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                      </svg>
                      Why this shoe?
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${expandedId === shoe.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* AI reasoning panel */}
                  {expandedId === shoe.id && (
                    <div className="mt-2 rounded-lg bg-purple-50 border border-purple-100 px-3 py-3">
                      {loadingAI[shoe.id] ? (
                        <div className="flex items-center gap-2 text-xs text-purple-400">
                          {/* Animated dots */}
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                          Analyzing your fit...
                        </div>
                      ) : (
                        <p className="text-xs text-purple-900 leading-relaxed">
                          {reasonings[shoe.id]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
