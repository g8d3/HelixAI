import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  getPaginationRowModel,
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
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [pageSize, setPageSize] = useState(20);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageSize,
        pageIndex: 0,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="relative">
          {/* Table container with fixed height and scrolling */}
          <div className="h-[600px] overflow-auto">
            <Table>
              {/* Fixed header */}
              <TableHeader className="sticky top-0">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        // Add styles for sticky header
                        className="bg-background sticky top-0"
                      >
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
                                      value={(header.column.getFilterValue() ?? "all").toString()}
                                      onValueChange={(value) => {
                                        if (value === "all") {
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
                                        <SelectItem value="all">All</SelectItem>
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
              {/* Scrollable body */}
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
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Rows per page
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue/>
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}