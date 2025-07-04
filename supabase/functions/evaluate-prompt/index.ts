import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

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

    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const fullPrompt = `You are an expert in prompt engineering and AI prompting techniques. Your task is to evaluate whether a given prompt matches the selected prompting technique.

Prompting Techniques:
1. One-shot: Contains exactly one example to guide the model
2. Few-shot: Contains multiple (2+) examples to guide the model  
3. Chain-of-Thought: Shows step-by-step reasoning or asks for reasoning steps

Evaluation Criteria:
- Count the number of examples in the prompt
- Check if examples are relevant and consistent with the task
- Determine if the style matches the selected technique
- For Chain-of-Thought: Look for step-by-step reasoning or requests for reasoning

Evaluate this prompt for the "${selectedTechnique}" technique:

PROMPT TO EVALUATE:
"""
${prompt}
"""

SELECTED TECHNIQUE: ${selectedTechnique}

Please analyze and provide your evaluation in the following JSON format (return ONLY the JSON, no other text):
{
  "match": "Yes" or "No", 
  "reason": "Detailed explanation mentioning number of examples, their relevance, and logic used",
  "rating": "X/10 with brief explanation"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates[0].content.parts[0].text;

    // Enhanced JSON response parsing with intelligent fallback
    let evaluation;
    try {
      // Enhanced cleaning for various AI response formats
      let cleanedResult = result
        .replace(/```(?:json|JSON)?\n?/g, '') // Remove code blocks
        .replace(/\n?```/g, '')               // Remove closing code blocks
        .replace(/^[^{]*\{/g, '{')            // Remove text before first {
        .replace(/\}[^}]*$/g, '}')            // Remove text after last }
        .trim();
      
      evaluation = JSON.parse(cleanedResult);
      console.log('Successfully parsed JSON response');
    } catch (parseError) {
      console.log('JSON parsing failed, attempting intelligent extraction:', parseError);
      console.log('Raw response:', result);
      
      // Intelligent fallback: extract information using regex patterns
      const matchRegex = /(?:match["']?\s*:\s*["']?|does.*match[^:]*:?\s*["']?)(yes|no|partially|maybe|unclear)/i;
      const ratingRegex = /(?:rating["']?\s*:\s*["']?|score[^:]*:?\s*["']?)(\d+(?:\.\d+)?(?:\s*\/\s*10)?[^"',}\n]*)/i;
      
      const matchMatch = result.match(matchRegex);
      const ratingMatch = result.match(ratingRegex);
      
      // Extract reasoning (look for explanation text)
      let reason = result;
      // Try to find explanation/reasoning sections
      const reasonPatterns = [
        /(?:reason["']?\s*:\s*["']?)([^"'}\n]+(?:\n[^"'}\n]+)*)/i,
        /(?:explanation["']?\s*:\s*["']?)([^"'}\n]+(?:\n[^"'}\n]+)*)/i,
        /(?:analysis["']?\s*:\s*["']?)([^"'}\n]+(?:\n[^"'}\n]+)*)/i
      ];
      
      for (const pattern of reasonPatterns) {
        const reasonMatch = result.match(pattern);
        if (reasonMatch) {
          reason = reasonMatch[1].trim();
          break;
        }
      }
      
      // If no specific reason found, use the whole response but clean it up
      if (reason === result) {
        reason = result
          .replace(/```(?:json|JSON)?\n?/g, '')
          .replace(/\n?```/g, '')
          .replace(/\{[^}]*\}/g, '') // Remove JSON-like structures
          .trim();
      }
      
      evaluation = {
        match: matchMatch ? matchMatch[1].charAt(0).toUpperCase() + matchMatch[1].slice(1).toLowerCase() : "Analysis provided",
        reason: reason || "The AI provided an analysis but in an unexpected format.",
        rating: ratingMatch ? ratingMatch[1] : "See analysis for details"
      };
      
      console.log('Extracted evaluation using fallback method:', evaluation);
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