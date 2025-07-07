import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UseCaseRequest {
  department: string;
  task: string;
}

interface UseCase {
  prompt: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Generate-usecases function started');
    const { department, task }: UseCaseRequest = await req.json();
    console.log(`📝 Request: Department="${department}", Task="${task}"`);

    if (!geminiApiKey) {
      console.error('❌ Gemini API key not configured');
      throw new Error('Gemini API key not configured');
    }
    console.log('✅ Gemini API key is configured');

    // Department-specific context to guide AI generation  
    const departmentContext = {
      'marketing': 'Marketing departments focus on customer acquisition, engagement, campaign optimization, content creation, social media management, lead generation, brand awareness, and data-driven decision making.',
      'human resources': 'HR departments handle recruitment, employee engagement, performance management, training, compliance, payroll, benefits administration, and organizational development.',
      'finance': 'Finance departments manage budgeting, forecasting, expense tracking, financial reporting, compliance, accounts payable/receivable, and risk management.',
      'operations': 'Operations departments oversee process optimization, supply chain management, quality control, resource allocation, project management, and operational efficiency.',
      'it': 'IT departments handle system administration, cybersecurity, software development, infrastructure management, technical support, and digital transformation.',
      'sales': 'Sales departments focus on lead conversion, customer relationship management, sales forecasting, pipeline management, territory planning, and revenue growth.',
      'customer service': 'Customer service departments handle support ticket management, customer satisfaction, issue resolution, communication management, and service quality improvement.'
    };

    const deptKey = department.toLowerCase();
    const deptContext = departmentContext[deptKey] || departmentContext[Object.keys(departmentContext).find(key => deptKey.includes(key))] || 'This department focuses on core business operations and workflows.';

    const fullPrompt = `You are an AI prompt generator specializing in creating concise, actionable AI use case prompts for different departments.

DEPARTMENT CONTEXT: ${department}
${deptContext}

SPECIFIC CHALLENGE: ${task}

INSTRUCTIONS:
Generate 3-5 short, actionable AI use case prompts that directly address the challenge for ${department}. Each prompt should be:
- A single, clear action statement (10-15 words maximum)
- Start with action verbs like "Create", "Build", "Develop", "Implement", "Design"
- Specific to ${department} workflows and challenges
- Immediately understandable and actionable
- Professional and business-appropriate

Examples of good prompts:
- "Create an AI chatbot to automate customer support inquiries"
- "Build a predictive analytics system for inventory management"
- "Develop automated email response templates using NLP"

RESPONSE FORMAT (JSON only, no other text):
{
  "usecases": [
    {
      "prompt": "Action-oriented AI use case prompt for ${department}"
    }
  ]
}`;

    console.log('🔄 Making request to Gemini API...');
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
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      }),
    });

    console.log(`📡 Gemini API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Received response from Gemini API');
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('❌ Invalid response structure from Gemini API:', data);
      throw new Error('Invalid response structure from Gemini API');
    }
    
    const result = data.candidates[0].content.parts[0].text;
    console.log(`📄 Generated content length: ${result.length} characters`);

    // Enhanced JSON response parsing with intelligent fallback
    let usecaseResponse;
    try {
      // Enhanced cleaning for various AI response formats
      let cleanedResult = result
        .replace(/```(?:json|JSON)?\n?/g, '') // Remove code blocks
        .replace(/\n?```/g, '')               // Remove closing code blocks
        .replace(/^[^{]*\{/g, '{')            // Remove text before first {
        .replace(/\}[^}]*$/g, '}')            // Remove text after last }
        .trim();
      
      usecaseResponse = JSON.parse(cleanedResult);
      console.log('Successfully parsed JSON response');
    } catch (parseError) {
      console.log('JSON parsing failed, attempting intelligent extraction:', parseError);
      console.log('Raw response:', result);
      
      // Intelligent fallback: extract use cases from raw text
      const usecases = [];
      
      // Try to extract prompts from the text
      const promptPatterns = [
        /(?:create|build|develop|implement|design)\s+[^.\n]+/gi,
        /\d+\.\s*([^\n]+)/gi,
        /-\s*([^\n]+)/gi
      ];
      
      let extractedUseCases = [];
      for (const pattern of promptPatterns) {
        const matches = [...result.matchAll(pattern)];
        if (matches.length > 0) {
          extractedUseCases = matches.map(match => ({
            prompt: match[0]?.trim() || match[1]?.trim() || "Create an AI solution"
          }));
          break;
        }
      }
      
      // If no structured extraction worked, create a general response
      if (extractedUseCases.length === 0) {
        extractedUseCases = [{
          prompt: "Create an AI solution for your department"
        }];
      }
      
      usecaseResponse = {
        usecases: extractedUseCases.slice(0, 5) // Limit to 5 use cases
      };
      
      console.log('Extracted use cases using fallback method:', usecaseResponse);
    }

    // Ensure the response has the expected structure
    if (!usecaseResponse.usecases || !Array.isArray(usecaseResponse.usecases)) {
      usecaseResponse = {
        usecases: [{
          prompt: "Create an AI solution for your department"
        }]
      };
    }

    return new Response(JSON.stringify(usecaseResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-usecases function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        usecases: [{
          prompt: "Error generating use cases - please try again"
        }]
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});