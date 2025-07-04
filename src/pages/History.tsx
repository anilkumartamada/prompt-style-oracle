import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { History, Search, Trash2, Eye, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PromptEvaluation {
  id: string;
  title: string | null;
  prompt_text: string;
  selected_technique: string;
  evaluation_match: string;
  evaluation_reason: string;
  evaluation_rating: string;
  created_at: string;
}

const HistoryPage = () => {
  const [evaluations, setEvaluations] = useState<PromptEvaluation[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<PromptEvaluation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<PromptEvaluation | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchEvaluations();
    }
  }, [user]);

  useEffect(() => {
    // Filter evaluations based on search query
    const filtered = evaluations.filter(evaluation =>
      evaluation.prompt_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.selected_technique.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evaluation.title && evaluation.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredEvaluations(filtered);
  }, [evaluations, searchQuery]);

  const fetchEvaluations = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_evaluations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      toast({
        title: "Error",
        description: "Failed to load evaluation history.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEvaluation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prompt_evaluations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setEvaluations(prev => prev.filter(evaluation => evaluation.id !== id));
      setSelectedEvaluation(null);
      
      toast({
        title: "Deleted",
        description: "Evaluation has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      toast({
        title: "Error",
        description: "Failed to delete evaluation.",
        variant: "destructive"
      });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-8">
        <div className="max-w-6xl mx-auto flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Evaluation History</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage your past prompt evaluations
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search evaluations by prompt text, technique, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Evaluations List */}
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Your Evaluations ({filteredEvaluations.length})
              </CardTitle>
              <CardDescription>
                Click on any evaluation to view details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredEvaluations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {evaluations.length === 0 ? (
                    <p>No evaluations yet. Create your first evaluation!</p>
                  ) : (
                    <p>No evaluations match your search query.</p>
                  )}
                </div>
              ) : (
                filteredEvaluations.map((evaluation) => (
                  <div key={evaluation.id} className="p-4 border border-border/50 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div onClick={() => setSelectedEvaluation(evaluation)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">
                            {evaluation.title || `${evaluation.selected_technique} Evaluation`}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {evaluation.prompt_text}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant={getMatchColor(evaluation.evaluation_match) as any} className="text-xs">
                            {evaluation.evaluation_match}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {formatDate(evaluation.created_at)}
                        </div>
                        <Badge variant={getRatingColor(evaluation.evaluation_rating) as any} className="text-xs">
                          {evaluation.evaluation_rating}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Evaluation Details */}
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Evaluation Details
              </CardTitle>
              <CardDescription>
                Select an evaluation to view full details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedEvaluation ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {selectedEvaluation.title || `${selectedEvaluation.selected_technique} Evaluation`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Created on {formatDate(selectedEvaluation.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteEvaluation(selectedEvaluation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Technique */}
                  <div>
                    <h4 className="font-medium mb-2">Selected Technique</h4>
                    <Badge variant="outline" className="capitalize">
                      {selectedEvaluation.selected_technique.replace('-', ' ')}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Prompt */}
                  <div>
                    <h4 className="font-medium mb-2">Original Prompt</h4>
                    <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                      <p className="text-sm whitespace-pre-wrap">{selectedEvaluation.prompt_text}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Results */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Match Result</h4>
                      <Badge variant={getMatchColor(selectedEvaluation.evaluation_match) as any}>
                        {selectedEvaluation.evaluation_match}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Analysis & Reasoning</h4>
                      <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                        <p className="text-sm">{selectedEvaluation.evaluation_reason}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Rating</h4>
                      <Badge variant={getRatingColor(selectedEvaluation.evaluation_rating) as any} className="text-lg px-4 py-2">
                        {selectedEvaluation.evaluation_rating}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="p-4 rounded-full bg-muted/30">
                    <Eye className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-muted-foreground">No Evaluation Selected</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose an evaluation from the list to view its details
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;