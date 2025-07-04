import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluationRequest {
  prompt: string;
  selectedTechnique: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, selectedTechnique }: EvaluationRequest = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert in prompt engineering and AI prompting techniques. Your task is to evaluate whether a given prompt matches the selected prompting technique.

Prompting Techniques:
1. One-shot: Contains exactly one example to guide the model
2. Few-shot: Contains multiple (2+) examples to guide the model  
3. Chain-of-Thought: Shows step-by-step reasoning or asks for reasoning steps

Evaluation Criteria:
- Count the number of examples in the prompt
- Check if examples are relevant and consistent with the task
- Determine if the style matches the selected technique
- For Chain-of-Thought: Look for step-by-step reasoning or requests for reasoning

Response Format:
{
  "match": "Yes" or "No", 
  "reason": "Detailed explanation mentioning number of examples, their relevance, and logic used",
  "rating": "X/10 with brief explanation"
}`;

    const userPrompt = `Evaluate this prompt for the "${selectedTechnique}" technique:

PROMPT TO EVALUATE:
"""
${prompt}
"""

SELECTED TECHNIQUE: ${selectedTechnique}

Please analyze and provide your evaluation in the exact JSON format specified.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    // Try to parse the JSON response
    let evaluation;
    try {
      evaluation = JSON.parse(result);
    } catch (parseError) {
      // If JSON parsing fails, create a fallback response
      evaluation = {
        match: "Unable to determine",
        reason: "The AI response could not be parsed properly. Raw response: " + result,
        rating: "N/A"
      };
    }

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in evaluate-prompt function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        match: "Error",
        reason: "An error occurred during evaluation: " + error.message,
        rating: "N/A"
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});