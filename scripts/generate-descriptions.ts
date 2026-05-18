// scripts/generate-descriptions.ts
// Run once: npx tsx scripts/generate-descriptions.ts
// Generates AI descriptions for all shoes that don't have one yet
// Description is saved to shoe.ai_description and never changes after that

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const CATS: Record<number, string> = {
  1: "Running",
  2: "Casual",
  3: "Sports",
  4: "Hiking",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateDescription(shoe: any): Promise<string> {
  const cat = CATS[shoe.category_id] ?? "General";
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
    ". Write like a knowledgeable shoe enthusiast. Be specific and factual about this exact model based on real product knowledge. No marketing fluff. No bullet points. Do not start with the shoe name. Plain prose only.";

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + GROQ_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error("Groq error " + res.status);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim().replace(/\*\*/g, "");
}

async function main() {
  console.log("Fetching shoes without descriptions...");

  const { data: shoes, error } = await supabase
    .from("shoe")
    .select("id, name, model_line, price, width, category_id, gender, ai_description")
    .is("ai_description", null);

  if (error) {
    console.error("Failed to fetch shoes:", error.message);
    return;
  }

  if (!shoes || shoes.length === 0) {
    console.log("All shoes already have descriptions.");
    return;
  }

  console.log("Found " + shoes.length + " shoes without descriptions.\n");

  for (const shoe of shoes) {
    process.stdout.write("Generating for: " + shoe.name + "... ");
    try {
      const description = await generateDescription(shoe);
      const { error: updateError } = await supabase
        .from("shoe")
        .update({ ai_description: description })
        .eq("id", shoe.id);

      if (updateError) {
        console.log("FAILED TO SAVE - " + updateError.message);
      } else {
        console.log("done");
      }

      // Small delay to avoid hitting Groq rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      console.log("ERROR - " + err.message);
    }
  }

  console.log("\nAll done. Descriptions are now frozen in the database.");
}

main();
