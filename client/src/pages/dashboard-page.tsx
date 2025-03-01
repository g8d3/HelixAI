import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  
  const { data: queries, isLoading } = useQuery({
    queryKey: ["/api/queries"],
  });

  const chartData = queries?.reduce((acc: any[], query) => {
    const date = format(new Date(query.timestamp), "MMM d");
    const existing = acc.find((item) => item.date === date);
    if (existing) {
      existing.tokens += query.tokens;
      existing.cost += query.cost;
    } else {
      acc.push({ date, tokens: query.tokens, cost: query.cost });
    }
    return acc;
  }, []) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Usage Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
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

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Usage Overview</CardTitle>
              <CardDescription>Token usage over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tokens" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credit Usage</CardTitle>
              <CardDescription>Credit consumption over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Query History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queries?.map((query) => (
                    <TableRow key={query.id}>
                      <TableCell>
                        {format(new Date(query.timestamp), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{query.model}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {query.prompt}
                      </TableCell>
                      <TableCell>{query.tokens}</TableCell>
                      <TableCell>{query.cost}</TableCell>
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
