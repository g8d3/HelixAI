import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultSort?: { id: string; desc: boolean };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultSort,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(
    defaultSort ? [defaultSort] : []
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="rounded-md border">
      <div className="max-h-[600px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={
                            header.column.getCanSort()
                              ? "cursor-pointer select-none"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                        {header.column.getCanSort() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {header.column.getCanFilter() && (
                        <div>
                          {(() => {
                            const columnDef = header.column.columnDef as ColumnDef<TData, any>;
                            if (columnDef.meta?.type === 'boolean') {
                              return (
                                <Select
                                  value={(header.column.getFilterValue() ?? "").toString()}
                                  onValueChange={(value) => {
                                    if (value === "") {
                                      header.column.setFilterValue(undefined);
                                    } else {
                                      header.column.setFilterValue(value === "true");
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 w-[120px]">
                                    <SelectValue placeholder="Filter..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">All</SelectItem>
                                    <SelectItem value="true">Yes</SelectItem>
                                    <SelectItem value="false">No</SelectItem>
                                  </SelectContent>
                                </Select>
                              );
                            }
                            if (columnDef.meta?.type === 'number') {
                              return (
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Min"
                                    value={(header.column.getFilterValue() as [number, number])?.[0] ?? ""}
                                    onChange={(event) =>
                                      header.column.setFilterValue((old: [number, number]) => [
                                        event.target.value ? Number(event.target.value) : undefined,
                                        old?.[1],
                                      ])
                                    }
                                    type="number"
                                    className="h-8 w-[80px]"
                                  />
                                  <Input
                                    placeholder="Max"
                                    value={(header.column.getFilterValue() as [number, number])?.[1] ?? ""}
                                    onChange={(event) =>
                                      header.column.setFilterValue((old: [number, number]) => [
                                        old?.[0],
                                        event.target.value ? Number(event.target.value) : undefined,
                                      ])
                                    }
                                    type="number"
                                    className="h-8 w-[80px]"
                                  />
                                </div>
                              );
                            }
                            return (
                              <Input
                                placeholder="Filter..."
                                value={(header.column.getFilterValue() ?? "") as string}
                                onChange={(event) =>
                                  header.column.setFilterValue(event.target.value)
                                }
                                className="h-8 max-w-sm"
                              />
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}