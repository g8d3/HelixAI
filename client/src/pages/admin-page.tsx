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

type PaymentCredentials = {
  id: number;
  provider: "stripe" | "coinbase" | "direct";
  enabled: boolean;
  updatedAt: string;
};

type PaymentMethod = {
  id: number;
  name: string;
  provider: "stripe" | "coinbase" | "direct";
  type: "crypto" | "fiat";
  minAmount: number;
  enabled: boolean;
  settings: Record<string, unknown>;
  updatedAt: string;
};

type Transaction = {
  id: number;
  userId: number;
  amount: number;
  credits: number;
  paymentMethod: string;
  provider: string;
  status: string;
  providerTransactionId?: string;
  createdAt: string;
};

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
  isPublic: boolean;
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
  isPublic: boolean;
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
  isPublic: false,
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

  const { data: paymentCredentials, isLoading: loadingPaymentCredentials } = useQuery({
    queryKey: ["/api/admin/payment-credentials"],
  });

  const { data: paymentMethods, isLoading: loadingPaymentMethods } = useQuery({
    queryKey: ["/api/admin/payment-methods"],
  });

  const { data: transactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ["/api/admin/transactions"],
  });

  const [editingPaymentCredentials, setEditingPaymentCredentials] = useState<{
    provider: "stripe" | "coinbase" | "direct";
    credentials: Record<string, string>;
    enabled: boolean;
  } | null>(null);

  const [editingPaymentMethod, setEditingPaymentMethod] = useState<{
    name: string;
    provider: "stripe" | "coinbase" | "direct";
    type: "crypto" | "fiat";
    minAmount: number;
    enabled: boolean;
    settings: Record<string, unknown>;
  } | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
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

  const updatePaymentCredentialsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/payment-credentials", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-credentials"] });
      toast({
        title: "Payment credentials updated",
        description: "Provider settings have been saved successfully.",
      });
      setEditingPaymentCredentials(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/payment-methods", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      toast({
        title: "Payment method updated",
        description: "Payment method has been saved successfully.",
      });
      setEditingPaymentMethod(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });


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
      header: "Input Cost ($/1K tokens)",
      cell: ({ row }) => `$${(row.original.inputCost / 100000).toFixed(4)}`,
      meta: {
        type: 'number',
      },
    },
    {
      accessorKey: "outputCost",
      header: "Output Cost ($/1K tokens)",
      cell: ({ row }) => `$${(row.original.outputCost / 100000).toFixed(4)}`,
      meta: {
        type: 'number',
      },
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
      meta: {
        type: 'boolean',
      },
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
            setModelForm({
              providerId: row.original.providerId,
              displayName: row.original.displayName,
              provider: row.original.provider,
              inputCost: row.original.inputCost,
              outputCost: row.original.outputCost,
              enabled: row.original.enabled,
              contextWindow: row.original.contextWindow ?? null,
              maxTokens: row.original.maxTokens ?? null,
              isPublic: row.original.isPublic,
            });
            setModelDialogOpen(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

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
        isPublic: editingModel.isPublic,
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
        {/* API Keys Card */}
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
                <DataTable
                  columns={[
                    {
                      accessorKey: "provider",
                      header: "Provider",
                    },
                    {
                      accessorKey: "apiKey",
                      header: "API Key",
                      cell: ({ row }) => {
                        const key = row.original.apiKey;
                        return `${key.slice(0, 4)}...${key.slice(-4)}`;
                      },
                    },
                    {
                      accessorKey: "updatedAt",
                      header: "Last Updated",
                      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString(),
                    },
                  ]}
                  data={apiKeys || []}
                />

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

        {/* Payment Credentials Card */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Provider Settings</CardTitle>
            <CardDescription>Configure payment provider credentials</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPaymentCredentials ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <DataTable
                  columns={[
                    {
                      accessorKey: "provider",
                      header: "Provider",
                    },
                    {
                      accessorKey: "enabled",
                      header: "Enabled",
                      cell: ({ row }) => (
                        <Switch
                          checked={row.original.enabled}
                          onCheckedChange={(enabled) =>
                            updatePaymentCredentialsMutation.mutate({
                              ...row.original,
                              enabled,
                            })
                          }
                        />
                      ),
                      meta: {
                        type: 'boolean',
                      },
                    },
                    {
                      accessorKey: "updatedAt",
                      header: "Last Updated",
                      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString(),
                    },
                  ]}
                  data={paymentCredentials || []}
                />

                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Add Payment Provider</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configure Payment Provider</DialogTitle>
                      <DialogDescription>
                        Add or update payment provider credentials
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Select
                        value={editingPaymentCredentials?.provider}
                        onValueChange={(value: "stripe" | "coinbase" | "direct") =>
                          setEditingPaymentCredentials({
                            provider: value,
                            credentials: {},
                            enabled: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="coinbase">Coinbase Commerce</SelectItem>
                          <SelectItem value="direct">Direct Crypto</SelectItem>
                        </SelectContent>
                      </Select>

                      {editingPaymentCredentials?.provider === "stripe" && (
                        <>
                          <div className="space-y-2">
                            <Label>Secret Key</Label>
                            <Input
                              type="password"
                              value={editingPaymentCredentials.credentials.secretKey || ""}
                              onChange={(e) =>
                                setEditingPaymentCredentials({
                                  ...editingPaymentCredentials,
                                  credentials: {
                                    ...editingPaymentCredentials.credentials,
                                    secretKey: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Publishable Key</Label>
                            <Input
                              type="password"
                              value={editingPaymentCredentials.credentials.publishableKey || ""}
                              onChange={(e) =>
                                setEditingPaymentCredentials({
                                  ...editingPaymentCredentials,
                                  credentials: {
                                    ...editingPaymentCredentials.credentials,
                                    publishableKey: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        </>
                      )}

                      {editingPaymentCredentials?.provider === "coinbase" && (
                        <>
                          <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                              type="password"
                              value={editingPaymentCredentials.credentials.apiKey || ""}
                              onChange={(e) =>
                                setEditingPaymentCredentials({
                                  ...editingPaymentCredentials,
                                  credentials: {
                                    ...editingPaymentCredentials.credentials,
                                    apiKey: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Webhook Secret</Label>
                            <Input
                              type="password"
                              value={editingPaymentCredentials.credentials.webhookSecret || ""}
                              onChange={(e) =>
                                setEditingPaymentCredentials({
                                  ...editingPaymentCredentials,
                                  credentials: {
                                    ...editingPaymentCredentials.credentials,
                                    webhookSecret: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        </>
                      )}

                      {editingPaymentCredentials?.provider === "direct" && (
                        <div className="space-y-2">
                          <Label>Wallet Address</Label>
                          <Input
                            value={editingPaymentCredentials.credentials.walletAddress || ""}
                            onChange={(e) =>
                              setEditingPaymentCredentials({
                                ...editingPaymentCredentials,
                                credentials: {
                                  ...editingPaymentCredentials.credentials,
                                  walletAddress: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      )}

                      <Button
                        onClick={() => updatePaymentCredentialsMutation.mutate(editingPaymentCredentials)}
                        disabled={!editingPaymentCredentials?.provider}
                      >
                        Save Provider
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Card */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Configure available payment methods and their settings</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPaymentMethods ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <DataTable
                  columns={[
                    {
                      accessorKey: "name",
                      header: "Name",
                    },
                    {
                      accessorKey: "provider",
                      header: "Provider",
                    },
                    {
                      accessorKey: "type",
                      header: "Type",
                    },
                    {
                      accessorKey: "minAmount",
                      header: "Min Amount ($)",
                      cell: ({ row }) => `$${(row.original.minAmount / 100).toFixed(2)}`,
                      meta: {
                        type: 'number',
                      },
                    },
                    {
                      accessorKey: "enabled",
                      header: "Enabled",
                      cell: ({ row }) => (
                        <Switch
                          checked={row.original.enabled}
                          onCheckedChange={(enabled) =>
                            updatePaymentMethodMutation.mutate({
                              ...row.original,
                              enabled,
                            })
                          }
                        />
                      ),
                      meta: {
                        type: 'boolean',
                      },
                    },
                  ]}
                  data={paymentMethods || []}
                />

                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Add Payment Method</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configure Payment Method</DialogTitle>
                      <DialogDescription>
                        Add or update a payment method
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={editingPaymentMethod?.name || ""}
                          onChange={(e) =>
                            setEditingPaymentMethod({
                              ...editingPaymentMethod!,
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g., Credit Card, Bitcoin"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select
                          value={editingPaymentMethod?.provider}
                          onValueChange={(value: "stripe" | "coinbase" | "direct") =>
                            setEditingPaymentMethod({
                              ...editingPaymentMethod!,
                              provider: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stripe">Stripe</SelectItem>
                            <SelectItem value="coinbase">Coinbase Commerce</SelectItem>
                            <SelectItem value="direct">Direct Crypto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={editingPaymentMethod?.type}
                          onValueChange={(value: "crypto" | "fiat") =>
                            setEditingPaymentMethod({
                              ...editingPaymentMethod!,
                              type: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="crypto">Cryptocurrency</SelectItem>
                            <SelectItem value="fiat">Fiat Currency</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Minimum Amount ($)</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editingPaymentMethod?.minAmount ? (editingPaymentMethod.minAmount / 100).toFixed(2) : ""}
                          onChange={(e) =>
                            setEditingPaymentMethod({
                              ...editingPaymentMethod!,
                              minAmount: Math.round(parseFloat(e.target.value) * 100),
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingPaymentMethod?.enabled}
                          onCheckedChange={(checked) =>
                            setEditingPaymentMethod({
                              ...editingPaymentMethod!,
                              enabled: checked,
                            })
                          }
                        />
                        <Label>Enabled</Label>
                      </div>

                      <Button
                        onClick={() => updatePaymentMethodMutation.mutate(editingPaymentMethod)}
                        disabled={
                          !editingPaymentMethod?.name ||
                          !editingPaymentMethod?.provider ||
                          !editingPaymentMethod?.type ||
                          !editingPaymentMethod?.minAmount
                        }
                      >
                        Save Method
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View all payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <DataTable
                columns={[
                  {
                    accessorKey: "createdAt",
                    header: "Time",
                    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
                  },
                  {
                    accessorKey: "userId",
                    header: "User ID",
                  },
                  {
                    accessorKey: "amount",
                    header: "Amount ($)",
                    cell: ({ row }) => `$${(row.original.amount / 100).toFixed(2)}`,
                    meta: {
                      type: 'number',
                    },
                  },
                  {
                    accessorKey: "credits",
                    header: "Credits",
                    meta: {
                      type: 'number',
                    },
                  },
                  {
                    accessorKey: "paymentMethod",
                    header: "Method",
                  },
                  {
                    accessorKey: "provider",
                    header: "Provider",
                  },
                  {
                    accessorKey: "status",
                    header: "Status",
                  },
                ]}
                data={transactions || []}
              />
            )}
          </CardContent>
        </Card>

        {/* Models Card */}
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
                        upsertModelMutation.mutate(modelForm);
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
                        <Label>Input Cost per 1K tokens ($)</Label>
                        <Input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={(modelForm.inputCost / 100000).toFixed(4)}
                          onChange={(e) =>
                            setModelForm({ ...modelForm, inputCost: Math.round(parseFloat(e.target.value) * 100000) })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Output Cost per 1K tokens ($)</Label>
                        <Input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={(modelForm.outputCost / 100000).toFixed(4)}
                          onChange={(e) =>
                            setModelForm({ ...modelForm, outputCost: Math.round(parseFloat(e.target.value) * 100000) })
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

                      <div className="spacey-2">
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

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={modelForm.isPublic}
                          onCheckedChange={(checked) =>
                            setModelForm({ ...modelForm, isPublic: checked })
                          }
                        />
                        <Label>Show on Home Page</Label>
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
                            modelForm.inputCost < 1 ||
                            modelForm.outputCost < 1
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

        {/* User Management Card */}
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
              <DataTable
                columns={[
                  {
                    accessorKey: "id",
                    header: "ID",
                  },
                  {
                    accessorKey: "username",
                    header: "Username",
                  },
                  {
                    accessorKey: "isAdmin",
                    header: "Admin",
                    cell: ({ row }) => (
                      <Switch
                        checked={row.original.isAdmin}
                        onCheckedChange={(isAdmin) =>
                          updateUserMutation.mutate({
                            id: row.original.id,
                            data: { isAdmin },
                          })
                        }
                      />
                    ),
                    meta: {
                      type: 'boolean',
                    },
                  },
                ]}
                data={users || []}
              />
            )}
          </CardContent>
        </Card>

        {/* Query History Card */}
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
              <DataTable
                columns={[
                  {
                    accessorKey: "timestamp",
                    header: "Time",
                    cell: ({ row }) => new Date(row.original.timestamp).toLocaleString(),
                  },
                  {
                    accessorKey: "userId",
                    header: "User ID",
                  },
                  {
                    accessorKey: "model",
                    header: "Model",
                  },
                  {
                    accessorKey: "prompt",
                    header: "Prompt",
                    cell: ({ row }) => (
                      <div className="max-w-md truncate">{row.original.prompt}</div>
                    ),
                  },
                  {
                    accessorKey: "inputTokens",
                    header: "Input Tokens",
                    meta: {
                      type: 'number',
                    },
                  },
                  {
                    accessorKey: "outputTokens",
                    header: "Output Tokens",
                    meta: {
                      type: 'number',
                    },
                  },
                ]}
                data={queries || []}
              />
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
  isPublic: boolean;
};