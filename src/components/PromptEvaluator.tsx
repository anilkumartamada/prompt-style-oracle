import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Sparkles, Target, TrendingUp, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EvaluationResult {
  match: string;
  reason: string;
  rating: string;
}

const PromptEvaluator = () => {
  const [prompt, setPrompt] = useState('');
  const [technique, setTechnique] = useState('');
  const [title, setTitle] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const techniques = [
    { value: 'one-shot', label: 'One-shot', description: 'Single example provided' },
    { value: 'few-shot', label: 'Few-shot', description: 'Multiple examples provided' },
    { value: 'chain-of-thought', label: 'Chain-of-Thought', description: 'Step-by-step reasoning' }
  ];

  const handleEvaluate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt to evaluate.",
        variant: "destructive"
      });
      return;
    }

    if (!technique) {
      toast({
        title: "Error", 
        description: "Please select a prompting technique.",
        variant: "destructive"
      });
      return;
    }

    setIsEvaluating(true);
    setEvaluation(null);

    try {
      const { data, error } = await supabase.functions.invoke('evaluate-prompt', {
        body: { 
          prompt: prompt.trim(),
          selectedTechnique: technique
        }
      });

      if (error) {
        throw error;
      }

      setEvaluation(data);
      // Automatically save to database after successful evaluation
      await saveEvaluation(data);
      
      toast({
        title: "Evaluation Complete",
        description: "Your prompt has been analyzed and saved successfully!",
        variant: "default"
      });
    } catch (error) {
      console.error('Error evaluating prompt:', error);
      toast({
        title: "Evaluation Failed",
        description: "Failed to evaluate the prompt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const saveEvaluation = async (evaluationData: EvaluationResult) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('prompt_evaluations')
        .insert({
          user_id: user.id,
          title: title.trim() || null,
          prompt_text: prompt.trim(),
          selected_technique: technique,
          evaluation_match: evaluationData.match,
          evaluation_reason: evaluationData.reason,
          evaluation_rating: evaluationData.rating
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast({
        title: "Save Failed",
        description: "Evaluation completed but failed to save to your history.",
        variant: "destructive"
      });
    }
  };

  const handleManualSave = async () => {
    if (!evaluation || !user) return;
    
    setIsSaving(true);
    try {
      await saveEvaluation(evaluation);
      toast({
        title: "Saved",
        description: "Evaluation saved to your history successfully!",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save evaluation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getMatchColor = (match: string) => {
    if (match.toLowerCase().includes('yes')) return 'success';
    if (match.toLowerCase().includes('no')) return 'destructive';
    return 'secondary';
  };

  const getRatingColor = (rating: string) => {
    const score = parseInt(rating.split('/')[0]);
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'destructive';
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-primary to-primary-glow">
              <Brain className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Prompt Style Oracle
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Analyze your AI prompts and discover how well they align with your chosen prompting technique
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="shadow-[var(--shadow-card)] border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Prompt Input
                  </CardTitle>
                  <CardDescription>
                    Enter your prompt and select the intended technique
                  </CardDescription>
                </div>
                
                {/* Technique Selector */}
                <div className="space-y-2">
                  <Label htmlFor="technique" className="text-sm font-medium">
                    Prompting Style
                  </Label>
                  <Select value={technique} onValueChange={setTechnique}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select technique" />
                    </SelectTrigger>
                    <SelectContent>
                      {techniques.map((tech) => (
                        <SelectItem key={tech.value} value={tech.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{tech.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {tech.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Evaluation Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="Give your evaluation a memorable name..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prompt">Write your AI prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter your prompt here... For example: 'Translate the following to French: Hello, how are you?'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[200px] resize-y"
                />
              </div>
              
              <Button 
                onClick={handleEvaluate}
                disabled={isEvaluating || !prompt.trim() || !technique}
                className="w-full"
                variant="gradient"
                size="lg"
              >
                {isEvaluating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    Evaluate Prompt
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="shadow-[var(--shadow-card)] border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Evaluation Results
              </CardTitle>
              <CardDescription>
                AI-powered analysis of your prompt alignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {evaluation ? (
                <div className="space-y-6">
                  {/* Match Result */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Does the prompt match?</Label>
                    <Badge 
                      variant={getMatchColor(evaluation.match) as any}
                      className="text-sm px-3 py-1"
                    >
                      {evaluation.match}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Reasoning */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Analysis & Reasoning</Label>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-sm leading-relaxed">{evaluation.reason}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Rating */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Prompt Rating</Label>
                    <Badge 
                      variant={getRatingColor(evaluation.rating) as any}
                      className="text-lg px-4 py-2 font-bold"
                    >
                      {evaluation.rating}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Save Button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={handleManualSave}
                      disabled={isSaving}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save to History
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="p-4 rounded-full bg-muted/30">
                    <Brain className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-muted-foreground">Ready to Analyze</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your prompt and select a technique to get started
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {techniques.map((tech, index) => (
            <Card key={tech.value} className="border-border/50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-primary">{tech.label}</h4>
                  <p className="text-sm text-muted-foreground">{tech.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptEvaluator;