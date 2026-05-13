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
}

// Must match your Supabase category table exactly
const CATEGORY_MAP: Record<number, string> = {
  1: "Running",
  2: "Casual",
  3: "Sports",
  4: "Hiking",
}

const CATEGORIES = Object.entries(CATEGORY_MAP).map(([id, label]) => ({
  id: Number(id),
  label,
}))

// Exactly as stored in Supabase (lowercase)
const WIDTHS = [
  { label: "Narrow",     value: "narrow" },
  { label: "Medium",     value: "medium" },
  { label: "Wide",       value: "wide" },
  { label: "Extra Wide", value: "extra wide" },
]

export default function CatalogPage() {
  const router = useRouter()

  const [shoes, setShoes] = useState<Shoe[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedWidths, setSelectedWidths] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // ── Read URL params on load ───────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return

    const { search, categories, widths } = router.query

    if (search) setSearchQuery(String(search))

    // categories param is comma-separated numbers e.g. "1,3"
    if (categories) {
      const ids = String(categories).split(",").map(Number).filter(Boolean)
      setSelectedCategoryIds(ids)
    }

    // widths param is comma-separated lowercase strings e.g. "narrow,wide"
    if (widths) {
      setSelectedWidths(String(widths).split(","))
    }
  }, [router.isReady, router.query])

  // ── Fetch from Supabase whenever filters change ───────────────────────
  useEffect(() => {
    async function fetchShoes() {
      setLoading(true)

      let q = supabase
        .from("shoe")
        .select("*")
        .order("id", { ascending: true })

      // Filter by category_id (numeric)
      if (selectedCategoryIds.length > 0) {
        q = q.in("category_id", selectedCategoryIds)
      }

      // Filter by width (exact lowercase match)
      if (selectedWidths.length > 0) {
        q = q.in("width", selectedWidths)
      }

      // Search by name or model_line
      if (searchQuery.trim()) {
        q = q.or(
          `name.ilike.%${searchQuery.trim()}%,model_line.ilike.%${searchQuery.trim()}%`
        )
      }

      const { data, error } = await q
      if (error) console.error(error)
      else setShoes(data || [])
      setLoading(false)
    }

    fetchShoes()
  }, [selectedCategoryIds, selectedWidths, searchQuery])

  const toggleCategory = (id: number) =>
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const toggleWidth = (value: string) =>
    setSelectedWidths(prev =>
      prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]
    )

  const clearAll = () => {
    setSelectedCategoryIds([])
    setSelectedWidths([])
    setSearchQuery("")
  }

  const activeFilterCount = selectedCategoryIds.length + selectedWidths.length

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* HERO */}
      <section
        className="bg-cover bg-center h-56 md:h-96"
        style={{ backgroundImage: "url('/images/sneakers.jpg')" }}
      >
        <div className="bg-black/50 h-full w-full flex items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            Explore Our Collection
          </h1>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* ── FILTER BAR ── */}
        <div className="mb-8 space-y-4">

          {/* Active filter chips */}
          {(activeFilterCount > 0 || searchQuery) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Filtering by:</span>

              {searchQuery && (
                <span className="flex items-center gap-1 text-xs bg-gray-800 text-white px-3 py-1 rounded-full">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery("")} className="ml-1 hover:opacity-70">✕</button>
                </span>
              )}
              {selectedCategoryIds.map(id => (
                <span key={id}
                  className="flex items-center gap-1 text-xs bg-black text-white px-3 py-1 rounded-full">
                  {CATEGORY_MAP[id]}
                  <button onClick={() => toggleCategory(id)} className="ml-1 hover:opacity-70">✕</button>
                </span>
              ))}
              {selectedWidths.map(w => (
                <span key={w}
                  className="flex items-center gap-1 text-xs bg-gray-600 text-white px-3 py-1 rounded-full capitalize">
                  {w}
                  <button onClick={() => toggleWidth(w)} className="ml-1 hover:opacity-70">✕</button>
                </span>
              ))}

              <button onClick={clearAll}
                className="text-xs text-gray-400 hover:text-black underline ml-1 transition">
                Clear all
              </button>
            </div>
          )}

          {/* Category pills */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Activity</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => toggleCategory(c.id)}
                  className={`text-sm px-4 py-1.5 rounded-full border transition font-medium
                    ${selectedCategoryIds.includes(c.id)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Width pills */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Width</p>
            <div className="flex flex-wrap gap-2">
              {WIDTHS.map(w => (
                <button key={w.value} onClick={() => toggleWidth(w.value)}
                  className={`text-sm px-4 py-1.5 rounded-full border transition font-medium
                    ${selectedWidths.includes(w.value)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {loading ? "Loading..." : `${shoes.length} shoe${shoes.length !== 1 ? "s" : ""} found`}
            </p>
            {(activeFilterCount > 0 || searchQuery) && (
              <button onClick={clearAll} className="text-sm text-gray-400 hover:text-black transition">
                Reset all filters
              </button>
            )}
          </div>
        </div>

        {/* ── GRID ── */}
        {loading && (
          <p className="text-center text-gray-600 py-20">Loading shoes...</p>
        )}

        {!loading && shoes.length === 0 && (
          <div className="text-center py-20 space-y-2">
            <p className="text-gray-500 text-lg">No shoes match your filters.</p>
            <button onClick={clearAll} className="text-sm text-black underline">
              Clear filters and show all
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {shoes.map(shoe => (
            <div key={shoe.id}
              className="group bg-white rounded-2xl overflow-hidden transition hover:shadow-xl border border-gray-100 shadow-sm">
              <Link href={`/shoes/${shoe.id}`}>
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={shoe.image_url}
                    alt={shoe.name}
                    className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </Link>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-lg">{shoe.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{shoe.model_line}</p>
                <p className="text-sm text-gray-500">{shoe.gender}</p>

                {/* Badges */}
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
                    <button className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800">
                      View
                    </button>
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
