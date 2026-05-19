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

const GENDERS = [
  { label: "Men",    value: "Men" },
  { label: "Women",  value: "Women" },
  { label: "Unisex", value: "Unisex" },
]

const PRICE_MIN = 0
const PRICE_MAX = 500

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'default',    label: 'Default' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc',   label: 'Name: A to Z' },
  { value: 'name-desc',  label: 'Name: Z to A' },
]

function sortShoes(shoes: Shoe[], sort: SortOption): Shoe[] {
  const s = [...shoes]
  switch (sort) {
    case 'price-asc':  return s.sort((a, b) => a.price - b.price)
    case 'price-desc': return s.sort((a, b) => b.price - a.price)
    case 'name-asc':   return s.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':  return s.sort((a, b) => b.name.localeCompare(a.name))
    default:           return s
  }
}

export default function CatalogPage() {
  const router = useRouter()
  const filterRef = useRef<HTMLDivElement>(null)
  const sortRef   = useRef<HTMLDivElement>(null)

  const [shoes, setShoes]     = useState<Shoe[]>([])
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen]     = useState(false)
  const [sort, setSort]             = useState<SortOption>('default')
  const [compareIds, setCompareIds]   = useState<number[]>([])

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedWidths, setSelectedWidths]           = useState<string[]>([])
  const [searchQuery, setSearchQuery]                 = useState("")
  const [priceRange, setPriceRange]                   = useState<[number, number]>([PRICE_MIN, PRICE_MAX])
  const [selectedGenders, setSelectedGenders]           = useState<string[]>([])

  // Read URL params
  useEffect(() => {
    if (!router.isReady) return
    const { search, categories, widths } = router.query
    if (search)     setSearchQuery(String(search))
    if (categories) setSelectedCategoryIds(String(categories).split(",").map(Number).filter(Boolean))
    if (widths)     setSelectedWidths(String(widths).split(","))
    // Pre-select shoes coming back from compare page
    if (router.query.compareIds) {
      const ids = String(router.query.compareIds).split(",").map(Number).filter(Boolean)
      setCompareIds(ids)
    }
  }, [router.isReady, router.query])

  // Fetch shoes
  useEffect(() => {
    async function fetchShoes() {
      setLoading(true)
      let q = supabase.from("shoe").select("*").order("id", { ascending: true })
      if (selectedCategoryIds.length > 0) q = q.in("category_id", selectedCategoryIds)
      if (selectedWidths.length > 0)      q = q.in("width", selectedWidths)
      if (searchQuery.trim())             q = q.or(`name.ilike.%${searchQuery.trim()}%,model_line.ilike.%${searchQuery.trim()}%`)
      if (selectedGenders.length > 0)     q = q.in("gender", selectedGenders)
      q = q.gte("price", priceRange[0]).lte("price", priceRange[1])
      const { data, error } = await q
      if (error) console.error(error)
      else setShoes(data || [])
      setLoading(false)
    }
    fetchShoes()
  }, [selectedCategoryIds, selectedWidths, searchQuery, priceRange, selectedGenders])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
      if (sortRef.current   && !sortRef.current.contains(e.target as Node))   setSortOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const toggleGender = (value: string) =>
    setSelectedGenders(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value])

  const toggleCategory = (id: number) =>
    setSelectedCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleWidth = (value: string) =>
    setSelectedWidths(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value])

  const clearAll = () => {
    setSelectedCategoryIds([]); setSelectedWidths([])
    setSearchQuery(""); setPriceRange([PRICE_MIN, PRICE_MAX])
    setSelectedGenders([]); setFilterOpen(false)
  }

  const toggleCompare = (id: number) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return [...prev.slice(1), id]  // replace oldest
      return [...prev, id]
    })
  }

  const activeFilterCount =
    selectedCategoryIds.length + selectedWidths.length + selectedGenders.length +
    (priceRange[0] !== PRICE_MIN || priceRange[1] !== PRICE_MAX ? 1 : 0)

  const sortedShoes = sortShoes(shoes, sort)
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Default'

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-cover bg-center h-56 md:h-96"
        style={{ backgroundImage: "url('/images/sneakers.jpg')" }}>
        <div className="bg-black/50 h-full w-full flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white">Explore Our Collection</h1>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <p className="text-sm text-gray-400">
            {loading ? "Loading..." : `${sortedShoes.length} shoe${sortedShoes.length !== 1 ? "s" : ""} found`}
          </p>

          <div className="flex items-center gap-2 flex-wrap">

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedCategoryIds.map(id => (
                  <span key={id} className="flex items-center gap-1 text-xs bg-black text-white px-2.5 py-1 rounded-full">
                    {CATEGORY_MAP[id]}
                    <button onClick={() => toggleCategory(id)} className="hover:opacity-70">x</button>
                  </span>
                ))}
                {selectedWidths.map(w => (
                  <span key={w} className="flex items-center gap-1 text-xs bg-gray-600 text-white px-2.5 py-1 rounded-full capitalize">
                    {w}
                    <button onClick={() => toggleWidth(w)} className="hover:opacity-70">x</button>
                  </span>
                ))}
                {selectedGenders.map(g => (
                  <span key={g} className="flex items-center gap-1 text-xs bg-gray-600 text-white px-2.5 py-1 rounded-full">
                    {g}
                    <button onClick={() => toggleGender(g)} className="hover:opacity-70">x</button>
                  </span>
                ))}
                {(priceRange[0] !== PRICE_MIN || priceRange[1] !== PRICE_MAX) && (
                  <span className="flex items-center gap-1 text-xs bg-gray-600 text-white px-2.5 py-1 rounded-full">
                    ${priceRange[0]}-${priceRange[1]}
                    <button onClick={() => setPriceRange([PRICE_MIN, PRICE_MAX])} className="hover:opacity-70">x</button>
                  </span>
                )}
                <button onClick={clearAll} className="text-xs text-gray-400 hover:text-black underline transition">
                  Clear all
                </button>
              </div>
            )}

            {/* Sort dropdown */}
            <div ref={sortRef} className="relative">
              <button onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false) }}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200
                           rounded-lg font-medium hover:border-gray-400 transition bg-white text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M3 4h13M3 8h9M3 12h5" strokeLinecap="round"/>
                </svg>
                {currentSortLabel}
                <svg className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200
                                rounded-xl shadow-xl py-1 z-50">
                  {SORT_OPTIONS.map(option => (
                    <button key={option.value}
                      onClick={() => { setSort(option.value); setSortOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition
                        ${sort === option.value
                          ? 'bg-black text-white font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                        }`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter dropdown */}
            <div ref={filterRef} className="relative">
              <button onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false) }}
                className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-lg font-medium transition
                  ${activeFilterCount > 0 ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
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

              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200
                                rounded-2xl shadow-2xl p-5 z-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {CATEGORIES.map(c => (
                      <button key={c.id} onClick={() => toggleCategory(c.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-medium
                          ${selectedCategoryIds.includes(c.id) ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Width</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {WIDTHS.map(w => (
                      <button key={w.value} onClick={() => toggleWidth(w.value)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-medium
                          ${selectedWidths.includes(w.value) ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                        {w.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gender</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {GENDERS.map(g => (
                      <button key={g.value} onClick={() => toggleGender(g.value)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${selectedGenders.includes(g.value) ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                        {g.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Price Range</p>
                  <div className="px-1 mb-2 space-y-3">
                    <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={10}
                      value={priceRange[0]}
                      onChange={e => { const v = Number(e.target.value); if (v <= priceRange[1]) setPriceRange([v, priceRange[1]]) }}
                      className="w-full h-1.5 rounded-full appearance-none bg-gray-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:cursor-pointer" />
                    <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={10}
                      value={priceRange[1]}
                      onChange={e => { const v = Number(e.target.value); if (v >= priceRange[0]) setPriceRange([priceRange[0], v]) }}
                      className="w-full h-1.5 rounded-full appearance-none bg-gray-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:cursor-pointer" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>${priceRange[0]}</span><span>${priceRange[1]}</span>
                    </div>
                  </div>

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

        {/* Grid */}
        {loading && <p className="text-center text-gray-600 py-20">Loading shoes...</p>}

        {!loading && sortedShoes.length === 0 && (
          <div className="text-center py-20 space-y-2">
            <p className="text-gray-500 text-lg">No shoes match your filters.</p>
            <button onClick={clearAll} className="text-sm text-black underline">Clear filters and show all</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {sortedShoes.map(shoe => (
            <div key={shoe.id}
              className={`group bg-white rounded-2xl overflow-hidden transition hover:shadow-xl border shadow-sm
                ${compareIds.includes(shoe.id) ? 'border-black ring-2 ring-black' : 'border-gray-100'}`}>
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
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleCompare(shoe.id)}
                      title={compareIds.includes(shoe.id) ? "Remove from compare" : "Add to compare"}
                      className={`text-xs px-2.5 py-1 rounded border transition font-medium
                        ${compareIds.includes(shoe.id)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                        }`}>
                      {compareIds.includes(shoe.id) ? 'Added' : '+ Compare'}
                    </button>
                    <Link href={`/shoes/${shoe.id}`}>
                      <button className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800">View</button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Compare knob - collapsed tab on right side, expands on hover */}
      {compareIds.length > 0 && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 group flex items-center">
          {/* Expanded panel - slides in from right on hover */}
          <div className="overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-300 ease-in-out">
            <div className="bg-white border border-r-0 border-gray-200 rounded-l-2xl shadow-xl px-4 py-4 flex flex-col gap-3 w-64">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comparing {compareIds.length}/3</p>
                <button onClick={() => setCompareIds([])} className="text-xs text-gray-400 hover:text-black transition">Clear</button>
              </div>
              <div className="flex flex-col gap-2">
                {compareIds.map(id => {
                  const shoe = sortedShoes.find(s => s.id === id)
                  if (!shoe) return null
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                        <img src={shoe.image_url} alt={shoe.name} className="w-full h-full object-contain p-1" />
                      </div>
                      <p className="text-xs text-gray-700 truncate flex-1">{shoe.name}</p>
                      <button onClick={() => toggleCompare(id)}
                        className="w-4 h-4 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs hover:bg-red-500 hover:text-white transition shrink-0">
                        x
                      </button>
                    </div>
                  )
                })}
                {Array.from({ length: 3 - compareIds.length }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs shrink-0">+</div>
                    <p className="text-xs text-gray-300">Add a shoe</p>
                  </div>
                ))}
              </div>
              <Link
                href={compareIds.length >= 2 ? `/compare?ids=${compareIds.join(',')}` : '#'}
                className={`text-center py-2 rounded-xl text-sm font-semibold transition
                  ${compareIds.length >= 2 ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                {compareIds.length >= 2 ? 'Compare Now' : `Need ${2 - compareIds.length} more`}
              </Link>
            </div>
          </div>

          {/* The tab/knob */}
          <div className="bg-black text-white rounded-l-xl py-8 px-1.5 shadow-lg cursor-pointer flex flex-col items-center gap-1 select-none">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.05em' }}>
              Compare {compareIds.length}
            </span>
          </div>
        </div>
      )}


    </div>
  )
}
