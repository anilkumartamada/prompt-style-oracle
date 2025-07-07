import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Save, Copy, Loader2, Sparkles, Building, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseCase {
  prompt: string;
}

interface UseCaseResponse {
  usecases: UseCase[];
}

const UseCaseGenerator = () => {
  const [department, setDepartment] = useState('');
  const [task, setTask] = useState('');
  const [usecases, setUsecases] = useState<UseCase[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const departmentOptions = [
    'Marketing',
    'Human Resources',
    'Finance',  
    'Operations',
    'Information Technology',
    'Sales',
    'Customer Service',
    'Product Management',
    'Engineering',
    'Legal',
    'Procurement',
    'Research & Development'
  ];

  const generateUseCases = async () => {
    if (!department.trim() || !task.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both department and task description.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-usecases', {
        body: { department: department.trim(), task: task.trim() }
      });

      if (error) throw error;

      const response = data as UseCaseResponse;
      setUsecases(response.usecases || []);

      toast({
        title: "AI Prompts Generated!",
        description: `Generated ${response.usecases?.length || 0} AI prompt ideas for ${department}.`,
      });
    } catch (error) {
      console.error('Error generating use cases:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Generation Failed",
        description: `Failed to generate use cases: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveUseCases = async () => {
    if (!user || usecases.length === 0) return;

    setIsSaving(true);
    try {
      const usecasesText = usecases.map((usecase, index) => 
        `${index + 1}. ${usecase.prompt}`
      ).join('\n');

      const { error } = await supabase
        .from('usecase_generations')
        .insert({
          user_id: user.id,
          department,
          task,
          generated_usecases: usecasesText,
          title: `${department} - AI Prompts`
        });

      if (error) throw error;

      toast({
        title: "Saved Successfully",
        description: "Your AI prompts have been saved to your history.",
      });
    } catch (error) {
      console.error('Error saving use cases:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save AI prompts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "AI prompt copied to clipboard.",
    });
  };

  const copyAllUseCases = () => {
    const allUseCases = usecases.map((usecase, index) => 
      `${index + 1}. ${usecase.prompt}`
    ).join('\n');
    
    navigator.clipboard.writeText(allUseCases);
    toast({
      title: "All Prompts Copied!",
      description: "All AI prompts have been copied to clipboard.",
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gradient-to-r from-primary to-primary-glow">
            <Lightbulb className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            AI Prompt Generator
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Generate actionable AI prompts tailored to your department's specific challenges
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Department & Task Details
            </CardTitle>
            <CardDescription>
              Describe your department and the specific challenge to get actionable AI prompts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="department" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Department
              </Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your department..." />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Task or Challenge Description
              </Label>
              <Textarea
                id="task"
                placeholder="Describe the specific task or challenge you want to solve with AI. Keep it concise to get focused prompt suggestions..."
                value={task}
                onChange={(e) => setTask(e.target.value)}
                rows={4}
              />
            </div>

            <Button 
              onClick={generateUseCases}
              disabled={isGenerating || !department.trim() || !task.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating AI Solutions...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Prompts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Display */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generated AI Prompts
              {usecases.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {usecases.length} prompt{usecases.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Actionable AI prompts for your department
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usecases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="p-4 rounded-full bg-muted/30">
                  <Lightbulb className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground">No AI Prompts Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your department and task details, then click "Generate AI Prompts" to get actionable ideas
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={saveUseCases}
                    disabled={isSaving}
                    variant="outline"
                    size="sm"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save to History
                  </Button>
                  <Button
                    onClick={copyAllUseCases}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy All
                  </Button>
                </div>

                <Separator />

                {/* AI Prompts List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {usecases.map((usecase, index) => (
                    <div key={index} className="p-4 border border-border/50 rounded-lg flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge variant="outline" className="text-xs font-mono">
                          #{index + 1}
                        </Badge>
                        <p className="font-medium text-foreground">{usecase.prompt}</p>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(usecase.prompt)}
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UseCaseGenerator;