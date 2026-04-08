'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface DataTableProps {
    columns: { name: string; type: string }[];
    data: Record<string, any>[];
    maxRows?: number;
}

export default function DataTable({ columns, data, maxRows = 100 }: DataTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const sortedAndFilteredData = useMemo(() => {
        let processData = [...data];

        // Filter
        if (searchTerm) {
            processData = processData.filter((row) =>
                Object.values(row).some(
                    (val) => String(val).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Sort
        if (sortConfig) {
            processData.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return processData.slice(0, maxRows);
    }, [data, sortConfig, searchTerm, maxRows]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative', maxWidth: '400px' }}>
                <Search
                    size={18}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                    type="text"
                    placeholder="Search in preview..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 12px 10px 40px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
            </div>

            <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                {columns.map((col) => (
                                    <th
                                        key={col.name}
                                        onClick={() => handleSort(col.name)}
                                        style={{
                                            padding: '16px',
                                            color: 'var(--text-muted)',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'color 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {col.name}
                                            <span style={{ display: 'flex', flexDirection: 'column', opacity: sortConfig?.key === col.name ? 1 : 0.3 }}>
                                                <ChevronUp size={12} style={{ marginBottom: '-4px', color: (sortConfig?.key === col.name && sortConfig.direction === 'asc') ? 'var(--primary)' : 'inherit' }} />
                                                <ChevronDown size={12} style={{ color: (sortConfig?.key === col.name && sortConfig.direction === 'desc') ? 'var(--primary)' : 'inherit' }} />
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredData.length > 0 ? (
                                sortedAndFilteredData.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                                        {columns.map((col) => (
                                            <td key={col.name} style={{ padding: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                                {col.type === 'DATE' || col.type === 'TIMESTAMP' 
                                                    ? formatDate(row[col.name]) 
                                                    : String(row[col.name] ?? '')}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No results found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--surface)', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    Showing {sortedAndFilteredData.length} of {data.length} rows
                </div>
            </div>

            <style jsx>{`
        .table-row-hover:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        th:hover {
          color: var(--foreground) !important;
        }
        :global(table) {
          backdrop-filter: blur(18px);
        }
      `}</style>
        </div>
    );
}
