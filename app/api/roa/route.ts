import { NextResponse } from "next/server";
import {
  buildGeminiRoaRequestBody,
  buildRoaBrainPlan,
  buildRoaFallbackReply,
  buildRoaInstructions,
  buildRoaPromptInput,
  extractGeminiOutputText,
  extractRoaOutputText,
  extractRoaSources,
  getRoaReadyListings,
  getRoaSuggestedListings,
  normalizeRoaMessages,
  type RoaChatMessage,
  type RoaTravelerContext,
} from "@/lib/roa-concierge";
import { supabaseServer } from "@/lib/supabase-server";

type RoaRequestBody = {
  messages?: RoaChatMessage[];
  traveler?: RoaTravelerContext;
};

type OpenAIResponseTool = {
  type: "web_search";
  user_location?: {
    type: "approximate";
    country: string;
    city: string;
    region: string;
    timezone: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as RoaRequestBody;
  const messages = normalizeRoaMessages(body.messages || []);
  const latestMessage =
    [...messages].reverse().find((message) => message.role === "user")
      ?.content || "";

  if (!latestMessage) {
    return NextResponse.json(
      { error: "Ask Roa a question first." },
      { status: 400 },
    );
  }

  const { data } = await supabaseServer
    .from("listings")
    .select(
      "id, title, category, location, description, price, rating, reviews_count, tour_times, max_guests",
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false })
    .limit(80);

  const listings = getRoaReadyListings(data || []);
  const suggestedListings = getRoaSuggestedListings({
    listings,
    latestMessage,
    traveler: body.traveler,
  });
  const brainPlan = buildRoaBrainPlan({
    latestMessage,
    traveler: body.traveler,
    suggestedListings,
  });
  const promptInput = buildRoaPromptInput({
    messages,
    listings,
    traveler: body.traveler,
    brainPlan,
  });
  const instructions = buildRoaInstructions({
    listingCount: listings.length,
    webSearchEnabled:
      process.env.ROA_ENABLE_WEB_SEARCH === "true" ||
      process.env.ROA_ENABLE_WEB_SEARCH === "1",
  });
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const preferredProvider = (process.env.ROA_AI_PROVIDER || "").toLowerCase();
  const apiKey = process.env.OPENAI_API_KEY;
  const webSearchEnabled =
    process.env.ROA_ENABLE_WEB_SEARCH === "true" ||
    process.env.ROA_ENABLE_WEB_SEARCH === "1";

  if (geminiApiKey && preferredProvider !== "openai") {
    const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify(
          buildGeminiRoaRequestBody({
            instructions,
            prompt: promptInput,
          }),
        ),
      },
    );
    const geminiPayload = await geminiResponse.json();

    if (geminiResponse.ok) {
      return NextResponse.json({
        ok: true,
        mode: "gemini",
        reply:
          extractGeminiOutputText(geminiPayload) ||
          buildRoaFallbackReply({
            latestMessage,
            suggestedListings,
            brainPlan,
          }),
        suggestedListings,
        sources: [],
        brainPlan,
      });
    }

    console.warn(
      "Roa Gemini fallback:",
      geminiPayload?.error?.message || "Gemini unavailable",
    );
  }

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      mode: "brain",
      reply: buildRoaFallbackReply({
        latestMessage,
        suggestedListings,
        brainPlan,
      }),
      suggestedListings,
      sources: [],
      brainPlan,
    });
  }

  const tools: OpenAIResponseTool[] = webSearchEnabled
    ? [
        {
          type: "web_search",
          user_location: {
            type: "approximate",
            country: "HN",
            city: "Roatan",
            region: "Bay Islands",
            timezone: "America/Tegucigalpa",
          },
        },
      ]
    : [];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: buildRoaInstructions({
        listingCount: listings.length,
        webSearchEnabled,
      }),
      input: promptInput,
      max_output_tokens: 900,
      metadata: {
        feature: "roa_concierge",
        source: "roatanisland.life",
      },
      ...(tools.length > 0
        ? {
            tools,
            tool_choice: "auto",
            include: ["web_search_call.action.sources"],
          }
        : {}),
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const errorMessage =
      payload?.error?.message ||
      "Roa could not reach the AI concierge service yet.";
    console.warn("Roa AI fallback:", errorMessage);

    return NextResponse.json(
      {
        ok: true,
        mode: "fallback",
        reply: buildRoaFallbackReply({
          latestMessage,
          suggestedListings,
          brainPlan,
        }),
        suggestedListings,
        sources: [],
        brainPlan,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "ai",
    reply:
      extractRoaOutputText(payload) ||
      buildRoaFallbackReply({ latestMessage, suggestedListings, brainPlan }),
    suggestedListings,
    sources: extractRoaSources(payload),
    brainPlan,
  });
}
