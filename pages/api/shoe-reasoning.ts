// pages/api/shoe-reasoning.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface ShoeReasoningRequest {
  shoe: {
    name: string
    model_line: string
    price: number
    gender: string
    width: string
    category_id: number
  }
  userProfile: {
    shoe_width: string
    category_id: number
    gender: string
    brand_sizes?: Record<string, number>
  }
}

const CATEGORY_MAP: Record<number, string> = {
  1: 'Running',
  2: 'Casual',
  3: 'Sports',
  4: 'Hiking',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { shoe, userProfile } = req.body as ShoeReasoningRequest

  if (!shoe || !userProfile) {
    return res.status(400).json({ error: 'Missing shoe or userProfile' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const categoryLabel    = CATEGORY_MAP[shoe.category_id] ?? 'General'
  const userCategory     = CATEGORY_MAP[userProfile.category_id] ?? 'General'
  const brandSizeInfo    = userProfile.brand_sizes
    ? Object.entries(userProfile.brand_sizes)
        .map(([brand, size]) => `${brand}: size ${size}`)
        .join(', ')
    : 'not provided'

  const prompt = `You are SoleMate's AI shoe expert. A user has been matched with a shoe and you need to explain WHY it's a great fit for them specifically.

USER PROFILE:
- Gender: ${userProfile.gender}
- Preferred width: ${userProfile.shoe_width}
- Activity: ${userCategory}
- Their brand sizes: ${brandSizeInfo}

MATCHED SHOE:
- Name: ${shoe.name}
- Model line: ${shoe.model_line}
- Price: $${shoe.price}
- Gender: ${shoe.gender}
- Width: ${shoe.width}
- Category: ${categoryLabel}

Using your knowledge of this specific shoe model, write a concise 2-3 sentence explanation of why this shoe is a great match for this user. Be specific about the shoe's real features (cushioning, support, material, use case) and connect them directly to the user's needs. Sound like a knowledgeable friend, not a salesperson. Do not use bullet points. Do not start with "This shoe" — vary your opening.`

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
        max_tokens: 150,
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
