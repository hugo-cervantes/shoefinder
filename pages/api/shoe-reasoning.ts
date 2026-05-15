// pages/api/shoe-reasoning.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const CATEGORY_MAP: Record<number, string> = {
  1: 'Running', 2: 'Casual', 3: 'Sports', 4: 'Hiking',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { shoe, userProfile, score } = req.body

  if (!shoe || !userProfile) return res.status(400).json({ error: 'Missing data' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const categoryLabel = CATEGORY_MAP[shoe.category_id] ?? 'General'
  const userCategories = (userProfile.category_ids?.length
    ? userProfile.category_ids.map((id: number) => CATEGORY_MAP[id]).filter(Boolean)
    : [CATEGORY_MAP[userProfile.category_id]]
  ).join(', ')

  const userWidths = userProfile.shoe_widths?.length
    ? userProfile.shoe_widths.join(', ')
    : userProfile.shoe_width

  const brandSizeInfo = userProfile.brand_sizes
    ? Object.entries(userProfile.brand_sizes).map(([b, s]) => `${b}: size ${s}`).join(', ')
    : 'not provided'

  const prompt = `You are SoleMate's AI shoe expert. A user has been matched with a shoe and scored ${score}/100 for fit compatibility.

USER PROFILE:
- Gender: ${userProfile.gender}
- Preferred width(s): ${userWidths}
- Activity/use: ${userCategories}
- Brand sizes: ${brandSizeInfo}

MATCHED SHOE:
- Name: ${shoe.name}
- Model line: ${shoe.model_line}
- Price: $${shoe.price}
- Gender: ${shoe.gender}
- Width: ${shoe.width}
- Category: ${categoryLabel}

FIT SCORE: ${score}/100

Write a concise 2-3 sentence explanation of why this shoe scored ${score}/100 for this user. Reference the shoe's real features and connect them to the user's specific needs. If the score is high (85+), be enthusiastic. If mid-range (60-84), acknowledge what works and what's a compromise. If lower (<60), be honest about why it's not a perfect match. Sound like a knowledgeable friend. Do not use bullet points. Do not start with "This shoe".`

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
        max_tokens: 160,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Groq error:', err)
      return res.status(500).json({ error: 'AI service error' })
    }

    const data = await response.json()
    const reasoning = data.choices?.[0]?.message?.content?.trim() ?? ''
    return res.status(200).json({ reasoning })

  } catch (err) {
    console.error('Reasoning error:', err)
    return res.status(500).json({ error: 'Failed to generate reasoning' })
  }
}
