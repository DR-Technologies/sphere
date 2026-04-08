'use client';

import React from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    AreaChart, Area, Treemap
} from 'recharts';
import { formatDate } from '@/lib/dateUtils';
import MapVisualization from '@/components/maps/MapVisualization';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'table' | 'treemap' | 'card' | 'map';

interface ChartRendererProps {
    type: ChartType;
    data: Record<string, any>[];
    xAxis: string;
    yAxis: string;
    columnsMeta?: { name: string; type: string }[];
    widgetTitle?: string;
    latitudeField?: string;
    longitudeField?: string;
    orientation?: 'vertical' | 'horizontal';
    colorScheme?: 'varied' | 'blues' | 'solid';
    colorByCategory?: boolean;
    colors?: string[];
    customColor?: string;
}

const DEFAULT_COLORS = ['#8b5cf6', '#22d3ee', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];
const BLUE_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
const CHART_FONT_FAMILY = '"DejaVu Sans", "DejaVu Sans Condensed", sans-serif';

interface TreemapNodeProps {
    depth?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    fill?: string;
}

export default function ChartRenderer({
    type,
    data,
    xAxis,
    yAxis,
    columnsMeta = [],
    widgetTitle,
    latitudeField,
    longitudeField,
    orientation = 'vertical',
    colorScheme = 'varied',
    colorByCategory = true,
    colors = DEFAULT_COLORS,
    customColor
}: ChartRendererProps) {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const getColors = () => {
        if (colorScheme === 'solid') return [customColor || colors[0]];
        if (colorScheme === 'blues') return BLUE_COLORS;
        return colors;
    };

    const activeColors = getColors();

    const getBaseFieldName = (fieldName?: string) => {
        if (!fieldName) return '';
        return fieldName.replace(/\s+\((SUM|AVG|CNT|COUNT|MIN|MAX|DST|DISTINCT|NONE)\)$/i, '').trim();
    };

    const getColumnType = (fieldName?: string) => {
        const baseFieldName = getBaseFieldName(fieldName);
        return columnsMeta.find((column) => column.name === baseFieldName)?.type?.toUpperCase() || '';
    };

    const isDateColumn = (fieldName?: string) => {
        const columnType = getColumnType(fieldName);
        return columnType === 'DATE' || columnType === 'TIMESTAMP';
    };

    const normalizeDateValue = (value: unknown, fieldName?: string) => {
        if (value === null || value === undefined || value === '') return null;

        if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

        if (typeof value === 'number' && Number.isFinite(value) && isDateColumn(fieldName)) {
            if (value > 1e11) return new Date(value);
            if (value > 1e9) return new Date(value * 1000);
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (/^\d{10,13}$/.test(trimmed) && isDateColumn(fieldName)) {
                const numeric = Number(trimmed);
                if (trimmed.length === 13) return new Date(numeric);
                if (trimmed.length === 10) return new Date(numeric * 1000);
            }

            if (isDateColumn(fieldName) || /^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{4}\/\d{2}\/\d{2}/.test(trimmed)) {
                const parsed = new Date(trimmed);
                if (!Number.isNaN(parsed.getTime())) return parsed;
            }
        }

        return null;
    };

    const formatDisplayValue = (value: unknown, fieldName?: string) => {
        const normalizedDate = normalizeDateValue(value, fieldName);
        if (normalizedDate) return formatDate(normalizedDate);
        if (typeof value === 'number') return value.toLocaleString();
        return String(value ?? '');
    };

    const formatMetricValue = (value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);
        }
        return formatDisplayValue(value);
    };

    const renderTreemapNode = (props: TreemapNodeProps) => {
        const { x = 0, y = 0, width = 0, height = 0, name = '', fill = '#8884d8' } = props;

        if (width < 36 || height < 24) {
            return (
                <g>
                    <rect x={x} y={y} width={width} height={height} fill={fill} stroke="rgba(255,255,255,0.72)" strokeWidth={1} />
                </g>
            );
        }

        const fontSize = Math.max(11, Math.min(22, Math.min(width / 5.8, height / 2.8)));
        const labelX = x + 8;
        const labelY = y + Math.min(height - 8, Math.max(18, fontSize + 8));

        return (
            <g>
                <rect x={x} y={y} width={width} height={height} fill={fill} stroke="rgba(255,255,255,0.72)" strokeWidth={1} />
                <text
                    x={labelX}
                    y={labelY}
                    fill="rgba(255,255,255,0.96)"
                    fontFamily='-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif'
                    fontSize={fontSize}
                    fontWeight={600}
                    textRendering="geometricPrecision"
                    style={{
                        pointerEvents: 'none',
                        paintOrder: 'fill',
                        stroke: 'none',
                        letterSpacing: '-0.02em'
                    }}
                >
                    {formatDisplayValue(name, xAxis)}
                </text>
            </g>
        );
    };

    if (!isMounted) return <div style={{ height: '100%', width: '100%' }} />;

    if (!data || data.length === 0) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No data available</div>;
    }

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Record<string, any>[]; label?: string }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="glass-card" style={{ padding: '12px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.875rem' }}>
                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>{formatDisplayValue(label || data.name, xAxis)}</p>
                    {payload.map((entry, index: number) => (
                        <p key={index} style={{ color: entry.color || entry.fill }}>
                            {entry.name || 'Value'}: <span style={{ fontWeight: 600 }}>{formatDisplayValue(entry.value, String(entry.dataKey || entry.name || yAxis))}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (type === 'table') {
        const columns = Object.keys(data[0]);
        return (
            <div style={{ width: '100%', height: '100%', overflow: 'auto', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10, boxShadow: '0 1px 0 var(--border)' }}>
                        <tr>
                            {columns.map(col => (
                                <th key={col} style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }} className="table-row">
                                {columns.map(col => (
                                    <td key={col} style={{ padding: '12px', color: 'var(--foreground)' }}>
                                        {formatDisplayValue(row[col], col)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (type === 'card') {
        const primaryRow = data[0] || {};
        const value = primaryRow[yAxis];
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', width: '100%' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {widgetTitle || yAxis}
                    </p>
                    <div style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 700, letterSpacing: '-0.05em', color: 'var(--foreground)', lineHeight: 1 }}>
                        {formatMetricValue(value)}
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'map') {
        const points = data
            .map((row) => ({
                id: `${String(row[xAxis])}-${String(row[latitudeField || ''])}-${String(row[longitudeField || ''])}`,
                label: String(row[xAxis] ?? ''),
                value: Number(row[yAxis]),
                lat: Number(row[latitudeField || '']),
                lon: Number(row[longitudeField || '']),
                color: activeColors[Math.abs(String(row[xAxis] ?? '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % activeColors.length]
            }))
            .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat >= -90 && point.lat <= 90 && point.lon >= -180 && point.lon <= 180);

        return (
            <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '18px', overflow: 'hidden', background: 'linear-gradient(180deg, rgba(120, 169, 255, 0.18), rgba(12, 20, 34, 0.1))' }}>
                <MapVisualization points={points} />
                {points.length === 0 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No valid coordinates to display
                    </div>
                )}
            </div>
        );
    }

    const commonProps = {
        data,
        margin: { top: 10, right: 30, left: 0, bottom: 20 },
        style: { fontFamily: CHART_FONT_FAMILY }
    };

    const axisProps = {
        stroke: 'var(--text-muted)',
        fontSize: 11,
        tickLine: false,
        axisLine: false,
        tick: { fontFamily: CHART_FONT_FAMILY, fontSize: 11, fill: 'var(--text-muted)' }
    };

    const legendProps = {
        iconType: 'circle' as const,
        wrapperStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: '11px' }
    };

    const getChart = () => {
        switch (type) {
            case 'treemap':
                const treemapData = data.map((d, index) => ({
                    name: String(d[xAxis]),
                    value: Number(d[yAxis]),
                    fill: activeColors[index % activeColors.length]
                }));
                return (
                    <>
                        <Treemap
                            data={treemapData}
                            dataKey="value"
                            nameKey="name"
                            animationDuration={1000}
                            content={renderTreemapNode}
                        />
                        <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                    </>
                );

            case 'bar':
                const isHorizontal = orientation === 'horizontal';
                return (
                    <BarChart {...commonProps} layout={isHorizontal ? 'vertical' : 'horizontal'}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        {isHorizontal ? (
                            <>
                                <XAxis type="number" {...axisProps} tickFormatter={(value: unknown) => formatDisplayValue(value, yAxis)} />
                                <YAxis dataKey={xAxis} type="category" {...axisProps} width={100} tickFormatter={(value: unknown) => formatDisplayValue(value, xAxis)} />
                            </>
                        ) : (
                            <>
                                <XAxis dataKey={xAxis} {...axisProps} tickFormatter={(value: unknown) => formatDisplayValue(value, xAxis)} />
                                <YAxis {...axisProps} tickFormatter={(value: unknown) => formatDisplayValue(value, yAxis)} />
                            </>
                        )}
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} isAnimationActive={false} />
                        <Legend {...legendProps} />
                        <Bar 
                            dataKey={yAxis} 
                            radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} 
                            animationDuration={1000}
                            fill={activeColors[0] || '#8b5cf6'}
                            name={formatDisplayValue(yAxis)}
                        >
                            {(colorScheme === 'varied' || colorScheme === 'blues') ? (
                                data.map((_, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={activeColors[index % activeColors.length] || activeColors[0] || '#8b5cf6'} 
                                    />
                                ))
                            ) : (
                                // For 'solid', the filling is handled by the Bar prop, 
                                // but we add a Cell for consistency in Recharts rendering if needed
                                data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={activeColors[0] || '#8b5cf6'} />
                                ))
                            )}
                        </Bar>
                    </BarChart>
                );

            case 'line':
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey={xAxis} {...axisProps} />
                        <YAxis {...axisProps} />
                        <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                        <Legend {...legendProps} />
                        <Line type="monotone" dataKey={yAxis} stroke={activeColors[0]} strokeWidth={3} dot={{ r: 4, fill: activeColors[0], strokeWidth: 2, stroke: 'var(--background)' }} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={1000} name={formatDisplayValue(yAxis)} />
                    </LineChart>
                );

            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={activeColors[0]} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={activeColors[0]} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey={xAxis} {...axisProps} />
                        <YAxis {...axisProps} />
                        <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                        <Legend {...legendProps} />
                        <Area type="monotone" dataKey={yAxis} stroke={activeColors[0]} fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} animationDuration={1000} name={formatDisplayValue(yAxis)} />
                    </AreaChart>
                );

            case 'pie':
                return (
                    <PieChart style={{ fontFamily: CHART_FONT_FAMILY }}>
                        <Pie data={data} dataKey={yAxis} nameKey={xAxis} cx="50%" cy="50%" innerRadius="40%" outerRadius="70%" paddingAngle={5} labelLine={false} animationDuration={1000}>
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={activeColors[index % activeColors.length]} stroke="transparent" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                        <Legend {...legendProps} layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ ...legendProps.wrapperStyle, paddingTop: '20px', fontSize: '10px' }} />
                    </PieChart>
                );

            default: return null;
        }
    };

    return (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
            {getChart() || <div style={{ textAlign: 'center', paddingTop: '20%' }}>Chart tipo no soportado</div>}
        </ResponsiveContainer>
    );
}
