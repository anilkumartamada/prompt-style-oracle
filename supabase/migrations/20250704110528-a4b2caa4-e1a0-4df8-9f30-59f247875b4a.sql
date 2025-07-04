-- Create usecase_generations table
CREATE TABLE public.usecase_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  department TEXT NOT NULL,
  task TEXT NOT NULL,
  generated_usecases TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.usecase_generations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own usecase generations" 
ON public.usecase_generations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own usecase generations" 
ON public.usecase_generations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usecase generations" 
ON public.usecase_generations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own usecase generations" 
ON public.usecase_generations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_usecase_generations_updated_at
BEFORE UPDATE ON public.usecase_generations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();