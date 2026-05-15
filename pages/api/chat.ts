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

  // ── Input validation & sanitization ──────────────────────────────────

  // Must be an array
  if (!Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'Invalid messages' })

  // Cap conversation history to last 10 messages (prevents token stuffing)
  const recentMessages = messages.slice(-10)

  // Validate each message
  for (const msg of recentMessages) {
    // Only allow user/assistant roles
    if (!['user', 'assistant'].includes(msg.role))
      return res.status(400).json({ error: 'Invalid message role' })

    // Must be a string
    if (typeof msg.content !== 'string')
      return res.status(400).json({ error: 'Invalid message content' })

    // Cap individual message length (prevents huge token dumps)
    if (msg.content.length > 1000)
      return res.status(400).json({ error: 'Message too long (max 1000 characters)' })
  }

  // Strip dangerous characters from the latest user message
  const lastUserMsg = recentMessages.filter(m => m.role === 'user').pop()
  if (lastUserMsg) {
    lastUserMsg.content = lastUserMsg.content
      .replace(/<[^>]*>/g, '')           // strip HTML tags
      .replace(/\{\{|\}\}/g, '')         // strip our own template syntax to prevent injection
      .replace(/[
