import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import { BRANDS, BrandKey, BrandSizes, toNikeSize } from "../lib/brandSizes";

// ── Size conversion tables ────────────────────────────────────────────────
const TO_US: Record<string, (size: number) => number> = {
  "US Men's":   (s) => s,
  "US Women's": (s) => s - 1.5,
  "UK":         (s) => s + 0.5,
  "EU":         (s) => (s - 33) / 1.5,
  "CM":         (s) => (s - 15.6) / 0.83,
  "JP":         (s) => (s - 15.6) / 0.83,
}

const SIZE_OPTIONS: Record<string, number[]> = {
  "US Men's":   Array.from({ length: 29 }, (_, i) => +(4   + i * 0.5).toFixed(1)),
  "US Women's": Array.from({ length: 29 }, (_, i) => +(5.5 + i * 0.5).toFixed(1)),
  "UK":         Array.from({ length: 29 }, (_, i) => +(3.5 + i * 0.5).toFixed(1)),
  "EU":         Array.from({ length: 16 }, (_, i) =>   36  + i),
  "CM":         Array.from({ length: 25 }, (_, i) => +(22  + i * 0.5).toFixed(1)),
  "JP":         Array.from({ length: 25 }, (_, i) => +(22  + i * 0.5).toFixed(1)),
}

const SIZE_SYSTEMS = Object.keys(SIZE_OPTIONS)

function convertToUS(size: number, system: string): number {
  const fn = TO_US[system]
  if (!fn) return size
  return Math.round(fn(size) * 2) / 2
}

// Brand size dropdown options (US Men's 4–18 in 0.5 steps)
const BRAND_SIZE_OPTIONS = Array.from({ length: 29 }, (_, i) => +(4 + i * 0.5).toFixed(1))

export default function Questionnaire() {
  const router = useRouter()

  const [userId, setUserId]       = useState<string | null>(null)
  const [gender, setGender]       = useState("")
  const [shoeWidth, setShoeWidth] = useState("")
  const [categoryId, setCategoryId] = useState<number | "">("")

  // General size
  const [sizeSystem, setSizeSystem]     = useState("US Men's")
  const [selectedSize, setSelectedSize] = useState<number | "">("")
  const [convertedUS, setConvertedUS]   = useState<number | null>(null)
  const [sizeError, setSizeError]       = useState("")

  // Brand sizes
  const [brandSizes, setBrandSizes] = useState<BrandSizes>({})
  const [activeBrands, setActiveBrands] = useState<BrandKey[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUserId(data.user?.id || null)
    )
  }, [])

  // Auto-convert size system
  useEffect(() => {
    if (selectedSize === "") { setConvertedUS(null); setSizeError(""); return }
    const us = convertToUS(Number(selectedSize), sizeSystem)
    if (isNaN(us) || us < 4 || us > 18) {
      setSizeError(`US equivalent (${isNaN(us) ? "?" : us}) is out of range (4–18).`)
      setConvertedUS(null)
    } else {
      setSizeError("")
      setConvertedUS(us)
    }
  }, [selectedSize, sizeSystem])

  const handleSystemChange = (system: string) => {
    setSizeSystem(system)
    setSelectedSize("")
    setConvertedUS(null)
    setSizeError("")
  }

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
    if (!userId)      { console.error("Not logged in"); return }
    if (!convertedUS) { setSizeError("Please select a valid size."); return }
    if (sizeError)    return

    const allowedGenders    = ["male", "female", "unisex"]
    const allowedWidths     = ["narrow", "medium", "wide", "extra-wide"]
    const allowedCategories = [1, 2, 3, 4]
    if (!allowedGenders.includes(gender))    return
    if (!allowedWidths.includes(shoeWidth))  return
    if (categoryId !== "" && !allowedCategories.includes(Number(categoryId))) return

    // Clean brand sizes — only include brands that have a value
    const cleanBrandSizes: BrandSizes = {}
    for (const key of activeBrands) {
      const size = brandSizes[key]
      if (size != null) cleanBrandSizes[key] = size
    }

    const { error } = await supabase
      .from("user_profile")
      .update({
        gender,
        shoe_size:   convertedUS,
        shoe_width:  shoeWidth,
        category_id: categoryId || null,
        brand_sizes: cleanBrandSizes,
      })
      .eq("id", userId)

    if (error) { console.error("Update error:", error.message); return }
    router.push("/catalog")
  }

  const isSuffix = sizeSystem === "CM" || sizeSystem === "JP"

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

          {/* General shoe size */}
          <div>
            <label className="block font-medium mb-2">Your Shoe Size</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {SIZE_SYSTEMS.map(system => (
                <button key={system} type="button" onClick={() => handleSystemChange(system)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition
                    ${sizeSystem === system ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                  {system}
                </button>
              ))}
            </div>
            <select value={selectedSize}
              onChange={e => setSelectedSize(e.target.value === "" ? "" : Number(e.target.value))}
              className={`w-full p-2 border rounded transition ${sizeError ? "border-red-400 bg-red-50" : ""}`}
              required>
              <option value="">Select your {sizeSystem} size</option>
              {SIZE_OPTIONS[sizeSystem].map(size => (
                <option key={size} value={size}>{size}{isSuffix ? " cm" : ""}</option>
              ))}
            </select>
            {sizeError && <p className="text-red-500 text-sm mt-1">{sizeError}</p>}
            {convertedUS && !sizeError && sizeSystem !== "US Men's" && (
              <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Converts to <span className="font-semibold text-gray-800">US Men's {convertedUS}</span> — saved automatically.
              </p>
            )}
          </div>

          {/* ── Brand sizes ── */}
          <div>
            <label className="block font-medium mb-1">Brand Sizes <span className="text-gray-400 font-normal text-sm">(optional)</span></label>
            <p className="text-xs text-gray-400 mb-3">
              Tell us what size you wear in specific brands — we'll auto-fill your size when you visit their site.
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
                      >
                        <option value="">Select size</option>
                        {BRAND_SIZE_OPTIONS.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      {/* Show conversion preview */}
                      {brandSizes[key] != null && (
                        <span className="text-xs text-gray-400 shrink-0">
                          = US {toNikeSize(brandSizes[key]!, key)} Nike
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
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

          <button type="submit" disabled={!!sizeError || !convertedUS}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800
                       disabled:opacity-40 disabled:cursor-not-allowed transition">
            Save Profile
          </button>
        </form>
      </section>
    </div>
  )
}
