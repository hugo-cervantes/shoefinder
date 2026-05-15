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

interface ScoredShoe extends Shoe {
  fitScore: number;
}

interface UserProfile {
  shoe_width: string;
  shoe_widths?: string[];
  category_id: number;
  category_ids?: number[];
  gender: string;
  brand_sizes?: Record<string, number>;
}

const CATEGORY_MAP: Record<number, string> = {
  1: "Running", 2: "Casual", 3: "Sports", 4: "Hiking",
}

// ── Client-side fit scoring ───────────────────────────────────────────────
// Returns 0–100. Higher = better match.
function scoreShoe(shoe: Shoe, profile: UserProfile): number {
  let score = 0

  // Width match (40 pts) — exact match scores full, partial (adjacent) scores half
  const userWidths = profile.shoe_widths?.length ? profile.shoe_widths : [profile.shoe_width]
  if (userWidths.includes(shoe.width)) {
    score += 40
  } else {
    // Adjacent width gets partial credit
    const widthOrder = ['narrow', 'medium', 'wide', 'extra-wide', 'extra wide']
    const shoeIdx  = widthOrder.indexOf(shoe.width?.toLowerCase())
    const adjacent = userWidths.some(w => Math.abs(widthOrder.indexOf(w) - shoeIdx) === 1)
    if (adjacent) score += 20
  }

  // Category match (35 pts)
  const userCats = profile.category_ids?.length ? profile.category_ids : [profile.category_id]
  if (userCats.includes(shoe.category_id)) {
    score += 35
  }

  // Gender match (15 pts) — unisex counts as match for everyone
  if (
    shoe.gender?.toLowerCase() === profile.gender?.toLowerCase() ||
    shoe.gender?.toLowerCase() === 'unisex' ||
    shoe.gender?.toLowerCase() === 'men' && profile.gender === 'male' ||
    shoe.gender?.toLowerCase() === 'women' && profile.gender === 'female'
  ) {
    score += 15
  }

  // Brand size data bonus (10 pts) — user has brand size info, shows investment in fit
  if (profile.brand_sizes && Object.keys(profile.brand_sizes).length > 0) {
    score += 10
  }

  return Math.min(score, 100)
}

// Score ring color
function scoreColor(score: number): string {
  if (score >= 85) return '#22c55e'  // green
  if (score >= 70) return '#3b82f6'  // blue
  if (score >= 55) return '#f59e0b'  // amber
  return '#ef4444'                    // red
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent fit'
  if (score >= 70) return 'Great fit'
  if (score >= 55) return 'Good fit'
  return 'Partial fit'
}

// SVG circular score ring
function ScoreRing({ score }: { score: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = scoreColor(score)

  return (
    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56" viewBox="0 0 56 56">
        {/* Background ring */}
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        {/* Score ring */}
        <circle cx="28" cy="28" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round" />
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

export default function Recommendations() {
  const [loading, setLoading]         = useState(true)
  const [shoes, setShoes]             = useState<ScoredShoe[]>([])
  const [profile, setProfile]         = useState<UserProfile | null>(null)
  const [notLoggedIn, setNotLoggedIn] = useState(false)

  // AI reasoning — auto-loaded for all shoes
  const [reasonings, setReasonings]   = useState<Record<number, string>>({})
  const [loadingAI, setLoadingAI]     = useState<Record<number, boolean>>({})
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // ── Load + score + sort shoes ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setNotLoggedIn(true); setLoading(false); return }

      const { data: profileData, error: profileError } = await supabase
        .from("user_profile")
        .select("shoe_width, shoe_widths, category_id, category_ids, gender, brand_sizes")
        .eq("id", user.id)
        .single()

      if (profileError || !profileData) {
        console.error(profileError)
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Fetch shoes matching any of their widths + categories
      const widths     = profileData.shoe_widths?.length    ? profileData.shoe_widths    : [profileData.shoe_width]
      const categories = profileData.category_ids?.length   ? profileData.category_ids   : [profileData.category_id]

      const { data: shoeData, error: shoeError } = await supabase
        .from("shoe").select("*")
        .in("width", widths)
        .in("category_id", categories)

      if (shoeError) { console.error(shoeError); setLoading(false); return }

      // Score and sort
      const scored: ScoredShoe[] = (shoeData || [])
        .map(shoe => ({ ...shoe, fitScore: scoreShoe(shoe, profileData) }))
        .sort((a, b) => b.fitScore - a.fitScore)

      setShoes(scored)
      setLoading(false)
    }

    load()
  }, [])

  // ── Fetch reasoning only when user clicks ────────────────────────────
  const toggleExpanded = async (shoe: ScoredShoe) => {
    const id = shoe.id

    // Toggle open/closed
    setExpandedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

    // Only fetch if not already loaded or loading
    if (reasonings[id] || loadingAI[id] || !profile) return

    setLoadingAI(prev => ({ ...prev, [id]: true }))

    try {
      const response = await fetch('/api/shoe-reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shoe, userProfile: profile, score: shoe.fitScore }),
      })
      const data = await response.json()
      setReasonings(prev => ({
        ...prev,
        [id]: data.reasoning || 'Unable to load reasoning right now.'
      }))
    } catch {
      setReasonings(prev => ({ ...prev, [id]: 'Unable to load reasoning right now.' }))
    }

    setLoadingAI(prev => ({ ...prev, [id]: false }))
  }

  if (notLoggedIn) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-md mx-auto mt-20 bg-white rounded-2xl p-10 shadow text-center">
        <h2 className="text-2xl font-semibold mb-3">Sign in to see recommendations</h2>
        <p className="text-gray-500 mb-6">Complete the questionnaire to get personalized matches.</p>
        <Link href="/login" className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition">
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
          {profile && !loading && shoes.length > 0 && (
            <p className="text-gray-500">
              {shoes.length} shoe{shoes.length !== 1 ? 's' : ''} matched and scored — sorted by best fit.
              Click <span className="font-semibold">Why this score?</span> to see the AI reasoning.
            </p>
          )}
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-400">Loading recommendations...</div>
        )}

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

        {!loading && shoes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {shoes.map((shoe, index) => (
              <div key={shoe.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition overflow-hidden flex flex-col">

                {/* Rank badge + image */}
                <div className="relative">
                  {/* Rank badge */}
                  {index < 3 && (
                    <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white
                      ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'}`}>
                      {index + 1}
                    </div>
                  )}
                  <Link href={`/shoes/${shoe.id}`}>
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      <img src={shoe.image_url} alt={shoe.name}
                        className="w-full h-full object-contain p-6 hover:scale-105 transition duration-300" />
                    </div>
                  </Link>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  {/* Score ring + name */}
                  <div className="flex items-start gap-3 mb-2">
                    <ScoreRing score={shoe.fitScore} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: scoreColor(shoe.fitScore) }}>
                        {scoreLabel(shoe.fitScore)}
                      </p>
                      <p className="text-sm text-gray-400 truncate">{shoe.model_line}</p>
                      <h2 className="text-base font-semibold leading-tight">{shoe.name}</h2>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap mb-2">
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

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <p className="font-bold text-lg">${shoe.price}</p>
                    <Link href={`/shoes/${shoe.id}`}
                      className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800 transition">
                      View
                    </Link>
                  </div>

                  {/* AI reasoning toggle */}
                  <button
                    onClick={() => toggleExpanded(shoe)}
                    className="mt-3 w-full flex items-center justify-between gap-2 px-3 py-2
                               rounded-lg border border-gray-200 hover:border-purple-300
                               text-sm text-gray-600 hover:text-purple-700 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                      </svg>
                      Why this score?
                    </span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${expandedIds.has(shoe.id) ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* AI reasoning panel */}
                  {expandedIds.has(shoe.id) && (
                    <div className="mt-2 rounded-lg bg-purple-50 border border-purple-100 px-3 py-3">
                      {loadingAI[shoe.id] && !reasonings[shoe.id] ? (
                        <div className="flex items-center gap-2 text-xs text-purple-400">
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                          Analyzing your fit...
                        </div>
                      ) : (
                        <p className="text-xs text-purple-900 leading-relaxed">{reasonings[shoe.id]}</p>
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
