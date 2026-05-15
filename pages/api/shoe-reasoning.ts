// pages/api/shoe-reasoning.ts
// Handles both scoring (fast, no reasoning) and full reasoning
// mode: "score" = just return score | "full" = return score + reasoning

import type { NextApiRequest, NextApiResponse } from 'next'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const CATEGORY_MAP: Record<number, string> = {
  1: 'Running', 2: 'Casual', 3: 'Sports', 4: 'Hiking',
}

function buildContext(shoe: any, userProfile: any) {
  const categoryLabel  = CATEGORY_MAP[shoe.category_id] ?? 'General'
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

  return { categoryLabel, userCategories, userWidths, brandSizeInfo }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { shoe, userProfile, mode = 'full' } = req.body
  if (!shoe || !userProfile) return res.status(400).json({ error: 'Missing data' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const { categoryLabel, userCategories, userWidths, brandSizeInfo } = buildContext(shoe, userProfile)

  // ── Score-only mode (fast — just a number) ────────────────────────────
  if (mode === 'score') {
    const prompt = `Score this shoe's fit for this user from 0 to 100. Return ONLY a JSON object like {"score": 74} — nothing else.

USER: gender=${userProfile.gender}, width(s)=${userWidths}, activities=${userCategories}, brand sizes=${brandSizeInfo}
SHOE: ${shoe.name} (${shoe.model_line}), $${shoe.price}, gender=${shoe.gender}, width=${shoe.width}, category=${categoryLabel}

Use your real knowledge of this shoe model. Be precise — spread scores across the full 0-100 range. A perfect match ~90, good ~72, average ~55, poor ~30.`

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 20,
          temperature: 0.1,  // near-zero = consistent, deterministic scores
        }),
      })

      if (!response.ok) return res.status(500).json({ error: 'AI service error' })

      const data = await response.json()
      const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
      const clean = raw.replace(/```json|```/g, '').trim()

      let score = 50
      try {
        const parsed = JSON.parse(clean)
        score = Math.min(100, Math.max(0, Math.round(Number(parsed.score))))
      } catch {
        const match = raw.match(/\d+/)
        if (match) score = Math.min(100, Math.max(0, Math.round(Number(match[0]))))
      }

      return res.status(200).json({ score })

    } catch (err) {
      console.error('Score error:', err)
      return res.status(500).json({ error: 'Failed to score' })
    }
  }

  // ── Full mode (score + reasoning) ────────────────────────────────────
  const prompt = `You are SoleMate's AI shoe expert. Score this shoe 0-100 for fit and explain why.

USER PROFILE:
- Gender: ${userProfile.gender}
- Preferred width(s): ${userWidths}
- Activities: ${userCategories}
- Brand sizes: ${brandSizeInfo}

SHOE:
- Name: ${shoe.name} (${shoe.model_line})
- Price: $${shoe.price}
- Gender: ${shoe.gender}
- Width: ${shoe.width}
- Category: ${categoryLabel}

Score 0-100 using your real knowledge of this shoe. Consider: true-to-size fit, width accuracy, suitability for stated activities, cushioning/support, known quirks of this model. Use the full range — avoid clustering near 100.

Respond ONLY with valid JSON, no other text:
{"score": <0-100>, "reasoning": "<2-3 sentences referencing real features of this shoe and why it scored this way>"}`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.2,  // low = consistent scores, slight variation in wording
      }),
    })

    if (!response.ok) {
      console.error('Groq error:', await response.text())
      return res.status(500).json({ error: 'AI service error' })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    const clean = raw.replace(/```json|```/g, '').trim()

    let parsed: { score: number; reasoning: string }
    try {
      parsed = JSON.parse(clean)
    } catch {
      const scoreMatch   = raw.match(/"score"\s*:\s*(\d+)/)
      const reasonMatch  = raw.match(/"reasoning"\s*:\s*"([^"]+)"/)
      if (scoreMatch && reasonMatch) {
        parsed = { score: Number(scoreMatch[1]), reasoning: reasonMatch[1] }
      } else {
        console.error('Failed to parse:', raw)
        return res.status(500).json({ error: 'Failed to parse AI response' })
      }
    }

    return res.status(200).json({
      score: Math.min(100, Math.max(0, Math.round(parsed.score))),
      reasoning: parsed.reasoning,
    })

  } catch (err) {
    console.error('Reasoning error:', err)
    return res.status(500).json({ error: 'Failed to generate reasoning' })
  }
}
