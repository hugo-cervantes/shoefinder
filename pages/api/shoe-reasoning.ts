// pages/api/shoe-reasoning.ts
// mode: "rank"    → send all shoes, AI picks best 10 and scores them 1-10
// mode: "explain" → send one shoe + its score, AI explains why

import type { NextApiRequest, NextApiResponse } from 'next'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const CATEGORY_MAP: Record<number, string> = {
  1: 'Running', 2: 'Casual', 3: 'Sports', 4: 'Hiking',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { shoes, shoe, userProfile, score, mode = 'rank' } = req.body
  if (!userProfile) return res.status(400).json({ error: 'Missing userProfile' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const userCategories = (
    userProfile.category_ids?.length
      ? userProfile.category_ids.map((id: number) => CATEGORY_MAP[id]).filter(Boolean)
      : [CATEGORY_MAP[userProfile.category_id]]
  ).join(', ')

  const userWidths = userProfile.shoe_widths?.length
    ? userProfile.shoe_widths.join(', ')
    : userProfile.shoe_width

  const brandSizeInfo = userProfile.brand_sizes && Object.keys(userProfile.brand_sizes).length > 0
    ? Object.entries(userProfile.brand_sizes).map(([b, s]) => `${b}: size ${s}`).join(', ')
    : 'not provided'

  // ── RANK mode: pick best 10 from all shoes and score them 1-10 ────────
  if (mode === 'rank') {
    if (!shoes || !Array.isArray(shoes)) return res.status(400).json({ error: 'Missing shoes array' })

    const shoeList = shoes.map((s: any) =>
      `ID:${s.id} | ${s.name} (${s.model_line}) | width:${s.width} | category:${CATEGORY_MAP[s.category_id] ?? s.category_id} | gender:${s.gender} | $${s.price}`
    ).join('\n')

    const prompt = `You are an expert shoe fit analyst. A user needs you to pick the 10 best fitting shoes for them from a catalog and score each one.

USER PROFILE:
- Gender: ${userProfile.gender}
- Width preference: ${userWidths}
- Activities: ${userCategories}
- Brand sizes: ${brandSizeInfo}

SHOE CATALOG:
${shoeList}

YOUR TASK:
1. Review every shoe in the catalog above using your real knowledge of each model
2. Pick the 10 shoes that are genuinely the best fit for this specific user
3. Score each of your top 10 from 1-10 (10 = perfect fit, 1 = poor fit)
4. Scores must be spread across the 1-10 range — do NOT give every shoe a 9 or 10
5. Only one shoe can score a 10. At most two shoes can score a 9.
6. Consider: does this exact model run true to width? Is it designed for these activities? Real user reviews? Cushioning for the use case?

IMPORTANT: Your top 10 must be chosen because they genuinely suit this user — not just the first 10 in the list. A shoe at the bottom of the list might be a better fit than one at the top.

Return ONLY a JSON array, no other text:
[{"id": <shoe_id>, "score": <1-10>}, ...]

Order the array from highest score to lowest.`

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.1,
        }),
      })

      if (!response.ok) {
        console.error('Groq rank error:', await response.text())
        return res.status(500).json({ error: 'AI service error' })
      }

      const data = await response.json()
      const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
      const clean = raw.replace(/```json|```/g, '').trim()

      let rankings: { id: number; score: number }[]
      try {
        rankings = JSON.parse(clean)
        // Validate and clamp scores
        rankings = rankings
          .filter(r => r.id != null && r.score != null)
          .map(r => ({ id: Number(r.id), score: Math.min(10, Math.max(1, Math.round(r.score))) }))
          .slice(0, 10)
      } catch {
        console.error('Failed to parse rankings:', raw)
        return res.status(500).json({ error: 'Failed to parse AI rankings' })
      }

      return res.status(200).json({ rankings })

    } catch (err) {
      console.error('Rank error:', err)
      return res.status(500).json({ error: 'Failed to rank shoes' })
    }
  }

  // ── EXPLAIN mode: explain why a shoe got its score ────────────────────
  if (mode === 'explain') {
    if (!shoe) return res.status(400).json({ error: 'Missing shoe' })
    if (score == null) return res.status(400).json({ error: 'Missing score' })

    const categoryLabel = CATEGORY_MAP[shoe.category_id] ?? 'General'

    const prompt = `You are SoleMate's AI shoe expert. Explain in 2-3 sentences why the ${shoe.name} scored ${score}/10 for this user.

USER: gender=${userProfile.gender}, width=${userWidths}, activities=${userCategories}
SHOE: ${shoe.name} (${shoe.model_line}), width=${shoe.width}, category=${categoryLabel}, $${shoe.price}
SCORE: ${score}/10

Reference real features of the ${shoe.name}. ${score >= 8 ? 'Be enthusiastic about what makes it great.' : score >= 5 ? 'Acknowledge what works and what is a compromise.' : 'Be honest about why it is not a strong match.'} Do not start with "This shoe". Do not use bullet points.`

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
      const reasoning = data.choices?.[0]?.message?.content?.trim() ?? ''
      return res.status(200).json({ reasoning })

    } catch (err) {
      console.error('Explain error:', err)
      return res.status(500).json({ error: 'Failed to generate explanation' })
    }
  }

  return res.status(400).json({ error: 'Invalid mode' })
}
