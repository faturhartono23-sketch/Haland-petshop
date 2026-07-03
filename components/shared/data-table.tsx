'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export type DataTableColumn<T> = {
  key: keyof T;
  header: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T extends Record<string, unknown>> = {
  title: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  pageSize?: number;
};

export function DataTable<T extends Record<string, unknown>>({ title, columns, rows, emptyMessage = 'Tidak ada data.', pageSize = 6 }: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <p className="text-sm text-zinc-500">Cari, lihat, dan navigasi data dengan pola CRUD standar.</p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Cari..."
            className="w-full bg-transparent outline-none"
          />
        </label>
      </div>

      <div className="overflow-hidden">
        {pagedRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-600">
                <tr>
                  {columns.map((column) => (
                    <th key={String(column.key)} className="px-4 py-3 font-medium">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {pagedRows.map((row, index) => (
                  <tr key={index} className="hover:bg-zinc-50">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-4 py-3 text-zinc-700">
                        {column.render ? column.render(row) : String(row[column.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 p-4 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <p>Menampilkan {pagedRows.length} dari {filteredRows.length} data</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-lg border border-zinc-200 p-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="rounded-lg border border-zinc-200 px-3 py-2">{page}/{totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-zinc-200 p-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
