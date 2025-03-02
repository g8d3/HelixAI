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
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

type Model = {
  id: number;
  providerId: string;
  displayName: string;
  provider: "openai" | "anthropic" | "palm";
  inputCost: number;
  outputCost: number;
  enabled: boolean;
  contextWindow?: number;
  maxTokens?: number;
  isPublic: boolean; // Added isPublic field
};

type ModelFormData = {
  providerId: string;
  displayName: string;
  provider: "openai" | "anthropic" | "palm";
  inputCost: number;
  outputCost: number;
  enabled: boolean;
  contextWindow?: number | null;
  maxTokens?: number | null;
  isPublic: boolean; // Added isPublic field
};

const initialModelForm: ModelFormData = {
  providerId: "",
  displayName: "",
  provider: "openai",
  inputCost: 150,
  outputCost: 200,
  enabled: true,
  contextWindow: null,
  maxTokens: null,
  isPublic: false, // Added default value for isPublic
};

const modelColumns: ColumnDef<Model>[] = [
  {
    accessorKey: "providerId",
    header: "Model ID",
  },
  {
    accessorKey: "displayName",
    header: "Display Name",
  },
  {
    accessorKey: "provider",
    header: "Provider",
  },
  {
    accessorKey: "inputCost",
    header: "Input Cost",
    cell: ({ row }) => `$${(row.original.inputCost / 100000).toFixed(4)}/1K tokens`,
  },
  {
    accessorKey: "outputCost",
    header: "Output Cost",
    cell: ({ row }) => `$${(row.original.outputCost / 100000).toFixed(4)}/1K tokens`,
  },
  {
    accessorKey: "enabled",
    header: "Status",
    cell: ({ row }) => (
      <Switch
        checked={row.original.enabled}
        onCheckedChange={(enabled) =>
          updateModelMutation.mutate({
            ...row.original,
            enabled,
          })
        }
      />
    ),
  },
  {
    accessorKey: "isPublic",
    header: "Public",
    cell: ({ row }) => (
      <Switch
        checked={row.original.isPublic}
        onCheckedChange={(isPublic) =>
          updateModelMutation.mutate({
            ...row.original,
            isPublic,
          })
        }
      />
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setEditingModel(row.original);
          setModelDialogOpen(true);
        }}
      >
        Edit
      </Button>
    ),
  },
];

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

  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [modelForm, setModelForm] = useState<ModelFormData>(initialModelForm);

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: queries, isLoading: loadingQueries } = useQuery({
    queryKey: ["/api/admin/queries"],
  });

  const { data: apiKeys, isLoading: loadingApiKeys } = useQuery({
    queryKey: ["/api/admin/api-keys"],
  });

  const { data: models, isLoading: loadingModels } = useQuery({
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

  const updateModelMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/admin/models/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/models"] });
      queryClient.invalidateQueries({ queryKey: ["/api/models"] }); // Add this line
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

  const upsertModelMutation = useMutation({
    mutationFn: async (data: UpsertModel) => {
      const method = editingModel ? "PATCH" : "POST";
      const url = editingModel ? `/api/admin/models/${editingModel.id}` : "/api/admin/models";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/models"] });
      queryClient.invalidateQueries({ queryKey: ["/api/models"] }); // Add this line
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
      queryClient.invalidateQueries({ queryKey: ["/api/models"] }); // Add this line
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
        inputCost: editingModel.inputCost,
        outputCost: editingModel.outputCost,
        enabled: editingModel.enabled,
        contextWindow: editingModel.contextWindow ?? null,
        maxTokens: editingModel.maxTokens ?? null,
        isPublic: editingModel.isPublic, // Added isPublic
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b fixed top-0 left-0 right-0 bg-background z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 mt-16">
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

                <DataTable
                  columns={modelColumns}
                  data={models || []}
                  defaultSort={{ id: "isPublic", desc: true }}
                />
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
  inputCost: number;
  outputCost: number;
  enabled: boolean;
  contextWindow?: number;
  maxTokens?: number;
  isPublic: boolean; // Added isPublic field
};