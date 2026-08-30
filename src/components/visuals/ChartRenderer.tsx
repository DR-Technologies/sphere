'use client';

import React from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    AreaChart, Area, Treemap, LabelList
} from 'recharts';
import { formatDate } from '@/lib/dateUtils';
import MapVisualization from '@/components/maps/MapVisualization';
import { isSphereQaStaticRender } from '@/lib/qa';
import { buildCategoricalVisualizationData } from '@/lib/analytics/categoricalVisualization';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'table' | 'treemap' | 'card' | 'map';

interface ChartRendererProps {
    type: ChartType;
    data: Record<string, unknown>[];
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
    showLegend?: boolean;
    showTooltip?: boolean;
    showDataLabels?: boolean;
    numberFormat?: 'standard' | 'compact';
    dateDisplayFormat?: 'default' | 'short';
    showCardLabel?: boolean;
    cardValueSize?: 'small' | 'medium' | 'large';
    tableMaxHeight?: number;
    renderMode?: 'interactive' | 'public' | 'export' | 'qa';
}

const DEFAULT_COLORS = ['#8b5cf6', '#22d3ee', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];
const BLUE_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
const CHART_FONT_FAMILY = 'var(--font-sans), "Geist", "DejaVu Sans", sans-serif';

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
    latitudeField,
    longitudeField,
    orientation = 'vertical',
    colorScheme = 'varied',
    colors = DEFAULT_COLORS,
    customColor,
    showLegend = true,
    showTooltip = true,
    showDataLabels = false,
    numberFormat = 'standard',
    dateDisplayFormat = 'default',
    showCardLabel = true,
    cardValueSize = 'medium',
    tableMaxHeight = 320,
    renderMode = 'interactive'
}: ChartRendererProps) {
    const [isMounted, setIsMounted] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    React.useLayoutEffect(() => {
        if (!isMounted) return;

        const element = containerRef.current;
        if (!element || typeof ResizeObserver === 'undefined') return;

        let rafId = 0;
        let retries = 0;

        const updateSize = () => {
            const rect = element.getBoundingClientRect();
            const parentRect = element.parentElement?.getBoundingClientRect();
            const nextWidth = rect.width >= 4 ? rect.width : (parentRect?.width || rect.width);
            const nextHeight = rect.height >= 4 ? rect.height : (parentRect?.height || rect.height);
            setContainerSize((current) => {
                if (Math.abs(current.width - nextWidth) < 1 && Math.abs(current.height - nextHeight) < 1) {
                    return current;
                }

                return { width: nextWidth, height: nextHeight };
            });

            if ((nextWidth < 4 || nextHeight < 4) && retries < 8) {
                retries += 1;
                rafId = window.requestAnimationFrame(updateSize);
            }
        };

        updateSize();

        const observer = new ResizeObserver(() => {
            retries = 0;
            updateSize();
        });

        observer.observe(element);
        return () => {
            window.cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, [isMounted]);

    const getColors = () => {
        if (colorScheme === 'solid') return [customColor || colors[0]];
        if (colorScheme === 'blues') return BLUE_COLORS;
        return colors;
    };

    const activeColors = getColors();
    const themeText = 'var(--report-text, var(--foreground))';
    const themeMuted = 'var(--report-muted, var(--text-muted))';
    const themeBorder = 'var(--report-border, var(--border))';
    const themeSurface = 'var(--report-surface, var(--surface))';
    const themeSurfaceAlt = 'var(--report-surface-alt, var(--surface-light))';
    const themeBackground = 'var(--report-background, var(--background))';

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
        if (normalizedDate) {
            if (dateDisplayFormat === 'short') {
                return normalizedDate.toLocaleDateString('es-CO');
            }
            return formatDate(normalizedDate);
        }
        if (typeof value === 'number') {
            if (numberFormat === 'compact') {
                return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
            }
            return value.toLocaleString();
        }
        return String(value ?? '');
    };

    const formatMetricValue = (value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            if (numberFormat === 'compact') {
                return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
            }
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
                {showDataLabels && (
                    <text
                        x={labelX}
                        y={labelY}
                        fill="rgba(255,255,255,0.96)"
                        fontFamily={CHART_FONT_FAMILY}
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
                )}
            </g>
        );
    };

    const renderTooltipContent = ({ active, payload, label }: {
        active?: boolean;
        payload?: ReadonlyArray<{
            payload: Record<string, unknown>;
            color?: string;
            fill?: string;
            name?: string;
            value?: unknown;
            dataKey?: string;
        }>;
        label?: string | number;
    }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${themeBorder}`, background: themeSurface, fontSize: '0.875rem', boxShadow: '0 14px 28px rgba(0,0,0,0.14)' }}>
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

    const axisProps = {
        stroke: themeMuted,
        fontSize: 11,
        tickLine: false,
        axisLine: false,
        tick: { fontFamily: CHART_FONT_FAMILY, fontSize: 11, fill: themeMuted }
    };

    const legendProps = {
        iconType: 'circle' as const,
        wrapperStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: '11px' }
    };

    const mapPoints = React.useMemo(() => {
        return data
            .map((row) => ({
                id: `${String(row[xAxis])}-${String(row[latitudeField || ''])}-${String(row[longitudeField || ''])}`,
                label: String(row[xAxis] ?? ''),
                value: Number(row[yAxis]),
                lat: Number(row[latitudeField || '']),
                lon: Number(row[longitudeField || '']),
                color: activeColors[Math.abs(String(row[xAxis] ?? '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % activeColors.length]
            }))
            .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat >= -90 && point.lat <= 90 && point.lon >= -180 && point.lon <= 180);
    }, [activeColors, data, latitudeField, longitudeField, xAxis, yAxis]);

    const categoricalData = React.useMemo(() => {
        if (type !== 'bar' && type !== 'pie' && type !== 'treemap') {
            return [];
        }

        return buildCategoricalVisualizationData(data, xAxis, yAxis);
    }, [data, type, xAxis, yAxis]);

    const categoricalChartRows = React.useMemo(() => {
        return categoricalData.map((datum) => ({
            id: datum.id,
            [xAxis]: datum.category,
            [yAxis]: datum.value
        }));
    }, [categoricalData, xAxis, yAxis]);

    const compactChart = containerSize.width > 0 && (containerSize.width < 320 || containerSize.height < 220);
    const qaStaticRender = React.useMemo(() => isSphereQaStaticRender(), []);
    const isStaticRender = renderMode === 'export' || renderMode === 'qa' || qaStaticRender;
    const responsiveHeight = Math.max(containerSize.height, 1);
    const chartWidth = Math.max(containerSize.width, 1);
    const chartHeight = responsiveHeight;
    const hasMeasuredChartBounds = containerSize.width >= 4 && containerSize.height >= 4;
    const commonProps = {
        data,
        width: chartWidth,
        height: chartHeight,
        margin: { top: 10, right: 30, left: 0, bottom: 20 },
        style: { fontFamily: CHART_FONT_FAMILY }
    };
    const hasRenderableSeriesData = React.useMemo(() => {
        if (type === 'card' || type === 'table' || type === 'map') return true;
        if (type === 'bar' || type === 'pie' || type === 'treemap') return categoricalChartRows.length > 0;

        return data.some((row) => {
            const dimensionValue = row[xAxis];
            const metricValue = row[yAxis];
            const hasDimension = dimensionValue !== null && dimensionValue !== undefined && String(dimensionValue).trim() !== '';
            const numericMetric = typeof metricValue === 'number' ? metricValue : Number(metricValue);
            return hasDimension && Number.isFinite(numericMetric);
        });
    }, [categoricalChartRows.length, data, type, xAxis, yAxis]);

    if (!isMounted) return <div style={{ height: '100%', width: '100%' }} />;

    if (!data || data.length === 0) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: themeMuted }}>No data available</div>;
    }

    if (!hasRenderableSeriesData && type !== 'card' && type !== 'table' && type !== 'map') {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: themeMuted, textAlign: 'center' }}>No valid data available for this visualization</div>;
    }

    if (type === 'table') {
        const columns = Object.keys(data[0]);
        const resolvedTableMaxHeight = containerSize.height > 0 ? containerSize.height : tableMaxHeight;
        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: `${resolvedTableMaxHeight}px`,
                    minHeight: 0,
                    overflow: 'auto',
                    borderRadius: '14px',
                    border: `1px solid ${themeBorder}`,
                    background: `linear-gradient(180deg, ${themeSurfaceAlt}, ${themeSurface})`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
                }}
            >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: themeSurface, zIndex: 10, boxShadow: `0 1px 0 ${themeBorder}` }}>
                        <tr>
                            {columns.map(col => (
                                <th key={col} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: themeMuted, borderBottom: `1px solid ${themeBorder}`, backdropFilter: 'blur(12px)' }}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${themeBorder}` }} className="table-row">
                                {columns.map(col => (
                                    <td key={col} style={{ padding: '11px 14px', color: themeText }}>
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
        const valueFontSize = cardValueSize === 'small'
            ? 'clamp(1.75rem, 4vw, 3rem)'
            : cardValueSize === 'large'
                ? 'clamp(2.5rem, 6vw, 4.75rem)'
                : 'clamp(2rem, 5vw, 4rem)';
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', width: '100%' }}>
                    {showCardLabel && (
                        <p style={{ fontSize: '0.8rem', color: themeMuted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {yAxis}
                        </p>
                    )}
                    <div style={{ fontSize: valueFontSize, fontWeight: 700, letterSpacing: '-0.05em', color: themeText, lineHeight: 1 }}>
                        {formatMetricValue(value)}
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'map') {
        if (mapPoints.length === 0) {
            return (
                <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '14px', overflow: 'hidden', background: `linear-gradient(180deg, ${themeSurfaceAlt}, ${themeSurface})` }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', color: themeMuted, fontSize: '0.9rem' }}>
                        Selecciona campos válidos de latitud y longitud para mostrar el mapa.
                    </div>
                </div>
            );
        }

        return (
            <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '14px', overflow: 'hidden', background: `linear-gradient(180deg, ${themeSurfaceAlt}, ${themeSurface})` }}>
                <MapVisualization points={mapPoints} />
            </div>
        );
    }

    const getChart = () => {
        const allowLegend = showLegend
            && !compactChart
            && (type !== 'pie' || (chartWidth >= 360 && chartHeight >= 280));
        const allowDataLabels = showDataLabels && !compactChart;

        switch (type) {
            case 'treemap':
                const treemapData = categoricalData.map((datum, index) => ({
                    id: datum.id,
                    name: String(datum.category),
                    value: datum.value,
                    fill: activeColors[index % activeColors.length]
                }));
                return (
                    <Treemap
                        width={Math.max(containerSize.width, 1)}
                        height={Math.max(responsiveHeight, 1)}
                        data={treemapData}
                        dataKey="value"
                        nameKey="name"
                        animationDuration={isStaticRender ? 0 : 1000}
                        content={renderTreemapNode}
                    >
                        {showTooltip && <Tooltip content={renderTooltipContent} isAnimationActive={false} />}
                    </Treemap>
                );

            case 'bar':
                const isHorizontal = orientation === 'horizontal';
                return (
                    <BarChart {...commonProps} data={categoricalChartRows} layout={isHorizontal ? 'vertical' : 'horizontal'}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeBorder} vertical={false} />
                        {isHorizontal ? (
                            <>
                                <XAxis type="number" {...axisProps} tickFormatter={(value: unknown) => formatDisplayValue(value, yAxis)} />
                                <YAxis dataKey={xAxis} type="category" {...axisProps} width={compactChart ? 72 : 100} tickFormatter={(value: unknown) => formatDisplayValue(value, xAxis)} />
                            </>
                        ) : (
                            <>
                                <XAxis dataKey={xAxis} {...axisProps} tickFormatter={(value: unknown) => formatDisplayValue(value, xAxis)} />
                                <YAxis {...axisProps} tickFormatter={(value: unknown) => formatDisplayValue(value, yAxis)} />
                            </>
                        )}
                        {showTooltip && <Tooltip content={renderTooltipContent} cursor={{ fill: 'rgba(255,255,255,0.02)' }} isAnimationActive={false} />}
                        {allowLegend && <Legend {...legendProps} />}
                        <Bar 
                            dataKey={yAxis} 
                            radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} 
                            animationDuration={isStaticRender ? 0 : 1000}
                            fill={activeColors[0] || '#8b5cf6'}
                            name={formatDisplayValue(yAxis)}
                            isAnimationActive={!isStaticRender}
                        >
                            {allowDataLabels && (
                                <LabelList
                                    dataKey={yAxis}
                                    position={isHorizontal ? 'right' : 'top'}
                                    formatter={(value: unknown) => formatMetricValue(value)}
                                    style={{ fill: themeMuted, fontSize: 11, fontFamily: CHART_FONT_FAMILY }}
                                />
                            )}
                            {(colorScheme === 'varied' || colorScheme === 'blues') ? (
                                categoricalChartRows.map((row, index) => (
                                    <Cell 
                                        key={`cell-${String(row.id)}`}
                                        fill={activeColors[index % activeColors.length] || activeColors[0] || '#8b5cf6'} 
                                    />
                                ))
                            ) : (
                                // For 'solid', the filling is handled by the Bar prop, 
                                // but we add a Cell for consistency in Recharts rendering if needed
                                categoricalChartRows.map((row) => (
                                    <Cell key={`cell-${String(row.id)}`} fill={activeColors[0] || '#8b5cf6'} />
                                ))
                            )}
                        </Bar>
                    </BarChart>
                );

            case 'line':
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeBorder} vertical={false} />
                        <XAxis dataKey={xAxis} {...axisProps} />
                        <YAxis {...axisProps} />
                        {showTooltip && <Tooltip content={renderTooltipContent} isAnimationActive={false} />}
                        {allowLegend && <Legend {...legendProps} />}
                        <Line type="monotone" dataKey={yAxis} stroke={activeColors[0]} strokeWidth={3} dot={{ r: 4, fill: activeColors[0], strokeWidth: 2, stroke: themeBackground }} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={isStaticRender ? 0 : 1000} isAnimationActive={!isStaticRender} name={formatDisplayValue(yAxis)}>
                            {allowDataLabels && (
                                <LabelList
                                    dataKey={yAxis}
                                    position="top"
                                    formatter={(value: unknown) => formatMetricValue(value)}
                                    style={{ fill: themeMuted, fontSize: 11, fontFamily: CHART_FONT_FAMILY }}
                                />
                            )}
                        </Line>
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
                        <CartesianGrid strokeDasharray="3 3" stroke={themeBorder} vertical={false} />
                        <XAxis dataKey={xAxis} {...axisProps} />
                        <YAxis {...axisProps} />
                        {showTooltip && <Tooltip content={renderTooltipContent} isAnimationActive={false} />}
                        {allowLegend && <Legend {...legendProps} />}
                        <Area type="monotone" dataKey={yAxis} stroke={activeColors[0]} fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} animationDuration={isStaticRender ? 0 : 1000} isAnimationActive={!isStaticRender} name={formatDisplayValue(yAxis)}>
                            {allowDataLabels && (
                                <LabelList
                                    dataKey={yAxis}
                                    position="top"
                                    formatter={(value: unknown) => formatMetricValue(value)}
                                    style={{ fill: themeMuted, fontSize: 11, fontFamily: CHART_FONT_FAMILY }}
                                />
                            )}
                        </Area>
                    </AreaChart>
                );

            case 'pie':
                const pieOuterRadius = Math.max(44, Math.min(chartWidth, chartHeight) * (compactChart ? 0.24 : 0.3));
                const pieInnerRadius = Math.max(18, pieOuterRadius * (compactChart ? 0.45 : 0.58));
                const pieCenterY = allowLegend ? Math.max(pieOuterRadius + 18, chartHeight * 0.42) : chartHeight / 2;
                return (
                    <PieChart {...commonProps}>
                        <Pie
                            data={categoricalChartRows}
                            dataKey={yAxis}
                            nameKey={xAxis}
                            cx={chartWidth / 2}
                            cy={pieCenterY}
                            innerRadius={pieInnerRadius}
                            outerRadius={pieOuterRadius}
                            paddingAngle={5}
                            labelLine={false}
                            animationDuration={isStaticRender ? 0 : 1000}
                            isAnimationActive={!isStaticRender}
                            label={allowDataLabels ? ({ value }: { value?: number }) => formatMetricValue(value ?? 0) : false}
                        >
                            {categoricalChartRows.map((row, index) => (
                                <Cell key={`cell-${String(row.id)}`} fill={activeColors[index % activeColors.length]} stroke="transparent" />
                            ))}
                        </Pie>
                        {showTooltip && <Tooltip content={renderTooltipContent} isAnimationActive={false} />}
                        {allowLegend && <Legend {...legendProps} layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ ...legendProps.wrapperStyle, paddingTop: '20px', fontSize: '10px' }} />}
                    </PieChart>
                );

            default: return null;
        }
    };

    return (
        <div
            ref={containerRef}
            data-visual-ready={isMounted && hasMeasuredChartBounds ? 'true' : 'false'}
            data-visual-type={type}
            style={{ width: '100%', height: '100%', minHeight: 0, minWidth: 0 }}
        >
            {getChart() || <div style={{ textAlign: 'center', paddingTop: '20%' }}>Chart tipo no soportado</div>}
        </div>
    );
}
