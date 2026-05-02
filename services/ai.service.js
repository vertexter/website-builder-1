const { getEnv } = require("../utils/env");

async function callOpenAI(system, userPrompt, jsonSchemaHint) {
  const env = getEnv();
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.openAiModel,
      input: [
        { role: "system", content: [{ type: "text", text: system }] },
        { role: "user", content: [{ type: "text", text: `${userPrompt}\nReturn JSON only. Schema: ${jsonSchemaHint}` }] }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI failure: ${JSON.stringify(data)}`);
  const text = data.output_text || "";
  return JSON.parse(text);
}

module.exports = { callOpenAI };
