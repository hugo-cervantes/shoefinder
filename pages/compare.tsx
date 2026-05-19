import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

interface Shoe {
  id: number;
  name: string;
  model_line: string;
  price: number;
  image_url: string;
  gender: string;
  category_id: number;
  width: string;
  external_url: string;
}

const CATEGORY_MAP: Record<number, string> = {
  1: "Running", 2: "Casual", 3: "Sports", 4: "Hiking",
}

function isBetter(value: number, allValues: number[]): boolean {
  return value === Math.min(...allValues)
}

export default function ComparePage() {
  const router = useRouter()
  const [shoes, setShoes]       = useState<Shoe[]>([])
  const [loading, setLoading]   = useState(true)
  const [userId, setUserId]     = useState<string | null>(null)

  // Wishlist state per shoe - true=saved, false=not saved, null=loading
  const [wishlist, setWishlist] = useState<Record<number, boolean>>({})
  const [wishlistIds, setWishlistIds] = useState<Record<number, number>>({}) // wishlist row id per shoe
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    if (!router.isReady) return
    const ids = router.query.ids
    if (!ids) { setLoading(false); return }

    const idList = String(ids).split(",").map(Number).filter(Boolean).slice(0, 3)

    supabase.from("shoe").select("*").in("id", idList).then(({ data }) => {
      if (data) {
        const sorted = idList.map(id => data.find(s => s.id === id)).filter(Boolean) as Shoe[]
        setShoes(sorted)
      }
      setLoading(false)
    })
  }, [router.isReady, router.query.ids])

  // Load user + wishlist status
  useEffect(() => {
    if (shoes.length === 0) return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: wl } = await supabase
        .from("wishlist")
        .select("id, shoe_id")
        .eq("user_id", user.id)
        .in("shoe_id", shoes.map(s => s.id))

      if (wl) {
        const saved: Record<number, boolean> = {}
        const ids: Record<number, number> = {}
        wl.forEach(row => { saved[row.shoe_id] = true; ids[row.shoe_id] = row.id })
        setWishlist(saved)
        setWishlistIds(ids)
      }
    }
    load()
  }, [shoes])

  const toggleWishlist = async (shoeId: number) => {
    if (!userId) { router.push("/login"); return }
    if (savingId) return
    setSavingId(shoeId)

    if (wishlist[shoeId]) {
      const { error } = await supabase.from("wishlist").delete().eq("id", wishlistIds[shoeId])
      if (!error) {
        setWishlist(prev => ({ ...prev, [shoeId]: false }))
        window.dispatchEvent(new Event("wishlist-updated"))
      }
    } else {
      const { data, error } = await supabase
        .from("wishlist")
        .insert({ user_id: userId, shoe_id: shoeId })
        .select("id").single()
      if (!error && data) {
        setWishlist(prev => ({ ...prev, [shoeId]: true }))
        setWishlistIds(prev => ({ ...prev, [shoeId]: data.id }))
        window.dispatchEvent(new Event("wishlist-updated"))
      }
    }
    setSavingId(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-white"><Navbar />
      <p className="text-center mt-20 text-gray-400">Loading...</p>
    </div>
  )

  if (shoes.length < 2) return (
    <div className="min-h-screen bg-white"><Navbar />
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <p className="text-gray-500">Select 2 or 3 shoes from the catalog to compare.</p>
        <Link href="/catalog"
          className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition">
          Browse Catalog
        </Link>
      </div>
    </div>
  )

  const prices = shoes.map(s => s.price)
  const ids    = shoes.map(s => s.id).join(",")

  const stats = [
    { label: "Price",      values: shoes.map(s => `$${s.price}`), raw: prices, highlight: true },
    { label: "Model Line", values: shoes.map(s => s.model_line),  raw: null,   highlight: false },
    { label: "Gender",     values: shoes.map(s => s.gender),      raw: null,   highlight: false },
    { label: "Width",      values: shoes.map(s => s.width ? s.width.charAt(0).toUpperCase() + s.width.slice(1) : "Standard"), raw: null, highlight: false },
    { label: "Activity",   values: shoes.map(s => CATEGORY_MAP[s.category_id] ?? "General"), raw: null, highlight: false },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Compare Shoes</h1>
            <p className="text-gray-400 text-sm mt-1">Comparing {shoes.length} shoes</p>
          </div>
          {/* Change selection - passes current IDs back so catalog pre-selects them */}
          <Link
            href={`/catalog?compareIds=${ids}`}
            className="text-sm text-gray-500 hover:text-black transition flex items-center gap-1 border
                       border-gray-200 rounded-lg px-3 py-2 hover:border-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Change selection
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Photos row */}
          <div className="flex border-b border-gray-100">
            {shoes.map((shoe, i) => (
              <div key={shoe.id}
                className={`flex-1 ${i < shoes.length - 1 ? 'border-r border-gray-100' : ''} p-5`}>

                <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                  <img src={shoe.image_url} alt={shoe.name}
                    className="w-full h-full object-contain p-4" />
                </div>

                <h2 className="font-bold text-gray-900 text-base leading-tight">{shoe.name}</h2>
                <p className="text-sm text-gray-400 mt-0.5 mb-3">{shoe.model_line}</p>

                <div className="flex gap-2">
                  {/* Wishlist button */}
                  <button
                    onClick={() => toggleWishlist(shoe.id)}
                    disabled={savingId === shoe.id}
                    title={wishlist[shoe.id] ? "Remove from wishlist" : "Save to wishlist"}
                    className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition shrink-0
                      ${wishlist[shoe.id]
                        ? 'bg-red-50 border-red-300 hover:bg-red-100'
                        : 'bg-white border-gray-200 hover:border-red-300 hover:bg-red-50'
                      } disabled:opacity-40`}>
                    <svg className={`w-4 h-4 ${wishlist[shoe.id] ? 'text-red-500' : 'text-gray-300'}`}
                      fill={wishlist[shoe.id] ? "currentColor" : "none"}
                      stroke={wishlist[shoe.id] ? "none" : "currentColor"}
                      strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <Link href={`/shoes/${shoe.id}`}
                    className="flex-1 text-center text-xs py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium">
                    View
                  </Link>

                  {shoe.external_url && (
                    <a href={shoe.external_url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-center text-xs py-2 border border-gray-200 text-gray-600 rounded-lg hover:border-black hover:text-black transition font-medium">
                      Buy
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Stats rows */}
          {stats.map((stat, si) => (
            <div key={stat.label}
              className={`flex ${si < stats.length - 1 ? 'border-b border-gray-50' : ''}`}>
              {/* Label */}
              <div className="w-28 shrink-0 px-5 py-4 flex items-center bg-gray-50 border-r border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</p>
              </div>
              {/* Values */}
              {shoes.map((shoe, i) => {
                const val  = stat.values[i]
                const best = stat.highlight && stat.raw
                  ? isBetter(stat.raw[i], stat.raw)
                  : false
                return (
                  <div key={shoe.id}
                    className={`flex-1 px-5 py-4 flex items-center
                      ${i < shoes.length - 1 ? 'border-r border-gray-100' : ''}
                      ${best ? 'bg-green-50' : ''}`}>
                    <span className={`text-sm font-medium ${best ? 'text-green-700' : 'text-gray-700'}`}>
                      {val}
                      {best && (
                        <span className="ml-1.5 text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-normal">
                          Best price
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
