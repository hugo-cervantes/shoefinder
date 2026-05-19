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
  fitScore: number | null;  // 1-10, null until AI ranks
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

// -- Score helpers (AI-driven) ---------------------------------------------
function scoreColor(score: number): string {
  if (score >= 9) return '#22c55e'
  if (score >= 7) return '#3b82f6'
  if (score >= 5) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number): string {
  if (score >= 9) return 'Excellent fit'
  if (score >= 7) return 'Great fit'
  if (score >= 5) return 'Good fit'
  return 'Partial fit'
}

function ScoreRing({ score }: { score: number | null }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const filled = score != null ? (score / 10) * circ : 0
  const color = score != null ? scoreColor(score) : '#e5e7eb'

  return (
    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round" />
      </svg>
      {score != null
        ? <span className="text-xs font-bold" style={{ color }}>{score}<span className="text-gray-300 font-normal">/10</span></span>
        : <span className="text-xs text-gray-300">-</span>
      }
    </div>
  )
}

export default function Recommendations() {
  const [loading, setLoading]         = useState(true)
  const [shoes, setShoes]             = useState<ScoredShoe[]>([])
  const [profile, setProfile]         = useState<UserProfile | null>(null)
  const [notLoggedIn, setNotLoggedIn] = useState(false)

  // AI reasoning - auto-loaded for all shoes
  const [reasonings, setReasonings]   = useState<Record<number, string>>({})
  const [loadingAI, setLoadingAI]     = useState<Record<number, boolean>>({})
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [showHint, setShowHint]         = useState(false)  // false until we check DB
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [hintChecked, setHintChecked]     = useState(false)  // has DB check completed

  // -- Load + score + sort shoes -----------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setNotLoggedIn(true); setLoading(false); return }

      const { data: profileData, error: profileError } = await supabase
        .from("user_profile")
        .select("shoe_width, shoe_widths, category_id, category_ids, gender, brand_sizes, hide_recommendation_hint")
        .eq("id", user.id)
        .single()

      if (profileError || !profileData) {
        console.error(profileError)
        setLoading(false)
        return
      }

      setProfile(profileData)
      // Only show hint if user hasn't dismissed it permanently
      if (!profileData.hide_recommendation_hint) setShowHint(true)
      setHintChecked(true)

      // Fetch shoes matching any of their widths + categories
      const widths     = profileData.shoe_widths?.length    ? profileData.shoe_widths    : [profileData.shoe_width]
      const categories = profileData.category_ids?.length   ? profileData.category_ids   : [profileData.category_id]

      const { data: shoeData, error: shoeError } = await supabase
        .from("shoe").select("*")
        .in("width", widths)
        .in("category_id", categories)

      if (shoeError) { console.error(shoeError); setLoading(false); return }

      // Check cache first
      const shoeIds = (shoeData || []).map((s: any) => s.id)
      const { data: cachedScores } = await supabase
        .from("shoe_scores")
        .select("shoe_id, score")
        .eq("user_id", user.id)
        .in("shoe_id", shoeIds)

      const scoreMap: Record<number, number> = {}
      ;(cachedScores || []).forEach((s: any) => { scoreMap[s.shoe_id] = s.score })

      const hasCachedRankings = Object.keys(scoreMap).length >= Math.min(10, shoeData?.length ?? 0)

      if (hasCachedRankings) {
        // Use cached - only show shoes that have a cached score (the top 10)
        const scored: ScoredShoe[] = (shoeData || [])
          .filter((shoe: any) => scoreMap[shoe.id] != null)
          .map((shoe: any) => ({ ...shoe, fitScore: scoreMap[shoe.id] }))
          .sort((a: ScoredShoe, b: ScoredShoe) => (b.fitScore ?? -1) - (a.fitScore ?? -1))
        setShoes(scored)
        setLoading(false)
        return
      }

      // No cache - send all shoes to AI for ranking
      setShoes([])  // clear while AI thinks
      setLoading(true)

      const rankRes = await fetch('/api/shoe-reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shoes: shoeData,
          userProfile: profileData,
          mode: 'rank',
        }),
      })

      const rankData = await rankRes.json()
      const rankings: { id: number; score: number }[] = rankData.rankings ?? []

      if (rankings.length === 0) { setLoading(false); return }

      // Build scored shoe list from AI rankings
      const shoeMap: Record<number, any> = {}
      ;(shoeData || []).forEach((s: any) => { shoeMap[s.id] = s })

      const scored: ScoredShoe[] = rankings
        .filter(r => shoeMap[r.id])
        .map(r => ({ ...shoeMap[r.id], fitScore: r.score }))

      setShoes(scored)
      setLoading(false)

      // Cache all scores
      const upserts = scored.map(s => ({
        shoe_id: s.id,
        user_id: user.id,
        score: s.fitScore!,
      }))
      if (upserts.length > 0) {
        await supabase.from("shoe_scores").upsert(upserts, { onConflict: "shoe_id,user_id" })
      }
    }

    load()
  }, [])

  // -- Dismiss hint (optionally permanently) ----------------------------
  const dismissHint = async (permanent: boolean) => {
    setShowHint(false)
    if (permanent) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('user_profile')
          .update({ hide_recommendation_hint: true })
          .eq('id', user.id)
      }
    }
  }

  // Scores are loaded in the main useEffect via AI ranking or cache

  // -- Fetch reasoning only when user clicks ----------------------------
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
        body: JSON.stringify({ shoe, userProfile: profile, score: shoe.fitScore, mode: 'explain' }),
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

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Recommended For You</h1>
          {profile && !loading && shoes.length > 0 && (
            <p className="text-gray-500">
              {shoes.length} shoe{shoes.length !== 1 ? 's' : ''} matched and scored - sorted by best fit.
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

        {/* -- Zelda-style hint modal -- */}
        {showHint && !loading && shoes.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
               onClick={() => dismissHint(dontShowAgain)}>
            {/* Blurred backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            {/* Hint card */}
            <div className="relative z-10 max-w-sm w-full mx-4"
                 onClick={e => e.stopPropagation()}>
              {/* Zelda-style border frame */}
              <div className="relative bg-slate-900/95 border-2 border-amber-400/80
                              rounded-2xl p-6 shadow-2xl shadow-amber-900/30">
                {/* Corner decorations */}
                <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400/60 rounded-tl-lg" />
                <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400/60 rounded-tr-lg" />
                <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400/60 rounded-bl-lg" />
                <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400/60 rounded-br-lg" />

                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                    </svg>
                  </div>
                  <p className="text-amber-400 font-bold text-sm tracking-wider uppercase">
                    SoleMate AI - How It Works
                  </p>
                </div>

                {/* Body text */}
                <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
                  <p>
                    Your top <span className="text-amber-400 font-semibold">10 shoes</span> are
                    automatically scored by AI using real knowledge about each model.
                    Scores appear as they load - shoes re-rank as results come in.
                  </p>
                  <p>
                    Shoes beyond the top 10 show{" "}
                    <span className="inline-flex items-center gap-1 bg-slate-700 text-amber-300
                                     px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
                      </svg>
                      Click to score
                    </span>{" "}
                    - tap <span className="text-purple-400 font-semibold">Why this score?</span> on
                    any card to get their score and AI reasoning.
                  </p>
                </div>

                {/* Divider */}
                <div className="my-4 border-t border-amber-400/20" />

                {/* Mock shoe card reference */}
                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 mb-4">
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">What to look for</p>
                  <div className="flex items-center gap-3">
                    {/* Mini score ring mockup */}
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="-rotate-90 absolute inset-0" width="40" height="40" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="14" fill="none" stroke="#334155" strokeWidth="3"/>
                        <circle cx="20" cy="20" r="14" fill="none" stroke="#f59e0b" strokeWidth="3"
                          strokeDasharray="52 88" strokeLinecap="round"/>
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-400">7<span className="text-slate-500 font-normal text-xs">/10</span></span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-amber-400 font-medium">Great fit</p>
                      <p className="text-xs text-slate-400">Score ring fills as AI grades each shoe</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5 border border-slate-600
                                    rounded-lg px-2 py-1.5 bg-slate-700/50">
                      <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                      </svg>
                      <span className="text-xs text-slate-300">Why this score?</span>
                    </div>
                    <span className="text-xs text-slate-500"><- tap this</span>
                  </div>
                </div>

                {/* Don't show again checkbox */}
                <label className="flex items-center gap-2 cursor-pointer mb-3 group">
                  <div
                    onClick={() => setDontShowAgain(p => !p)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition shrink-0
                      ${dontShowAgain
                        ? 'bg-amber-400 border-amber-400'
                        : 'border-slate-500 group-hover:border-amber-400/60'
                      }`}
                  >
                    {dontShowAgain && (
                      <svg className="w-2.5 h-2.5 text-slate-900" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition">
                    Don't show this again
                  </span>
                </label>

                {/* Dismiss */}
                <button
                  onClick={() => dismissHint(dontShowAgain)}
                  className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-900
                             font-bold text-sm rounded-xl transition tracking-wide"
                >
                  Got it - show my recommendations
                </button>

                {/* Press any key hint */}
                <p className="text-center text-xs text-slate-600 mt-2">
                  or click anywhere to dismiss
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && shoes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {shoes.map((shoe, index) => (
              <div key={shoe.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition overflow-hidden flex flex-col">

                {/* Rank badge + image */}
                <div className="relative">
                  {/* Rank badge */}
                  {shoe.fitScore != null && index < 3 && (
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
                      <p className="text-xs font-medium" style={{ color: shoe.fitScore != null ? scoreColor(shoe.fitScore) : '#9ca3af' }}>
                        {shoe.fitScore != null ? scoreLabel(shoe.fitScore) : 'Click to score'}
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
