import { useEffect, useState, useRef } from "react";
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
}

const CATEGORY_MAP: Record<number, string> = {
  1: "Running", 2: "Casual", 3: "Sports", 4: "Hiking",
}

const CATEGORIES = Object.entries(CATEGORY_MAP).map(([id, label]) => ({ id: Number(id), label }))

const WIDTHS = [
  { label: "Narrow",     value: "narrow" },
  { label: "Medium",     value: "medium" },
  { label: "Wide",       value: "wide" },
  { label: "Extra Wide", value: "extra wide" },
]

const PRICE_MIN = 0
const PRICE_MAX = 500

export default function CatalogPage() {
  const router = useRouter()
  const filterRef = useRef<HTMLDivElement>(null)

  const [shoes, setShoes]   = useState<Shoe[]>([])
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedWidths, setSelectedWidths]           = useState<string[]>([])
  const [searchQuery, setSearchQuery]                 = useState("")
  const [priceRange, setPriceRange]                   = useState<[number, number]>([PRICE_MIN, PRICE_MAX])

  // ── Read URL params on load ───────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return
    const { search, categories, widths } = router.query
    if (search) setSearchQuery(String(search))
    if (categories) setSelectedCategoryIds(String(categories).split(",").map(Number).filter(Boolean))
    if (widths) setSelectedWidths(String(widths).split(","))
  }, [router.isReady, router.query])

  // ── Fetch shoes ───────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchShoes() {
      setLoading(true)
      let q = supabase.from("shoe").select("*").order("id", { ascending: true })

      if (selectedCategoryIds.length > 0) q = q.in("category_id", selectedCategoryIds)
      if (selectedWidths.length > 0)      q = q.in("width", selectedWidths)
      if (searchQuery.trim())             q = q.or(`name.ilike.%${searchQuery.trim()}%,model_line.ilike.%${searchQuery.trim()}%`)

      // Price range filter
      q = q.gte("price", priceRange[0]).lte("price", priceRange[1])

      const { data, error } = await q
      if (error) console.error(error)
      else setShoes(data || [])
      setLoading(false)
    }
    fetchShoes()
  }, [selectedCategoryIds, selectedWidths, searchQuery, priceRange])

  // ── Close filter dropdown on outside click ────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const toggleCategory = (id: number) =>
    setSelectedCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleWidth = (value: string) =>
    setSelectedWidths(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value])

  const clearAll = () => {
    setSelectedCategoryIds([])
    setSelectedWidths([])
    setSearchQuery("")
    setPriceRange([PRICE_MIN, PRICE_MAX])
    setFilterOpen(false)
  }

  const activeFilterCount =
    selectedCategoryIds.length +
    selectedWidths.length +
    (priceRange[0] !== PRICE_MIN || priceRange[1] !== PRICE_MAX ? 1 : 0)

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* HERO */}
      <section className="bg-cover bg-center h-56 md:h-96"
        style={{ backgroundImage: "url('/images/sneakers.jpg')" }}>
        <div className="bg-black/50 h-full w-full flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white">Explore Our Collection</h1>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* ── Top bar: results count + filter button ── */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-400">
            {loading ? "Loading..." : `${shoes.length} shoe${shoes.length !== 1 ? "s" : ""} found`}
          </p>

          <div className="flex items-center gap-3">
            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedCategoryIds.map(id => (
                  <span key={id} className="flex items-center gap-1 text-xs bg-black text-white px-2.5 py-1 rounded-full">
                    {CATEGORY_MAP[id]}
                    <button onClick={() => toggleCategory(id)} className="hover:opacity-70">✕</button>
                  </span>
                ))}
                {selectedWidths.map(w => (
                  <span key={w} className="flex items-center gap-1 text-xs bg-gray-600 text-white px-2.5 py-1 rounded-full capitalize">
                    {w}
                    <button onClick={() => toggleWidth(w)} className="hover:opacity-70">✕</button>
                  </span>
                ))}
                {(priceRange[0] !== PRICE_MIN || priceRange[1] !== PRICE_MAX) && (
                  <span className="flex items-center gap-1 text-xs bg-gray-600 text-white px-2.5 py-1 rounded-full">
                    ${priceRange[0]}–${priceRange[1]}
                    <button onClick={() => setPriceRange([PRICE_MIN, PRICE_MAX])} className="hover:opacity-70">✕</button>
                  </span>
                )}
                <button onClick={clearAll} className="text-xs text-gray-400 hover:text-black underline transition">
                  Clear all
                </button>
              </div>
            )}

            {/* Filter dropdown button */}
            <div ref={filterRef} className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-lg font-medium transition
                  ${activeFilterCount > 0 ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-white text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* ── Filter dropdown panel ── */}
              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200
                                rounded-2xl shadow-2xl p-5 z-50">

                  {/* Activity */}
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {CATEGORIES.map(c => (
                      <button key={c.id} onClick={() => toggleCategory(c.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-medium
                          ${selectedCategoryIds.includes(c.id)
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}>
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Width */}
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Width</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {WIDTHS.map(w => (
                      <button key={w.value} onClick={() => toggleWidth(w.value)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-medium
                          ${selectedWidths.includes(w.value)
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}>
                        {w.label}
                      </button>
                    ))}
                  </div>

                  {/* Price range */}
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Price Range</p>
                  <div className="px-1 mb-2">
                    {/* Min slider */}
                    <div className="relative mb-3">
                      <input
                        type="range"
                        min={PRICE_MIN} max={PRICE_MAX} step={10}
                        value={priceRange[0]}
                        onChange={e => {
                          const val = Number(e.target.value)
                          if (val <= priceRange[1]) setPriceRange([val, priceRange[1]])
                        }}
                        className="w-full h-1.5 rounded-full appearance-none bg-gray-200
                                   [&::-webkit-slider-thumb]:appearance-none
                                   [&::-webkit-slider-thumb]:w-4
                                   [&::-webkit-slider-thumb]:h-4
                                   [&::-webkit-slider-thumb]:rounded-full
                                   [&::-webkit-slider-thumb]:bg-black
                                   [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                    </div>
                    {/* Max slider */}
                    <div className="relative">
                      <input
                        type="range"
                        min={PRICE_MIN} max={PRICE_MAX} step={10}
                        value={priceRange[1]}
                        onChange={e => {
                          const val = Number(e.target.value)
                          if (val >= priceRange[0]) setPriceRange([priceRange[0], val])
                        }}
                        className="w-full h-1.5 rounded-full appearance-none bg-gray-200
                                   [&::-webkit-slider-thumb]:appearance-none
                                   [&::-webkit-slider-thumb]:w-4
                                   [&::-webkit-slider-thumb]:h-4
                                   [&::-webkit-slider-thumb]:rounded-full
                                   [&::-webkit-slider-thumb]:bg-black
                                   [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100 mt-2">
                    {activeFilterCount > 0 && (
                      <button onClick={clearAll}
                        className="flex-1 text-xs py-2 text-gray-500 hover:text-black transition rounded-lg border border-gray-200">
                        Clear all
                      </button>
                    )}
                    <button onClick={() => setFilterOpen(false)}
                      className="flex-1 text-xs py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition">
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        {loading && <p className="text-center text-gray-600 py-20">Loading shoes...</p>}

        {!loading && shoes.length === 0 && (
          <div className="text-center py-20 space-y-2">
            <p className="text-gray-500 text-lg">No shoes match your filters.</p>
            <button onClick={clearAll} className="text-sm text-black underline">Clear filters and show all</button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {shoes.map(shoe => (
            <div key={shoe.id}
              className="group bg-white rounded-2xl overflow-hidden transition hover:shadow-xl border border-gray-100 shadow-sm">
              <Link href={`/shoes/${shoe.id}`}>
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img src={shoe.image_url} alt={shoe.name}
                    className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105" />
                </div>
              </Link>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-lg">{shoe.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{shoe.model_line}</p>
                <p className="text-sm text-gray-500">{shoe.gender}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {shoe.category_id && CATEGORY_MAP[shoe.category_id] && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {CATEGORY_MAP[shoe.category_id]}
                    </span>
                  )}
                  {shoe.width && shoe.width !== "medium" && (
                    <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full capitalize">
                      {shoe.width}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="font-bold text-lg">${shoe.price}</span>
                  <Link href={`/shoes/${shoe.id}`}>
                    <button className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800">View</button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
