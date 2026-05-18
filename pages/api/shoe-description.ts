import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

const CATS: Record<number, string> = {
  1: "Running",
  2: "Casual",
  3: "Sports",
  4: "Hiking",
};

async function askGroq(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error("Groq error " + res.status);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim().replace(/\*\*/g, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { shoeId, userId, mode } = req.body;

  if (!shoeId || !mode) {
    return res.status(400).json({ error: "Missing shoeId or mode" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );

  const { data: shoe } = await sb.from("shoe").select("*").eq("id", shoeId).single();
  if (!shoe) {
    return res.status(404).json({ error: "Shoe not found" });
  }

  const cat = CATS[shoe.category_id] ?? "General";

  if (mode === "general") {
    if (shoe.ai_description) {
      return res.status(200).json({ description: shoe.ai_description });
    }

    const prompt =
      "Write a 3-4 sentence product description for the " +
      shoe.name +
      " (" +
      shoe.model_line +
      "). Price $" +
      shoe.price +
      ", category " +
      cat +
      ", width " +
      shoe.width +
      ", gender " +
      shoe.gender +
      ". Write like a knowledgeable shoe enthusiast. Be specific and factual about this exact model. No marketing fluff. No bullet points. Do not start with the shoe name.";

    try {
      const description = await askGroq(apiKey, prompt, 200);
      await sb.from("shoe").update({ ai_description: description }).eq("id", shoeId);
      return res.status(200).json({ description });
    } catch (err) {
      console.error("general desc error", err);
      return res.status(500).json({ error: "Failed" });
    }
  }

  if (mode === "personal") {
    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { data: profile } = await sb
      .from("user_profile")
      .select("gender, shoe_width, shoe_widths, category_id, category_ids")
      .eq("id", userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: "No profile" });
    }

    const widths = profile.shoe_widths?.length
      ? profile.shoe_widths.join(", ")
      : profile.shoe_width ?? "not set";

    const activities = profile.category_ids?.length
      ? profile.category_ids.map((x: number) => CATS[x]).join(", ")
      : CATS[profile.category_id] ?? "not set";

    const prompt =
      "In 2-3 sentences explain whether the " +
      shoe.name +
      " is a good or bad match for this user. Be direct and honest." +
      " User: gender=" +
      profile.gender +
      ", width=" +
      widths +
      ", activities=" +
      activities +
      ". Shoe: width=" +
      shoe.width +
      ", category=" +
      cat +
      ", gender=" +
      shoe.gender +
      ". Reference real features of the " +
      shoe.name +
      ". Do not start with This shoe.";

    try {
      const reasoning = await askGroq(apiKey, prompt, 160);
      return res.status(200).json({ reasoning });
    } catch (err) {
      console.error("personal reasoning error", err);
      return res.status(500).json({ error: "Failed" });
    }
  }

  return res.status(400).json({ error: "Invalid mode" });
}
