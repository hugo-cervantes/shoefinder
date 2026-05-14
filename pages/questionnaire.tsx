import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import { BRANDS, BrandKey, BrandSizes, toNikeSize } from "../lib/brandSizes";

// Brand size dropdown options (US sizes 4–18 in 0.5 steps)
const BRAND_SIZE_OPTIONS = Array.from({ length: 29 }, (_, i) => +(4 + i * 0.5).toFixed(1))

export default function Questionnaire() {
  const router = useRouter()

  const [userId, setUserId]       = useState<string | null>(null)
  const [gender, setGender]       = useState("")
  const [shoeWidth, setShoeWidth] = useState("")
  const [categoryId, setCategoryId] = useState<number | "">("")

  // Brand sizes
  const [brandSizes, setBrandSizes] = useState<BrandSizes>({})
  const [activeBrands, setActiveBrands] = useState<BrandKey[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUserId(data.user?.id || null)
    )
  }, [])

  // Toggle a brand on/off
  const toggleBrand = (key: BrandKey) => {
    setActiveBrands(prev =>
      prev.includes(key)
        ? prev.filter(b => b !== key)
        : [...prev, key]
    )
    // Clear size if removing
    if (activeBrands.includes(key)) {
      setBrandSizes(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }

  const setBrandSize = (key: BrandKey, size: number | "") => {
    setBrandSizes(prev => ({
      ...prev,
      [key]: size === "" ? undefined : size,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) { console.error("Not logged in"); return }
    if (activeBrands.length === 0) return

    // Validate all active brands have a size
    for (const key of activeBrands) {
      if (!brandSizes[key]) return
    }

    const allowedGenders    = ["male", "female", "unisex"]
    const allowedWidths     = ["narrow", "medium", "wide", "extra-wide"]
    const allowedCategories = [1, 2, 3, 4]
    if (!allowedGenders.includes(gender))    return
    if (!allowedWidths.includes(shoeWidth))  return
    if (categoryId !== "" && !allowedCategories.includes(Number(categoryId))) return

    // Clean brand sizes
    const cleanBrandSizes: BrandSizes = {}
    for (const key of activeBrands) {
      const size = brandSizes[key]
      if (size != null) cleanBrandSizes[key] = size
    }

    // Derive a US Nike baseline size from the first brand entered
    const firstKey = activeBrands[0]
    const nikeBaseline = toNikeSize(brandSizes[firstKey]!, firstKey)

    const { error } = await supabase
      .from("user_profile")
      .update({
        gender,
        shoe_size:   nikeBaseline,   // store as Nike baseline for recommendations
        shoe_width:  shoeWidth,
        category_id: categoryId || null,
        brand_sizes: cleanBrandSizes,
      })
      .eq("id", userId)

    if (error) { console.error("Update error:", error.message); return }
    router.push("/catalog")
  }

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

          {/* ── Brand sizes — only size input method ── */}
          <div>
            <label className="block font-medium mb-1">Your Shoe Size by Brand</label>
            <p className="text-xs text-gray-400 mb-3">
              Select the brands you own shoes from and enter your size for each.
              We'll use this to show your correct size on each brand's site.
            </p>

            {/* Brand toggle pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {BRANDS.map(brand => (
                <button key={brand.key} type="button" onClick={() => toggleBrand(brand.key)}
                  className={`text-sm px-3 py-1.5 rounded-full border font-medium transition
                    ${activeBrands.includes(brand.key)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}>
                  {brand.label}
                </button>
              ))}
            </div>

            {/* Size inputs for active brands */}
            {activeBrands.length > 0 && (
              <div className="space-y-3">
                {activeBrands.map(key => {
                  const brand = BRANDS.find(b => b.key === key)!
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-28 shrink-0">
                        {brand.label} size
                      </span>
                      <select
                        value={brandSizes[key] ?? ""}
                        onChange={e => setBrandSize(key, e.target.value === "" ? "" : Number(e.target.value))}
                        className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        required={activeBrands.length > 0 && activeBrands[0] === key}
                      >
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

          {/* Width */}
          <div>
            <label className="block font-medium mb-2">Width</label>
            <select value={shoeWidth} onChange={e => setShoeWidth(e.target.value)}
              className="w-full p-2 border rounded" required>
              <option value="">Select width</option>
              <option value="narrow">Narrow</option>
              <option value="medium">Medium</option>
              <option value="wide">Wide</option>
              <option value="extra-wide">Extra Wide</option>
            </select>
          </div>

          {/* Activity */}
          <div>
            <label className="block font-medium mb-2">Activity</label>
            <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}
              className="w-full p-2 border rounded" required>
              <option value="">Select activity</option>
              <option value={1}>Running</option>
              <option value={2}>Casual</option>
              <option value={3}>Sports</option>
              <option value={4}>Hiking</option>
            </select>
          </div>

          <button type="submit"
            disabled={activeBrands.length === 0 || activeBrands.some(k => !brandSizes[k])}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800
                       disabled:opacity-40 disabled:cursor-not-allowed transition">
            Save Profile
          </button>
        </form>
      </section>
    </div>
  )
}
