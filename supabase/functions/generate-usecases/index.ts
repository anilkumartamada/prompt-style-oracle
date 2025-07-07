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

    const fullPrompt = `You are an expert AI solutions consultant specializing in department-specific automation and digital transformation. Your mission is to generate practical, actionable AI use cases tailored to specific departmental needs and challenges.

DEPARTMENT CONTEXT: ${department}
${deptContext}

SPECIFIC CHALLENGE: ${task}

INSTRUCTIONS:
Generate 3-5 detailed, department-specific AI use case solutions that directly address the challenge described. Each use case must be:
- Highly relevant to ${department} workflows and responsibilities
- Practically implementable with current AI technologies
- Directly solving or improving the specific challenge mentioned
- Detailed enough to be actionable for decision-makers

For each use case, provide:
1. TITLE: Clear, role-specific name (e.g., "AI-Powered ${department} Solution for...")
2. DESCRIPTION: Detailed explanation of the AI solution, specific technologies involved, and how it addresses the challenge
3. BENEFITS: Concrete improvements, metrics, and value proposition
4. IMPLEMENTATION: Practical steps, timeline, and resources needed

RESPONSE FORMAT (JSON only, no other text):
{
  "usecases": [
    {
      "title": "Specific AI solution title for ${department}",
      "description": "Comprehensive explanation of the AI solution, including specific technologies (NLP, ML, computer vision, etc.), how it integrates with existing workflows, and how it directly solves the stated challenge",
      "benefits": "Quantifiable benefits such as time savings, cost reduction, accuracy improvements, efficiency gains, and specific KPIs that will be impacted",
      "implementation": "Step-by-step implementation approach, estimated timeline, required resources, potential challenges, and success metrics"
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
          maxOutputTokens: 1500,
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
      
      // Try to extract structured use cases from the text
      const usecasePatterns = [
        /(?:use case|solution|idea)\s*\d*[:.]\s*([^\n]+)\n([^]*?)(?=(?:use case|solution|idea)\s*\d*[:.])|\n\n|$/gi,
        /\d+\.\s*([^\n]+)\n([^]*?)(?=\d+\.|$)/gi,
        /-\s*([^\n]+)\n([^]*?)(?=-\s*|$)/gi
      ];
      
      let extractedUseCases = [];
      for (const pattern of usecasePatterns) {
        const matches = [...result.matchAll(pattern)];
        if (matches.length > 0) {
          extractedUseCases = matches.map(match => ({
            title: match[1]?.trim() || "AI Solution",
            description: match[2]?.trim() || "AI-powered solution for the described challenge",
            benefits: "Improved efficiency and automation",
            implementation: "Can be implemented using modern AI technologies"
          }));
          break;
        }
      }
      
      // If no structured extraction worked, create a general response
      if (extractedUseCases.length === 0) {
        extractedUseCases = [{
          title: "AI-Powered Solution",
          // description: result.slice(0, 500) + "...",
          // benefits: "Enhanced productivity and automation",
          // implementation: "Implementation details provided in the analysis"
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
          title: "AI Solution Analysis",
          // description: result,
          // benefits: "AI-powered improvements for your department",
          // implementation: "Custom implementation based on your specific needs"
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
          title: "Error in Generation",
          // description: "An error occurred while generating use cases: " + error.message,
          // benefits: "Please try again",
          // implementation: "N/A"
        }]
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});