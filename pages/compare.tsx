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

// Which stat is better - lower price is better, higher is not applicable
function isBetter(stat: string, value: any, allValues: any[]): boolean {
  if (stat === "price") return value === Math.min(...allValues)
  return false
}

export default function ComparePage() {
  const router = useRouter()
  const [shoes, setShoes] = useState<Shoe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!router.isReady) return
    const ids = router.query.ids
    if (!ids) { setLoading(false); return }

    const idList = String(ids).split(",").map(Number).filter(Boolean).slice(0, 3)

    supabase.from("shoe").select("*").in("id", idList).then(({ data }) => {
      if (data) {
        // Keep order matching URL params
        const sorted = idList.map(id => data.find(s => s.id === id)).filter(Boolean) as Shoe[]
        setShoes(sorted)
      }
      setLoading(false)
    })
  }, [router.isReady, router.query.ids])

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

  const prices  = shoes.map(s => s.price)
  const colW    = shoes.length === 2 ? "w-1/2" : "w-1/3"

  // Stats rows
  const stats = [
    {
      label: "Price",
      key: "price",
      values: shoes.map(s => `$${s.price}`),
      raw: prices,
      highlight: true,
    },
    {
      label: "Model Line",
      key: "model_line",
      values: shoes.map(s => s.model_line),
      raw: null,
      highlight: false,
    },
    {
      label: "Gender",
      key: "gender",
      values: shoes.map(s => s.gender),
      raw: null,
      highlight: false,
    },
    {
      label: "Width",
      key: "width",
      values: shoes.map(s => s.width ? s.width.charAt(0).toUpperCase() + s.width.slice(1) : "Standard"),
      raw: null,
      highlight: false,
    },
    {
      label: "Activity",
      key: "category",
      values: shoes.map(s => CATEGORY_MAP[s.category_id] ?? "General"),
      raw: null,
      highlight: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Compare Shoes</h1>
            <p className="text-gray-400 text-sm mt-1">Comparing {shoes.length} shoes</p>
          </div>
          <Link href="/catalog"
            className="text-sm text-gray-500 hover:text-black transition flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to catalog
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Photos row */}
          <div className="flex border-b border-gray-100">
            {shoes.map((shoe, i) => (
              <div key={shoe.id} className={`${colW} ${i < shoes.length - 1 ? 'border-r border-gray-100' : ''} p-6`}>
                <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                  <img src={shoe.image_url} alt={shoe.name}
                    className="w-full h-full object-contain p-4" />
                </div>
                <h2 className="font-bold text-gray-900 text-base leading-tight">{shoe.name}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{shoe.model_line}</p>
                <div className="flex gap-2 mt-3">
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
            <div key={stat.key}
              className={`flex ${si < stats.length - 1 ? 'border-b border-gray-50' : ''}`}>
              {/* Label column */}
              <div className="w-28 shrink-0 px-5 py-4 flex items-center bg-gray-50 border-r border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</p>
              </div>
              {/* Value columns */}
              {shoes.map((shoe, i) => {
                const val  = stat.values[i]
                const best = stat.highlight && stat.raw
                  ? isBetter("price", stat.raw[i], stat.raw)
                  : false

                return (
                  <div key={shoe.id}
                    className={`flex-1 px-5 py-4 flex items-center
                      ${i < shoes.length - 1 ? 'border-r border-gray-100' : ''}
                      ${best ? 'bg-green-50' : ''}`}>
                    <span className={`text-sm font-medium
                      ${best ? 'text-green-700' : 'text-gray-700'}`}>
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

        {/* Change shoes */}
        <div className="mt-6 text-center">
          <Link href="/catalog"
            className="text-sm text-gray-400 hover:text-black transition underline">
            Change selection
          </Link>
        </div>
      </main>
    </div>
  )
}
