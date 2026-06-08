import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGeminiRoaRequestBody,
  buildRoaHandoffSummary,
  buildRoaBrainPlan,
  buildRoaBrainReply,
  buildRoaFallbackReply,
  buildRoaInstructions,
  buildRoaPlanActions,
  buildRoaPromptInput,
  deriveRoaPreferencesFromMessage,
  detectRoaIntent,
  extractGeminiOutputText,
  extractRoaOutputText,
  extractRoaSources,
  getRoaReadyListings,
  getRoaSuggestedListings,
  normalizeRoaMessages,
} from "./roa-concierge.ts";

const listings = [
  {
    id: "private-boat",
    title: "Private Sunset Boat",
    category: "Private Charters",
    location: "West End",
    description: "Luxury private sunset charter with snorkeling.",
    price: 325,
    rating: 5,
    reviews_count: 9,
    tour_times: ["4:30 PM"],
    max_guests: 6,
  },
  {
    id: "airport-transfer",
    title: "Airport Transfer",
    category: "Transport",
    location: "Roatan Airport",
    description: "Airport pickup and luggage friendly transfer.",
    price: 45,
    rating: 4.7,
    reviews_count: 4,
    tour_times: ["Any time"],
    max_guests: 5,
  },
];

test("derives concierge preferences from natural guest language", () => {
  assert.deepEqual(
    deriveRoaPreferencesFromMessage(
      "We are 4 guests arriving at the airport and want something private.",
    ),
    {
      arrivalType: "Airport",
      pickupArea: "Roatan Airport",
      tripStyle: "Luxury",
      budget: "Luxury",
      guests: "4",
      interests: ["airport", "private"],
    },
  );
});

test("builds a prompt with Roa identity, traveler context, and listings", () => {
  const prompt = buildRoaPromptInput({
    messages: [{ role: "user", content: "Plan a private sunset day." }],
    listings,
    traveler: { name: "K", guests: "2" },
  });

  assert.match(prompt, /Traveler context/);
  assert.match(prompt, /Private Sunset Boat/);
  assert.match(prompt, /Guest: Plan a private sunset day/);
});

test("keeps Roa messages small and valid", () => {
  const messages = normalizeRoaMessages([
    { role: "assistant", content: "" },
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
  ]);

  assert.deepEqual(messages, [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
  ]);
});

test("suggests local marketplace listings", () => {
  const suggestions = getRoaSuggestedListings({
    listings,
    latestMessage: "I want a luxury private sunset charter",
  });

  assert.equal(suggestions[0].id, "private-boat");
  assert.equal(suggestions[0].title, "Private Sunset Boat");
});

test("builds a structured Roa Brain cruise plan", () => {
  const suggestedListings = getRoaSuggestedListings({
    listings,
    latestMessage: "We are cruise guests and need to get back to the ship.",
    traveler: {
      tripDate: "2026-07-10",
      guests: "4",
      pickupArea: "Coxen Hole",
      arrivalType: "Cruise",
    },
  });
  const plan = buildRoaBrainPlan({
    latestMessage: "We are cruise guests and need to get back to the ship.",
    traveler: {
      tripDate: "2026-07-10",
      guests: "4",
      pickupArea: "Coxen Hole",
      arrivalType: "Cruise",
    },
    suggestedListings,
  });

  assert.equal(detectRoaIntent("cruise ship day"), "cruise_day");
  assert.equal(plan.intent, "cruise_day");
  assert.equal(plan.missingDetails.length, 0);
  assert.match(plan.timingNotes.join(" "), /all-aboard|return/i);
  assert.match(buildRoaBrainReply(plan), /Cruise day/i);
});

test("builds premium plan actions from Roa Brain context", () => {
  const suggestedListings = getRoaSuggestedListings({
    listings,
    latestMessage: "Plan a private sunset charter for 2 guests.",
    traveler: {
      name: "K",
      email: "k@example.com",
      tripDate: "2026-07-10",
      guests: "2",
      pickupArea: "West End",
      arrivalType: "Staying on island",
    },
  });
  const plan = buildRoaBrainPlan({
    latestMessage: "Plan a private sunset charter for 2 guests.",
    traveler: {
      name: "K",
      email: "k@example.com",
      tripDate: "2026-07-10",
      guests: "2",
      pickupArea: "West End",
      arrivalType: "Staying on island",
    },
    suggestedListings,
  });
  const actions = buildRoaPlanActions({
    plan,
    suggestedListings,
    traveler: { name: "K", email: "k@example.com" },
  });

  assert.equal(actions[0].key, "save");
  assert.equal(actions[1].label, "Send to concierge");
  assert.equal(actions[2].href, "/map");
  assert.equal(actions[3].href, "/book?listing=private-boat");
});

test("builds a concierge handoff summary with guest basics and matches", () => {
  const suggestedListings = getRoaSuggestedListings({
    listings,
    latestMessage: "Airport pickup for 4 guests",
    traveler: {
      name: "Keddie",
      email: "k@example.com",
      tripDate: "2026-07-10",
      guests: "4",
      pickupArea: "Roatan Airport",
      arrivalType: "Airport",
    },
  });
  const plan = buildRoaBrainPlan({
    latestMessage: "Airport pickup for 4 guests",
    traveler: {
      name: "Keddie",
      email: "k@example.com",
      tripDate: "2026-07-10",
      guests: "4",
      pickupArea: "Roatan Airport",
      arrivalType: "Airport",
    },
    suggestedListings,
  });
  const summary = buildRoaHandoffSummary({
    messages: [
      { role: "assistant", content: "I can help." },
      { role: "user", content: "Airport pickup for 4 guests" },
    ],
    traveler: {
      name: "Keddie",
      email: "k@example.com",
      tripDate: "2026-07-10",
      guests: "4",
      pickupArea: "Roatan Airport",
      arrivalType: "Airport",
    },
    brainPlan: plan,
    suggestedListings,
  });

  assert.match(summary, /Roa Concierge Pro handoff/);
  assert.match(summary, /Name: Keddie/);
  assert.match(summary, /Airport pickup and soft first-day plan/);
  assert.match(summary, /Airport Transfer/);
  assert.match(summary, /Guest: Airport pickup for 4 guests/);
});

test("captures missing details for concierge review", () => {
  const plan = buildRoaBrainPlan({
    latestMessage: "Plan a private charter",
    traveler: {},
    suggestedListings: [],
  });

  assert.equal(plan.intent, "private_charter");
  assert.equal(plan.confidenceLabel, "Needs concierge review");
  assert.deepEqual(plan.missingDetails.slice(0, 2), [
    "Trip date",
    "Guest count",
  ]);
});

test("filters rough test listings out of Roa recommendations", () => {
  const ready = getRoaReadyListings([
    ...listings,
    {
      id: "test",
      title: "t4",
      category: "Tours",
      location: "16°21'17.1\"N 86°27'15.0\"W",
      description: "test",
      price: 999975,
      rating: 5,
      reviews_count: 0,
      tour_times: [],
      max_guests: null,
    },
    {
      id: "money",
      title: "Show me the money",
      category: "Tours",
      location: "Brooksie",
      description: "Money",
      price: 100000,
      rating: 5,
      reviews_count: 0,
      tour_times: [],
      max_guests: null,
    },
  ]);

  assert.deepEqual(
    ready.map((listing) => listing.id),
    ["private-boat", "airport-transfer"],
  );
});

test("extracts output text and citations from OpenAI responses", () => {
  const response = {
    output: [
      {
        content: [
          {
            text: "Here is a plan.",
            annotations: [
              {
                type: "url_citation",
                title: "Roatan guide",
                url: "https://example.com/roatan",
              },
            ],
          },
        ],
      },
    ],
  };

  assert.equal(extractRoaOutputText(response), "Here is a plan.");
  assert.deepEqual(extractRoaSources(response), [
    { title: "Roatan guide", url: "https://example.com/roatan" },
  ]);
});

test("builds and parses Gemini Roa requests", () => {
  const requestBody = buildGeminiRoaRequestBody({
    instructions: "You are Roa.",
    prompt: "Plan a day.",
  });

  assert.match(requestBody.contents[0].parts[0].text, /You are Roa/);
  assert.equal(requestBody.generationConfig.temperature, 0.35);
  assert.equal(
    extractGeminiOutputText({
      candidates: [
        {
          content: {
            parts: [{ text: "Gemini plan." }],
          },
        },
      ],
    }),
    "Gemini plan.",
  );
});

test("builds clear setup fallback when the AI key is missing", () => {
  assert.match(
    buildRoaFallbackReply({
      latestMessage: "OpenAI API key error",
      suggestedListings: [],
    }),
    /OPENAI_API_KEY/,
  );

  assert.match(
    buildRoaInstructions({ listingCount: 2, webSearchEnabled: true }),
    /Your Personal Roatan Concierge/,
  );
});
