"use server"

import { generateText, Output } from "ai"
import { z } from "zod"
import { estimateBpm as localEstimate } from "@/lib/estimate-bpm"

const cache = new Map<string, { bpm: number; confidence: string }>()

export async function estimateBpmAI(
  title: string,
  artist: string,
  genre: string,
): Promise<{ bpm: number; confidence: string }> {
  const key = `${title}::${artist}::${genre}`
  const cached = cache.get(key)
  if (cached) return cached

  try {
    const { output } = await generateText({
      model: "openai/gpt-4o-mini",
      output: Output.object({
        schema: z.object({
          bpm: z.number().int().min(40).max(220),
          confidence: z.enum(["low", "medium", "high"]),
        }),
      }),
      prompt: `You are a music expert and DJ. Estimate the BPM (beats per minute) of this track as accurately as possible.

Track: "${title}" by ${artist}
Genre context: ${genre}

If you recognize the song, give its actual BPM. If not, estimate based on genre conventions and any tempo cues in the title/artist. Return your best estimate as an integer and your confidence level.`,
    })

    if (output) {
      cache.set(key, output)
      return output
    }

    // Fallback to local if AI returns no output
    const local = localEstimate(title, artist, genre)
    cache.set(key, local)
    return local
  } catch {
    // Fallback to local heuristic on any error
    const local = localEstimate(title, artist, genre)
    cache.set(key, local)
    return local
  }
}
