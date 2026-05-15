// pages/api/shoe-reasoning.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const CATEGORY_MAP: Record<number, string> = {
  1: 'Running', 2: 'Casual', 3: 'Sports', 4: 'Hiking',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { shoe, userProfile } = req.body
  if (!shoe || !userProfile) return res.status(400).json({ error: 'Missing data' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

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

  const prompt = `You are SoleMate's AI shoe expert. Score this shoe's fit for this specific user from 0 to 100, then explain why.

USER PROFILE:
- Gender: ${userProfile.gender}
- Preferred width(s): ${userWidths}
- Activities: ${userCategories}
- Brand sizes: ${brandSizeInfo}

SHOE:
- Name: ${shoe.name}
- Model line: ${shoe.model_line}
- Price: $${shoe.price}
- Gender: ${shoe.gender}
- Width: ${shoe.width}
- Category: ${categoryLabel}

SCORING INSTRUCTIONS:
Score this shoe 0-100 based on how well it fits this user. Use your real knowledge of this specific shoe model to inform the score. Consider:
- How true-to-size does this shoe run? Does it match the user's width needs?
- How well does this shoe's actual design and features serve the user's stated activities?
- Cushioning, support, durability, and comfort relative to their use case
- Gender fit accuracy
- Any known quirks of this model (runs narrow, needs break-in, etc.)

Be precise and differentiated — avoid clustering scores. A perfect match might be 91, a good match 74, a partial match 58, a poor match 31. Use the full range.

Respond ONLY with valid JSON in this exact format, no other text:
{"score": <number 0-100>, "reasoning": "<2-3 sentences explaining the score, referencing real features of this specific shoe>"}`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.8,  // slightly higher = more varied scores
      }),
    })

    if (!response.ok) {
      console.error('Groq error:', await response.text())
      return res.status(500).json({ error: 'AI service error' })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''

    // Parse the JSON response
    let parsed: { score: number; reasoning: string }
    try {
      // Strip any markdown code fences if present
      const clean = raw.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      // Fallback: try to extract score with regex if JSON parse fails
      const scoreMatch = raw.match(/"score"\s*:\s*(\d+)/)
      const reasonMatch = raw.match(/"reasoning"\s*:\s*"([^"]+)"/)
      if (scoreMatch && reasonMatch) {
        parsed = {
          score: Math.min(100, Math.max(0, Number(scoreMatch[1]))),
          reasoning: reasonMatch[1],
        }
      } else {
        console.error('Failed to parse AI response:', raw)
        return res.status(500).json({ error: 'Failed to parse AI response' })
      }
    }

    // Clamp score to 0-100
    const score = Math.min(100, Math.max(0, Math.round(parsed.score)))

    return res.status(200).json({ score, reasoning: parsed.reasoning })

  } catch (err) {
    console.error('Reasoning error:', err)
    return res.status(500).json({ error: 'Failed to generate reasoning' })
  }
}
