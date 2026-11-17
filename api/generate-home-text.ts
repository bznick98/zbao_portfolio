const OPENAI_API_URL = 'https://api.openai.com/v1/completions';
const OPENAI_MODEL = 'gpt-3.5-turbo-instruct';

type TextBlockInput = {
  id: string;
  fallbackContent?: string;
  fallbackCaption?: string;
};

type RequestBody = {
  textBlocks?: TextBlockInput[];
  browserContext?: {
    locale?: string;
    timeZone?: string;
    platform?: string;
    viewport?: string;
    colorScheme?: string;
    localTime?: string;
  };
};

type GeneratedText = {
  id: string;
  content: string;
  caption?: string;
};

type ResponseBody = {
  texts: GeneratedText[];
  error?: string;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ texts: [], error: 'Method not allowed' } satisfies ResponseBody);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ texts: [], error: 'Missing OPENAI_API_KEY' } satisfies ResponseBody);
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as RequestBody);
  const textBlocks = Array.isArray(body?.textBlocks)
    ? body.textBlocks.filter((item): item is TextBlockInput => typeof item?.id === 'string')
    : [];

  if (textBlocks.length === 0) {
    res.status(400).json({ texts: [], error: 'No text blocks provided' } satisfies ResponseBody);
    return;
  }

  const browserContext = body?.browserContext || {};

  const prompt = `
You are a poet writing homepage text for artist-engineer Zongnan Bao.
Generate ${textBlocks.length} abstract poetic text pairs inspired by nature and art.
Each item must contain:
- "id" copied exactly from input
- "content": one short poetic sentence, 2-8 words, title style.
- "caption": one reflective line, 2-7 words.

Use this audience context to subtly influence tone and imagery:
${JSON.stringify(browserContext)}

Reference the creator context subtly (technology + visual art + music), but avoid direct biography dumps.
Keep language elegant and evocative, not literal.
Return valid JSON only with shape: {"texts":[{"id":"...","content":"...","caption":"..."}]}
Input blocks: ${JSON.stringify(textBlocks)}
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
        max_tokens: 260,
        temperature: 0.9,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(502).json({ texts: [], error: errorText || 'OpenAI request failed' } satisfies ResponseBody);
      return;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.text?.trim();
    if (!content) {
      res.status(502).json({ texts: [], error: 'Empty response from OpenAI' } satisfies ResponseBody);
      return;
    }

    const parsed = JSON.parse(content);
    const texts = Array.isArray(parsed?.texts)
      ? parsed.texts
          .filter((item: any) => typeof item?.id === 'string' && typeof item?.content === 'string')
          .map((item: any) => ({
            id: item.id,
            content: item.content,
            caption: typeof item.caption === 'string' ? item.caption : undefined
          }))
      : [];

    res.status(200).json({ texts } satisfies ResponseBody);
  } catch (error) {
    res.status(500).json({
      texts: [],
      error: error instanceof Error ? error.message : 'Unexpected error'
    } satisfies ResponseBody);
  }
}
