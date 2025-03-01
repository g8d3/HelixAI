import { useAuth } from "@/hooks/use-auth";
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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<{
    id: number;
    credits: number;
    isAdmin: boolean;
  } | null>(null);

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: queries, isLoading: loadingQueries } = useQuery({
    queryKey: ["/api/admin/queries"],
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
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
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
                    <TableHead>Credits</TableHead>
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
                          <Input
                            type="number"
                            value={editingUser.credits}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                credits: parseInt(e.target.value),
                              })
                            }
                            className="w-24"
                          />
                        ) : (
                          u.credits
                        )}
                      </TableCell>
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
