import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import { BRANDS, BrandKey, BrandSizes, toNikeSize } from "../lib/brandSizes";

const BRAND_SIZE_OPTIONS = Array.from({ length: 29 }, (_, i) => +(4 + i * 0.5).toFixed(1))

const ACTIVITIES = [
  { id: 1, label: "Running",  emoji: "🏃" },
  { id: 2, label: "Casual",   emoji: "👟" },
  { id: 3, label: "Sports",   emoji: "⚽" },
  { id: 4, label: "Hiking",   emoji: "🥾" },
]

const WIDTHS = [
  { value: "narrow",     label: "Narrow" },
  { value: "medium",     label: "Medium" },
  { value: "wide",       label: "Wide" },
  { value: "extra-wide", label: "Extra Wide" },
]

const ALL_ACTIVITY_IDS = ACTIVITIES.map(a => a.id)
const ALL_WIDTH_VALUES = WIDTHS.map(w => w.value)

export default function Questionnaire() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [gender, setGender] = useState("")

  // Multi-select activity
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])

  // Multi-select width
  const [selectedWidths, setSelectedWidths] = useState<string[]>([])

  // Brand sizes
  const [brandSizes, setBrandSizes]     = useState<BrandSizes>({})
  const [activeBrands, setActiveBrands] = useState<BrandKey[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUserId(data.user?.id || null)
    )
  }, [])

  // ── Activity toggles ──────────────────────────────────────────────────
  const toggleActivity = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAllActivities = () => {
    if (selectedCategories.length === ALL_ACTIVITY_IDS.length) {
      setSelectedCategories([])
    } else {
      setSelectedCategories([...ALL_ACTIVITY_IDS])
    }
  }

  const allActivitiesSelected = selectedCategories.length === ALL_ACTIVITY_IDS.length

  // ── Width toggles ─────────────────────────────────────────────────────
  const toggleWidth = (value: string) => {
    setSelectedWidths(prev =>
      prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]
    )
  }

  const toggleAllWidths = () => {
    if (selectedWidths.length === ALL_WIDTH_VALUES.length) {
      setSelectedWidths([])
    } else {
      setSelectedWidths([...ALL_WIDTH_VALUES])
    }
  }

  const allWidthsSelected = selectedWidths.length === ALL_WIDTH_VALUES.length

  // ── Brand toggles ─────────────────────────────────────────────────────
  const toggleBrand = (key: BrandKey) => {
    setActiveBrands(prev =>
      prev.includes(key) ? prev.filter(b => b !== key) : [...prev, key]
    )
    if (activeBrands.includes(key)) {
      setBrandSizes(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }

  const setBrandSize = (key: BrandKey, size: number | "") => {
    setBrandSizes(prev => ({ ...prev, [key]: size === "" ? undefined : size }))
  }

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId)                        { console.error("Not logged in"); return }
    if (activeBrands.length === 0)      return
    if (selectedCategories.length === 0) return
    if (selectedWidths.length === 0)    return

    for (const key of activeBrands) {
      if (!brandSizes[key]) return
    }

    const allowedGenders    = ["male", "female", "unisex"]
    const allowedWidths     = ["narrow", "medium", "wide", "extra-wide"]
    const allowedCategories = [1, 2, 3, 4]
    if (!allowedGenders.includes(gender)) return
    if (selectedWidths.some(w => !allowedWidths.includes(w))) return
    if (selectedCategories.some(c => !allowedCategories.includes(c))) return

    const cleanBrandSizes: BrandSizes = {}
    for (const key of activeBrands) {
      const size = brandSizes[key]
      if (size != null) cleanBrandSizes[key] = size
    }

    const firstKey     = activeBrands[0]
    const nikeBaseline = toNikeSize(brandSizes[firstKey]!, firstKey)

    // Store first selected category as category_id for backwards compat
    // Store all selections in new array columns
    const { error } = await supabase
      .from("user_profile")
      .update({
        gender,
        shoe_size:    nikeBaseline,
        shoe_width:   selectedWidths[0],       // primary width (backwards compat)
        shoe_widths:  selectedWidths,           // all selected widths
        category_id:  selectedCategories[0],   // primary category (backwards compat)
        category_ids: selectedCategories,       // all selected categories
        brand_sizes:  cleanBrandSizes,
      })
      .eq("id", userId)

    if (error) { console.error("Update error:", error.message); return }
    router.push("/recommendations")
  }

  const isValid =
    gender &&
    activeBrands.length > 0 &&
    activeBrands.every(k => brandSizes[k]) &&
    selectedCategories.length > 0 &&
    selectedWidths.length > 0

  return (
    <div>
      <Navbar />
      <section className="min-h-[80vh] flex items-center justify-center bg-gray-100 p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-md space-y-6"
        >
          <h1 className="text-3xl font-bold text-center">Shoe Fit Questionnaire</h1>

          {/* Gender */}
          <div>
            <label className="block font-medium mb-2">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)}
              className="w-full p-2 border rounded" required>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          {/* Brand sizes */}
          <div>
            <label className="block font-medium mb-1">Your Shoe Size by Brand</label>
            <p className="text-xs text-gray-400 mb-3">
              Select the brands you own and enter your size for each.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {BRANDS.map(brand => (
                <button key={brand.key} type="button" onClick={() => toggleBrand(brand.key)}
                  className={`text-sm px-3 py-1.5 rounded-full border font-medium transition
                    ${activeBrands.includes(brand.key)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                  {brand.label}
                </button>
              ))}
            </div>
            {activeBrands.length > 0 && (
              <div className="space-y-3">
                {activeBrands.map(key => {
                  const brand = BRANDS.find(b => b.key === key)!
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-28 shrink-0">{brand.label} size</span>
                      <select value={brandSizes[key] ?? ""}
                        onChange={e => setBrandSize(key, e.target.value === "" ? "" : Number(e.target.value))}
                        className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
                        <option value="">Select size</option>
                        {BRAND_SIZE_OPTIONS.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
            {activeBrands.length === 0 && (
              <p className="text-xs text-red-400 mt-1">Please select at least one brand and enter your size.</p>
            )}
          </div>

          {/* ── Width — multi-select ── */}
          <div>
            <label className="block font-medium mb-1">Width</label>
            <p className="text-xs text-gray-400 mb-3">Select all that apply.</p>
            <div className="flex flex-wrap gap-2">
              {/* All widths */}
              <button type="button" onClick={toggleAllWidths}
                className={`text-sm px-3 py-1.5 rounded-full border font-medium transition
                  ${allWidthsSelected
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                All Widths
              </button>
              {WIDTHS.map(w => (
                <button key={w.value} type="button" onClick={() => toggleWidth(w.value)}
                  className={`text-sm px-3 py-1.5 rounded-full border font-medium transition
                    ${selectedWidths.includes(w.value)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                  {w.label}
                </button>
              ))}
            </div>
            {selectedWidths.length === 0 && (
              <p className="text-xs text-red-400 mt-2">Please select at least one width.</p>
            )}
          </div>

          {/* ── Activity — multi-select ── */}
          <div>
            <label className="block font-medium mb-1">Activity</label>
            <p className="text-xs text-gray-400 mb-3">Select all that apply.</p>
            <div className="flex flex-wrap gap-2">
              {/* All of the above */}
              <button type="button" onClick={toggleAllActivities}
                className={`text-sm px-3 py-1.5 rounded-full border font-medium transition
                  ${allActivitiesSelected
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                All of the Above
              </button>
              {ACTIVITIES.map(a => (
                <button key={a.id} type="button" onClick={() => toggleActivity(a.id)}
                  className={`text-sm px-3 py-1.5 rounded-full border font-medium transition
                    ${selectedCategories.includes(a.id)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                  {a.emoji} {a.label}
                </button>
              ))}
            </div>
            {selectedCategories.length === 0 && (
              <p className="text-xs text-red-400 mt-2">Please select at least one activity.</p>
            )}
          </div>

          <button type="submit" disabled={!isValid}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800
                       disabled:opacity-40 disabled:cursor-not-allowed transition">
            Save Profile
          </button>
        </form>
      </section>
    </div>
  )
}
