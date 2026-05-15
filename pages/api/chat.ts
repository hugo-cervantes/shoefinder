// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const CATEGORY_MAP: Record<number, string> = {
  1: 'Running', 2: 'Casual', 3: 'Sports', 4: 'Hiking',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface CatalogShoe {
  id: number
  name: string
  model_line: string
  price: number
  width: string
  category_id: number
  gender: string
  image_url: string
  external_url: string
}

interface SuggestedShoe {
  name: string
  brand: string
  reason: string
  url: string
  price_range: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, userId } = req.body
  if (!messages || !userId) return res.status(400).json({ error: 'Missing data' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  // ── Load catalog from Supabase ────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: catalog } = await supabase
    .from('shoe')
    .select('id, name, model_line, price, width, category_id, gender, image_url, external_url')

  const catalogList = (catalog || []).map((s: CatalogShoe) =>
    `[ID:${s.id}] ${s.name} (${s.model_line}) — ${CATEGORY_MAP[s.category_id] ?? 'General'} | width:${s.width} | gender:${s.gender} | $${s.price}`
  ).join('\n')

  // ── Load user profile ─────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('user_profile')
    .select('gender, shoe_width, shoe_widths, category_id, category_ids, brand_sizes')
    .eq('id', userId)
    .single()

  const profileInfo = profile ? `
User profile:
- Gender: ${profile.gender ?? 'not set'}
- Width preference: ${profile.shoe_widths?.join(', ') ?? profile.shoe_width ?? 'not set'}
- Activities: ${profile.category_ids?.map((id: number) => CATEGORY_MAP[id]).join(', ') ?? CATEGORY_MAP[profile.category_id] ?? 'not set'}
- Brand sizes: ${profile.brand_sizes ? Object.entries(profile.brand_sizes).map(([b, s]) => `${b}:${s}`).join(', ') : 'not set'}` : ''

  const systemPrompt = `You are SoleMate's AI shoe assistant — a knowledgeable, friendly shoe expert. You help users find their perfect shoe through conversation.

${profileInfo}

SOLEMATE CATALOG (these are the shoes available on our site):
${catalogList}

YOUR JOB:
1. Have a natural conversation to understand what the user needs (activity, fit, style, budget, etc.)
2. Search the catalog above for the best matches
3. If catalog shoes fit — recommend them by referencing their ID like this: {{SHOE:23}} (the system will render a shoe card)
4. If NO catalog shoe truly fits the user's needs, suggest real outside shoes using this format at the end of your message:
{{EXTERNAL:[{"name":"Nike Pegasus 41","brand":"Nike","reason":"Perfect for neutral runners needing extra cushioning","url":"https://www.nike.com/t/pegasus-41","price_range":"$130-$150"},{"name":"Adidas Ultraboost 24","brand":"Adidas","reason":"Best for wide feet needing energy return","url":"https://www.adidas.com/us/ultraboost-24","price_range":"$190"}]}}
5. Always explain WHY you're recommending each shoe based on the user's specific needs
6. Use your real knowledge of shoe models to give accurate, helpful advice
7. Keep responses conversational — not too long, not bullet-point heavy
8. If the user's question isn't about shoes, gently steer back to helping them find footwear

IMPORTANT: Only suggest outside shoes when the catalog genuinely doesn't have a good match. Always check the catalog first.`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('Groq chat error:', await response.text())
      return res.status(500).json({ error: 'AI service error' })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''

    // ── Parse shoe references {{SHOE:id}} ─────────────────────────────
    const shoeIds: number[] = []
    const shoeRefRegex = /\{\{SHOE:(\d+)\}\}/g
    let match
    while ((match = shoeRefRegex.exec(raw)) !== null) {
      shoeIds.push(Number(match[1]))
    }

    // ── Parse external suggestions {{EXTERNAL:[...]}} ─────────────────
    let externalShoes: SuggestedShoe[] = []
    const externalMatch = raw.match(/\{\{EXTERNAL:(\[[\s\S]*?\])\}\}/)
    if (externalMatch) {
      try {
        externalShoes = JSON.parse(externalMatch[1])
      } catch {
        console.error('Failed to parse external shoes')
      }
    }

    // Clean the message text (remove the special tags)
    const cleanMessage = raw
      .replace(/\{\{SHOE:\d+\}\}/g, '')
      .replace(/\{\{EXTERNAL:[\s\S]*?\}\}/g, '')
      .trim()

    // Fetch full shoe data for referenced catalog shoes
    let catalogMatches: CatalogShoe[] = []
    if (shoeIds.length > 0) {
      const { data: shoes } = await supabase
        .from('shoe')
        .select('*')
        .in('id', shoeIds)
      catalogMatches = shoes || []
      // Sort by the order AI mentioned them
      catalogMatches.sort((a, b) => shoeIds.indexOf(a.id) - shoeIds.indexOf(b.id))
    }

    return res.status(200).json({
      message: cleanMessage,
      catalogMatches,
      externalShoes,
    })

  } catch (err) {
    console.error('Chat error:', err)
    return res.status(500).json({ error: 'Failed to get response' })
  }
}
