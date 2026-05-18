// pages/api/shoe-description.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const CATEGORY_MAP: Record<number, string> = {
  1: 'Running', 2: 'Casual', 3: 'Sports', 4: 'Hiking',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { shoeId, userId, mode } = req.body
  if (!shoeId) return res.status(400).json({ error: 'Missing shoeId' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch shoe
  const { data: shoe } = await supabase
    .from('shoe').select('*').eq('id', shoeId).single()
  if (!shoe) return res.status(404).json({ error: 'Shoe not found' })

  const categoryLabel = CATEGORY_MAP[shoe.category_id] ?? 'General'

  // ── General description (cached forever on the shoe row) ──────────────
  if (mode === 'general') {
    // Return cached if exists
    if (shoe.ai_description) {
      return res.status(200).json({ description: shoe.ai_description })
    }

    const prompt = `Write a 3-4 sentence product description for the ${shoe.name} (${shoe.model_line}) shoe. 
Price: $${shoe.price}. Category: ${categoryLabel}. Width: ${shoe.width}. Gender: ${shoe.gender}.

Write like a knowledgeable shoe enthusiast — specific, factual, confident. Reference real features of this exact model based on your knowledge (materials, sole, cushioning, history, what it's known for). 
Do NOT use marketing fluff like "perfect for everyone" or "you'll love it". 
Do NOT start with the shoe name. No bullet points. Plain prose only.`

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
        }),
      })

      if (!response.ok) return res.status(500).json({ error: 'AI service error' })

      const data = await response.json()
      const description = data.choices?.[0]?.message?.content?.trim()
        .replace(/\*\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        ?? ''

      // Cache it permanently on the shoe row
      await supabase.from('shoe').update({ ai_description: description }).eq('id', shoeId)

      return res.status(200).json({ description })

    } catch (err) {
      console.error('Description error:', err)
      return res.status(500).json({ error: 'Failed to generate description' })
    }
  }

  // ── Personal reasoning (logged in users only) ─────────────────────────
  if (mode === 'personal') {
    if (!userId) return res.status(401).json({ error: 'Not logged in' })

    const { data: profile } = await supabase
      .from('user_profile')
      .select('gender, shoe_width, shoe_widths, category_id, category_ids, brand_sizes')
      .eq('id', userId)
      .single()

    if (!profile) return res.status(404).json({ error: 'No profile found' })

    const userWidths = profile.shoe_widths?.length
      ? profile.shoe_widths.join(', ')
      : profile.shoe_width ?? 'not set'

    const userCategories = profile.category_ids?.length
      ? profile.category_ids.map((id: number) => CATEGORY_MAP[id]).join(', ')
      : CATEGORY_MAP[profile.category_id] ?? 'not set'

    const prompt = `In 2-3 sentences explain whether the ${shoe.name} is a good or bad match for this specific user. Be direct and honest.

USER: gender=${profile.gender}, width=${userWidths}, activities=${userCategories}
SHOE: ${shoe.name}, width=${shoe.width}, category=${categoryLabel}, gender=${shoe.gender}

Reference real features of the ${shoe.name}. If it's a good match say why specifically. If it's a bad match be honest about the mismatch. No fluff. Do not start with "This shoe".`

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 160,
          temperature: 0.2,
        }),
      })

      if (!response.ok) return res.status(500).json({ error: 'AI service error' })

      const data = await response.json()
      const reasoning = data.choices?.[0]?.message?.content?.trim()
        .replace(/\*\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        ?? ''

      return res.status(200).json({ reasoning })

    } catch (err) {
      console.error('Personal reasoning error:', err)
      return res.status(500).json({ error: 'Failed to generate reasoning' })
    }
  }

  return res.status(400).json({ error: 'Invalid mode' })
}
