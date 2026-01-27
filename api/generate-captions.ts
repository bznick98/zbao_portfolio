const OPENAI_API_URL = 'https://api.openai.com/v1/completions';
const OPENAI_MODEL = 'gpt-3.5-turbo-instruct';

type RequestBody = {
  descriptions?: string[];
};

type ResponseBody = {
  titles: string[];
  error?: string;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ titles: [], error: 'Method not allowed' } satisfies ResponseBody);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ titles: [], error: 'Missing OPENAI_API_KEY' } satisfies ResponseBody);
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as RequestBody);
  const descriptions = Array.isArray(body?.descriptions) ? body.descriptions.filter(Boolean) : [];

  if (descriptions.length === 0) {
    res.status(400).json({ titles: [], error: 'No descriptions provided' } satisfies ResponseBody);
    return;
  }

  const prompt = `
You are a poet.
Generate ${descriptions.length} short abstract, poetic titles (max 6 words each).
Make them elegant, creative, and with a focus on the main image subject.
Return JSON with shape: {"titles":["...","..."]} in the same order as this list.
Descriptions: ${JSON.stringify(descriptions)}
  `.trim();

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        prompt,
        max_tokens: 160,
        temperature: 0.85,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(502).json({ titles: [], error: errorText || 'OpenAI request failed' } satisfies ResponseBody);
      return;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.text?.trim();
    if (!content) {
      res.status(502).json({ titles: [], error: 'Empty response from OpenAI' } satisfies ResponseBody);
      return;
    }

    const parsed = JSON.parse(content);
    const titles = Array.isArray(parsed?.titles) ? parsed.titles.filter(Boolean) : [];
    res.status(200).json({ titles } satisfies ResponseBody);
  } catch (error) {
    res.status(500).json({
      titles: [],
      error: error instanceof Error ? error.message : 'Unexpected error'
    } satisfies ResponseBody);
  }
}
