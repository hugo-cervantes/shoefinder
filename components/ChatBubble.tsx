'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  catalogMatches?: CatalogShoe[]
  externalShoes?: ExternalShoe[]
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
}

interface ExternalShoe {
  name: string
  brand: string
  reason: string
  url: string
  price_range: string
}

// ── Input sanitization ───────────────────────────────────────────────────
const MAX_INPUT_LENGTH = 500

function sanitizeInput(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')              // strip HTML
    .replace(/[
