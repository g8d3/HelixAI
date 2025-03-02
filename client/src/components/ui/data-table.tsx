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
import { Switch } from "@/components/ui/switch";

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
  const [frozenColumns, setFrozenColumns] = useState<string[]>([]);

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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {table.getAllColumns()
          .filter((column) => column.getCanFilter())
          .map((column) => {
            const columnDef = column.columnDef as ColumnDef<TData, any>;
            if (columnDef.meta?.type === 'boolean') {
              return (
                <div key={column.id} className="flex-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={(column.getFilterValue() ?? "") as boolean}
                      onCheckedChange={(value) =>
                        column.setFilterValue(value ? true : undefined)
                      }
                    />
                    <span>Filter {column.id}</span>
                  </div>
                </div>
              );
            }
            if (columnDef.meta?.type === 'number') {
              return (
                <div key={column.id} className="flex-1">
                  <Input
                    placeholder={`Min ${column.id}`}
                    value={(column.getFilterValue() as [number, number])?.[0] ?? ""}
                    onChange={(event) =>
                      column.setFilterValue((old: [number, number]) => [
                        event.target.value ? Number(event.target.value) : undefined,
                        old?.[1],
                      ])
                    }
                    type="number"
                    className="max-w-[100px] mb-2"
                  />
                  <Input
                    placeholder={`Max ${column.id}`}
                    value={(column.getFilterValue() as [number, number])?.[1] ?? ""}
                    onChange={(event) =>
                      column.setFilterValue((old: [number, number]) => [
                        old?.[0],
                        event.target.value ? Number(event.target.value) : undefined,
                      ])
                    }
                    type="number"
                    className="max-w-[100px]"
                  />
                </div>
              );
            }
            return (
              <div key={column.id} className="flex-1">
                <Input
                  placeholder={`Filter ${column.id}`}
                  value={(column.getFilterValue() ?? "") as string}
                  onChange={(event) =>
                    column.setFilterValue(event.target.value)
                  }
                  className="max-w-sm"
                />
              </div>
            );
          })}
      </div>

      <div className="rounded-md border">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isFrozen = frozenColumns.includes(header.column.id);
                    return (
                      <TableHead
                        key={header.id}
                        className={`${
                          isFrozen
                            ? "sticky left-0 bg-background z-20"
                            : ""
                        }`}
                      >
                        {header.isPlaceholder ? null : (
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                if (isFrozen) {
                                  setFrozenColumns(
                                    frozenColumns.filter(
                                      (id) => id !== header.column.id
                                    )
                                  );
                                } else {
                                  setFrozenColumns([
                                    ...frozenColumns,
                                    header.column.id,
                                  ]);
                                }
                              }}
                            >
                              📌
                            </Button>
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
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
                    {row.getVisibleCells().map((cell) => {
                      const isFrozen = frozenColumns.includes(cell.column.id);
                      return (
                        <TableCell
                          key={cell.id}
                          className={`${
                            isFrozen
                              ? "sticky left-0 bg-background"
                              : ""
                          }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
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
  );
}