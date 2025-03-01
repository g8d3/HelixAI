import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Label } from "@/components/ui/label"; // Added import

type Model = {
  id: number;
  providerId: string;
  displayName: string;
  provider: "openai" | "anthropic" | "palm";
  cost: number;
  enabled: boolean;
  contextWindow?: number;
  maxTokens?: number;
};

type ModelFormData = {
  providerId: string;
  displayName: string;
  provider: "openai" | "anthropic" | "palm";
  cost: number;
  enabled: boolean;
  contextWindow?: number | null;
  maxTokens?: number | null;
};

const initialModelForm: ModelFormData = {
  providerId: "",
  displayName: "",
  provider: "openai",
  cost: 5000, // Updated initial cost
  enabled: true,
  contextWindow: null,
  maxTokens: null,
};

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<{
    id: number;
    credits: number;
    isAdmin: boolean;
  } | null>(null);
  const [newApiKey, setNewApiKey] = useState({
    provider: "",
    apiKey: "",
  });

  const [modelDialogOpen, setModelDialogOpen] = useState(false); // Added state
  const [editingModel, setEditingModel] = useState<Model | null>(null); // Added state
  const [modelForm, setModelForm] = useState<ModelFormData>(initialModelForm); // Added state

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: queries, isLoading: loadingQueries } = useQuery({
    queryKey: ["/api/admin/queries"],
  });

  const { data: apiKeys, isLoading: loadingApiKeys } = useQuery({
    queryKey: ["/api/admin/api-keys"],
  });

  const { data: models, isLoading: loadingModels } = useQuery({ // Added query
    queryKey: ["/api/admin/models"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User settings have been updated successfully.",
      });
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upsertApiKeyMutation = useMutation({
    mutationFn: async (data: { provider: string; apiKey: string }) => {
      const res = await apiRequest("POST", "/api/admin/api-keys", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({
        title: "API Key updated",
        description: "The API key has been saved successfully.",
      });
      setNewApiKey({ provider: "", apiKey: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateModelMutation = useMutation({ // Added mutation
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/admin/models/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/models"] });
      toast({ title: "Model updated", description: "Model settings updated." });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upsertModelMutation = useMutation({ // Added mutation
    mutationFn: async (data: UpsertModel) => {
      const method = editingModel ? "PATCH" : "POST";
      const url = editingModel ? `/api/admin/models/${editingModel.id}` : "/api/admin/models";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/models"] });
      setModelDialogOpen(false);
      setModelForm(initialModelForm);
      toast({ title: "Model saved", description: "Model successfully saved." });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncModelsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/models/sync");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/models"] });
      toast({
        title: "Models synced",
        description: "Available models have been synced from providers.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  useEffect(() => {
    if (editingModel) {
      setModelForm({
        providerId: editingModel.providerId,
        displayName: editingModel.displayName,
        provider: editingModel.provider,
        cost: editingModel.cost,
        enabled: editingModel.enabled,
        contextWindow: editingModel.contextWindow ?? null,
        maxTokens: editingModel.maxTokens ?? null,
      });
    } else {
      setModelForm(initialModelForm);
    }
  }, [editingModel]);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const startEditing = (user: any) => {
    setEditingUser({
      id: user.id,
      credits: user.credits,
      isAdmin: user.isAdmin,
    });
  };

  const saveUser = (id: number) => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id,
      data: {
        credits: parseInt(editingUser.credits.toString()),
        isAdmin: editingUser.isAdmin,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>API Provider Keys</CardTitle>
            <CardDescription>Manage API keys for AI model providers</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingApiKeys ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys?.map((key: any) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.provider}</TableCell>
                        <TableCell>{new Date(key.updatedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className="text-green-600">●</span> Active
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Add/Update API Key</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configure API Key</DialogTitle>
                      <DialogDescription>
                        Add or update an API key for an AI model provider
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Select
                        value={newApiKey.provider}
                        onValueChange={(value) =>
                          setNewApiKey({ ...newApiKey, provider: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="palm">Google PaLM</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Enter API key"
                        type="password"
                        value={newApiKey.apiKey}
                        onChange={(e) =>
                          setNewApiKey({ ...newApiKey, apiKey: e.target.value })
                        }
                      />
                      <Button
                        onClick={() => upsertApiKeyMutation.mutate(newApiKey)}
                        disabled={!newApiKey.provider || !newApiKey.apiKey}
                      >
                        Save API Key
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Added Model Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>Model Management</CardTitle>
            <CardDescription>Configure and manage available AI models</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingModels ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end space-x-4">
                  <Button
                    onClick={() => syncModelsMutation.mutate()}
                    disabled={syncModelsMutation.isPending}
                  >
                    {syncModelsMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Sync Available Models
                  </Button>
                  <Button onClick={() => {
                    setEditingModel(null);
                    setModelForm(initialModelForm);
                    setModelDialogOpen(true);
                  }}>
                    Add New Model
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model ID</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models?.map((model: Model) => (
                      <TableRow key={model.id}>
                        <TableCell>{model.providerId}</TableCell>
                        <TableCell>{model.displayName}</TableCell>
                        <TableCell>{model.provider}</TableCell>
                        <TableCell>{(model.cost / 1000).toFixed(3)} credits/1K tokens</TableCell>
                        <TableCell>
                          <Switch
                            checked={model.enabled}
                            onCheckedChange={(enabled) =>
                              updateModelMutation.mutate({
                                ...model,
                                enabled,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingModel(model);
                              setModelDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingModel ? 'Edit Model' : 'Add New Model'}
                      </DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = {
                          ...modelForm,
                          contextWindow: modelForm.contextWindow || undefined,
                          maxTokens: modelForm.maxTokens || undefined,
                        };
                        upsertModelMutation.mutate(data);
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select
                          value={modelForm.provider}
                          onValueChange={(value: "openai" | "anthropic" | "palm") =>
                            setModelForm({ ...modelForm, provider: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="anthropic">Anthropic</SelectItem>
                            <SelectItem value="palm">Google PaLM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Model ID</Label>
                        <Input
                          value={modelForm.providerId}
                          onChange={(e) =>
                            setModelForm({ ...modelForm, providerId: e.target.value })
                          }
                          placeholder="e.g., gpt-4"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          value={modelForm.displayName}
                          onChange={(e) =>
                            setModelForm({ ...modelForm, displayName: e.target.value })
                          }
                          placeholder="e.g., GPT-4"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Cost per 1K tokens</Label>
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={(modelForm.cost / 1000).toFixed(3)}
                          onChange={(e) =>
                            setModelForm({ ...modelForm, cost: Math.round(parseFloat(e.target.value) * 1000) })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Context Window</Label>
                        <Input
                          type="number"
                          value={modelForm.contextWindow ?? ""}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setModelForm({ ...modelForm, contextWindow: value });
                          }}
                          placeholder="Optional"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Max Tokens</Label>
                        <Input
                          type="number"
                          value={modelForm.maxTokens ?? ""}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setModelForm({ ...modelForm, maxTokens: value });
                          }}
                          placeholder="Optional"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={modelForm.enabled}
                          onCheckedChange={(checked) =>
                            setModelForm({ ...modelForm, enabled: checked })
                          }
                        />
                        <Label>Enabled</Label>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setModelDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            !modelForm.providerId ||
                            !modelForm.displayName ||
                            !modelForm.provider ||
                            modelForm.cost < 1000
                          }
                        >
                          {editingModel ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>
                        {editingUser?.id === u.id ? (
                          <Switch
                            checked={editingUser.isAdmin}
                            onCheckedChange={(checked) =>
                              setEditingUser({
                                ...editingUser,
                                isAdmin: checked,
                              })
                            }
                          />
                        ) : (
                          u.isAdmin ? "Yes" : "No"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUser?.id === u.id ? (
                          <div className="space-x-2">
                            <Button
                              size="sm"
                              onClick={() => saveUser(u.id)}
                              disabled={updateUserMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUser(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(u)}
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Query History</CardTitle>
            <CardDescription>View all user queries across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingQueries ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queries?.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        {new Date(q.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{q.userId}</TableCell>
                      <TableCell>{q.model}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {q.prompt}
                      </TableCell>
                      <TableCell>{q.tokens}</TableCell>
                      <TableCell>{q.cost}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

type UpsertModel = {
  providerId: string;
  displayName: string;
  provider: "openai" | "anthropic" | "palm";
  cost: number;
  enabled: boolean;
  contextWindow?: number;
  maxTokens?: number;
};