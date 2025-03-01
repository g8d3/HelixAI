import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Loader2 } from "lucide-react";

//const MODELS = [  //Removed hardcoded models
//  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", cost: 5 },
//  { id: "gpt-4", name: "GPT-4", cost: 20 },
//  { id: "claude-2", name: "Claude 2", cost: 15 },
//  { id: "palm-2", name: "PaLM 2", cost: 10 },
//];

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(""); // Initialize model to empty string
  const [response, setResponse] = useState("");

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ["/api/models"],
  });

  const queryMutation = useMutation({
    mutationFn: async (data: { prompt: string; model: string }) => {
      const res = await apiRequest("POST", "/api/query", data);
      return res.json();
    },
    onSuccess: (data) => {
      setResponse(data.response);
      toast({
        title: "Query processed",
        description: `Cost: ${data.cost} credits. Remaining: ${data.remainingCredits}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Query failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">OpenRouter</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            {user?.isAdmin && (
              <Link href="/admin">
                <Button variant="outline">Admin</Button>
              </Link>
            )}
            <div className="text-sm">Credits: {user?.credits}</div>
            <Button
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Test AI Models</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Select
                value={model}
                onValueChange={setModel}
                disabled={modelsLoading} // Disable select while loading
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models?.map((m: any) => ( //Type assertion needed here.  Adjust as needed based on the actual data shape from /api/models
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.cost} credits)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              onClick={() => queryMutation.mutate({ prompt, model })}
              disabled={queryMutation.isPending || !prompt || !model || modelsLoading} //Disable button while loading or no model selected.
              className="w-full"
            >
              {queryMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Submit Query
            </Button>

            {response && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap">{response}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}