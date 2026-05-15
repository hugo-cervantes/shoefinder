// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const CATEGORY_MAP: Record<number, string> = {
  1: 'Running', 2: 'Casual', 3: 'Sports', 4: 'Hiking',
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

  // Validate input
  if (!Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'Invalid messages' })

  const recentMessages = messages.slice(-10)

  for (const msg of recentMessages) {
    if (!['user', 'assistant'].includes(msg.role))
      return res.status(400).json({ error: 'Invalid message role' })
    if (typeof msg.content !== 'string')
      return res.status(400).json({ error: 'Invalid message content' })
    if (msg.content.length > 1000)
      return res.status(400).json({ error: 'Message too long' })
  }

  // Sanitize last user message
  const lastUserMsg = recentMessages.filter((m: any) => m.role === 'user').pop()
  if (lastUserMsg) {
    lastUserMsg.content = lastUserMsg.content
      .replace(/<[^>]*>/g, '')
      .replace(/\{\{|\}\}/g, '')
      .trim()
    if (!lastUserMsg.content)
      return res.status(400).json({ error: 'Empty message' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: catalog } = await supabase
    .from('shoe')
    .select('id, name, model_line, price, width, category_id, gender, image_url, external_url')

  const catalogList = (catalog || []).map((s: CatalogShoe) =>
    `[ID:${s.id}] ${s.name} (${s.model_line}) | ${CATEGORY_MAP[s.category_id] ?? 'General'} | width:${s.width} | gender:${s.gender} | $${s.price}`
  ).join('\n')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('gender, shoe_width, shoe_widths, category_id, category_ids, brand_sizes')
    .eq('id', userId)
    .single()

  const profileInfo = profile ? [
    'User profile:',
    `- Gender: ${profile.gender ?? 'not set'}`,
    `- Width: ${profile.shoe_widths?.join(', ') ?? profile.shoe_width ?? 'not set'}`,
    `- Activities: ${profile.category_ids?.map((id: number) => CATEGORY_MAP[id]).join(', ') ?? CATEGORY_MAP[profile.category_id] ?? 'not set'}`,
    `- Brand sizes: ${profile.brand_sizes ? Object.entries(profile.brand_sizes).map(([b, s]) => `${b}:${s}`).join(', ') : 'not set'}`,
  ].join('\n') : ''

  const systemPrompt = [
    "You are SoleMate's AI shoe assistant - a knowledgeable, friendly shoe expert.",
    '',
    profileInfo,
    '',
    'SOLEMATE CATALOG:',
    catalogList,
    '',
    'YOUR JOB:',
    '1. Understand what the user needs through natural conversation',
    '2. Search the catalog for best matches',
    '3. For catalog shoes use {{SHOE:ID}} - example: {{SHOE:23}} - NEVER write IDs any other way',
    '4. If catalog has no good match, suggest outside shoes. For URLs always use Google Shopping search so links never break:',
    '{{EXTERNAL:[{"name":"Nike Pegasus 41","brand":"Nike","reason":"Great for neutral runners","url":"https://www.google.com/search?q=Nike+Pegasus+41+buy&tbm=shop","price_range":"$130-$150"}]}}',
    'URL format for ALL outside shoes: https://www.google.com/search?q=BRAND+SHOE+NAME+buy&tbm=shop (replace spaces with +). This always works regardless of brand.',
    '5. Always explain WHY each shoe fits the user',
    '6. Keep responses conversational and concise',
    '',
    'RULES:',
    '- NEVER show thinking process or internal analysis',
    '- NEVER use "Let me think", "Looking at the catalog", "Based on my analysis"',
    '- Go straight to your response',
    '- Only suggest outside shoes when catalog truly has no good match',
  ].join('\n')

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
          ...recentMessages,
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('Groq error:', await response.text())
      return res.status(500).json({ error: 'AI service error' })
    }

    const data = await response.json()
    const raw: string = data.choices?.[0]?.message?.content?.trim() ?? ''

    // Parse {{SHOE:id}} references
    const shoeIds: number[] = []
    const shoeRefRegex = /\{\{SHOE:(\d+)\}\}/g
    let matchResult
    while ((matchResult = shoeRefRegex.exec(raw)) !== null) {
      shoeIds.push(Number(matchResult[1]))
    }

    // Parse {{EXTERNAL:[...]}} block
    let externalShoes: SuggestedShoe[] = []
    const externalMatch = raw.match(/\{\{EXTERNAL:(\[[\s\S]*?\])\}\}/)
    if (externalMatch) {
      try { externalShoes = JSON.parse(externalMatch[1]) } catch { /* skip */ }
    }

    // Clean the message
    const cleanMessage = raw
      .replace(/\*\*/g, '')
      .replace(/\(ID:\d+\)/g, '')
      .replace(/\[ID:\d+\]/g, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/\{\{SHOE:\d+\}\}/g, '')
      .replace(/\{\{EXTERNAL:[\s\S]*?\}\}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Fetch catalog shoe details
    let catalogMatches: CatalogShoe[] = []
    if (shoeIds.length > 0) {
      const { data: shoes } = await supabase.from('shoe').select('*').in('id', shoeIds)
      catalogMatches = (shoes || []).sort((a: CatalogShoe, b: CatalogShoe) =>
        shoeIds.indexOf(a.id) - shoeIds.indexOf(b.id)
      )
    }

    return res.status(200).json({ message: cleanMessage, catalogMatches, externalShoes })

  } catch (err) {
    console.error('Chat error:', err)
    return res.status(500).json({ error: 'Failed to get response' })
  }
}
