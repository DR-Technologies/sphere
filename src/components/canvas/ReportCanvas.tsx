'use client';

import React, { useState, useEffect } from 'react';
import {
    Check, X, Plus, Trash2, Settings, Copy, Monitor, Layout, Search, BarChart3, PieChart as PieIcon, LineChart as LineIcon, Table as TableIcon, Merge, Activity as SphereIcon, Hash, ALargeSmall, Calendar, ChevronDown, LayoutPanelLeft, Filter, Layers, Info, ChartArea, TableCellsMerge, Loader2, ChevronRight, ChevronLeft, Save, CheckCircle2, Maximize2, ChevronUp, MapPinned, SquareStack
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ChartRenderer, { ChartType } from '../visuals/ChartRenderer';
import { runQuery } from '@/lib/profiler';
import { saveReport, getReports, deleteReport, checkReportLimit, SavedDataset, SavedReport } from '@/lib/persistence';
import { ResponsiveGridLayout, ResizeHandleAxis } from 'react-grid-layout';
const ResponsiveGridLayoutComponent = ResponsiveGridLayout as any;
import { supabase } from '@/lib/supabase';

export type AggregationType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'DISTINCT' | 'NONE';

export interface Widget {
    id: string;
    type: ChartType;
    title: string;
    xAxis: string;
    yAxis: string;
    aggregation: AggregationType;
    columns?: string[]; // Specifically for table visuals
    x: number;
    y: number;
    w: number;
    h: number;
    orderBy?: 'ASC' | 'DESC';
    topN?: number;
    orientation?: 'vertical' | 'horizontal';
    colorScheme?: 'varied' | 'blues' | 'solid';
    colorByCategory?: boolean;
    customColor?: string;
    columnAggregations?: Record<string, AggregationType>;
    latitudeField?: string;
    longitudeField?: string;
}

export interface GlobalFilter {
    id: string;
    column: string;
    value: string | null;
}

export type SelectionState =
    | { type: 'none' }
    | { type: 'widget'; id: string }
    | { type: 'filters' };

interface ReportCanvasProps {
    dataset: {
        id?: string;
        name: string;
        columns: { name: string; type: string }[];
        stats: { column: string; type: string;[key: string]: any }[];
        preview: Record<string, any>[];
    };
    initialReportId?: string | null;
    savedDatasets?: SavedDataset[];
    onReportDeleted?: () => void;
    onChangesStatusChange?: (hasChanges: boolean) => void;
    onSwitchDataset?: (dataset: SavedDataset) => void;
}

const WidgetCard = React.memo(({
    widget,
    isActive,
    globalFilters,
    columnsMeta,
    onSelect,
    onRemove
}: {
    widget: Widget;
    isActive: boolean;
    globalFilters: GlobalFilter[];
    columnsMeta: { name: string; type: string }[];
    onSelect: () => void;
    onRemove: (e: React.MouseEvent) => void;
}) => {
    const [data, setData] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                let query = '';
                const filtersToApply = globalFilters.filter(f => f.column && f.value !== null && f.value !== '');
                const whereClause = filtersToApply.length > 0
                    ? `WHERE ${filtersToApply.map(f => `"${f.column}" = '${String(f.value).replace(/'/g, "''")}'`).join(' AND ')}`
                    : '';

                if (widget.type === 'card') {
                    const aggExpr = widget.aggregation === 'COUNT'
                        ? `COUNT("${widget.yAxis}")`
                        : `${widget.aggregation}(TRY_CAST("${widget.yAxis}" AS DOUBLE))`;
                    query = `SELECT ${aggExpr} as "${widget.yAxis}" FROM dataset ${whereClause}`;
                } else if (widget.type === 'map' && widget.latitudeField && widget.longitudeField) {
                    const metricExpr = widget.aggregation === 'NONE'
                        ? `TRY_CAST("${widget.yAxis}" AS DOUBLE)`
                        : widget.aggregation === 'COUNT'
                            ? `COUNT("${widget.yAxis}")`
                            : `${widget.aggregation}(TRY_CAST("${widget.yAxis}" AS DOUBLE))`;
                    const dimensionSelect = widget.xAxis ? `"${widget.xAxis}",` : '';
                    const groupByClause = widget.aggregation === 'NONE'
                        ? ''
                        : `GROUP BY ${widget.xAxis ? `"${widget.xAxis}",` : ''} "${widget.latitudeField}", "${widget.longitudeField}"`;
                    query = `
                        SELECT
                            ${dimensionSelect}
                            "${widget.latitudeField}",
                            "${widget.longitudeField}",
                            ${metricExpr} as "${widget.yAxis}"
                        FROM dataset
                        ${whereClause}
                        ${groupByClause}
                        LIMIT ${widget.topN || 500}
                    `;
                } else if (widget.type === 'table' && widget.columns && widget.columns.length > 0) {
                    const colAggs = widget.columnAggregations || {};
                    const hasMetrics = Object.entries(colAggs).some(([col, agg]) => widget.columns?.includes(col) && agg !== 'NONE');

                    if (hasMetrics) {
                        const abbrevs: Record<string, string> = { 'SUM': 'SUM', 'AVG': 'AVG', 'COUNT': 'CNT', 'DISTINCT': 'DST' };
                        const selects = widget.columns.map(c => {
                            const agg = colAggs[c] || 'NONE';
                            if (agg === 'NONE') return `"${c}"`;
                            const abbrev = abbrevs[agg] || agg;
                            if (agg === 'DISTINCT') return `COUNT(DISTINCT "${c}") as "${c} (${abbrev})"`;
                            if (['SUM', 'AVG'].includes(agg)) return `${agg}(TRY_CAST("${c}" AS DOUBLE)) as "${c} (${abbrev})"`;
                            return `${agg}("${c}") as "${c} (${abbrev})"`;
                        }).join(', ');

                        const dimensions = widget.columns.filter(c => (colAggs[c] || 'NONE') === 'NONE');
                        const groupByClause = dimensions.length > 0 ? `GROUP BY ${dimensions.map(d => `"${d}"`).join(', ')}` : '';
                        query = `SELECT ${selects} FROM dataset ${whereClause} ${groupByClause} LIMIT 50`;
                    } else {
                        const cols = widget.columns.map(c => `"${c}"`).join(', ');
                        query = `SELECT ${cols} FROM dataset ${whereClause} LIMIT 100`;
                    }
                }
                else if (widget.aggregation === 'NONE') {
                    const orderClause = widget.orderBy ? `ORDER BY "${widget.xAxis}" ${widget.orderBy}` : '';
                    const limitClause = widget.topN ? `LIMIT ${widget.topN}` : 'LIMIT 100';
                    query = `SELECT "${widget.xAxis}", "${widget.yAxis}" FROM dataset ${whereClause} ${orderClause} ${limitClause}`;
                } else {
                    const aggExpr = widget.aggregation === 'COUNT'
                        ? `COUNT("${widget.yAxis}")`
                        : `${widget.aggregation}(TRY_CAST("${widget.yAxis}" AS DOUBLE))`;

                    const orderCol = widget.orderBy === 'ASC' || widget.orderBy === 'DESC' ? `"${widget.yAxis}"` : `"${widget.xAxis}"`;
                    const orderDir = widget.orderBy || 'DESC';
                    const limitClause = widget.topN ? `LIMIT ${widget.topN}` : 'LIMIT 50';

                    query = `
                        SELECT 
                            "${widget.xAxis}", 
                            ${aggExpr} as "${widget.yAxis}"
                        FROM dataset 
                        ${whereClause}
                        GROUP BY "${widget.xAxis}"
                        ORDER BY ${orderCol} ${orderDir}
                        ${limitClause}
                    `;
                }
                const result = await runQuery(query, { datasetId: dataset.id });

                // Check if result is all nulls (often happens if TRY_CAST fails for all rows)
                const allNulls = result.length > 0 && result.every(row => row[widget.yAxis] === null);
                if (allNulls && widget.aggregation !== 'COUNT') {
                    setError(`Cannot perform ${widget.aggregation} on "${widget.yAxis}": Column is not numeric.`);
                    setData([]);
                } else {
                    setData(result);
                }
            } catch (err: unknown) {
                console.error('Error fetching widget data:', err);
                const msg = err instanceof Error ? err.message : '';
                if (msg.includes('No function matches')) {
                    setError(`Aggregation ${widget.aggregation} not supported for this column type.`);
                } else {
                    setError('Failed to fetch data. Check if column is compatible.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [widget.xAxis, widget.yAxis, widget.aggregation, widget.columns, widget.type, widget.orderBy, widget.topN, globalFilters, widget.colorScheme, widget.customColor, widget.colorByCategory, widget.orientation, widget.columnAggregations]);

    return (
        <div
            className={`glass glass-card ${isActive ? 'active-widget' : ''}`}
            onClick={onSelect}
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{widget.title}</h5>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {widget.type === 'table'
                            ? `${widget.columns?.length || 0} fields`
                            : widget.type === 'card'
                                ? `${widget.aggregation}(${widget.yAxis})`
                                : widget.type === 'map'
                                    ? `${widget.yAxis} by ${widget.latitudeField}/${widget.longitudeField}`
                            : widget.type === 'treemap'
                                ? `TreeMap: ${widget.xAxis} x ${widget.yAxis}`
                                : `${widget.aggregation !== 'NONE' ? `${widget.aggregation}(${widget.yAxis})` : widget.yAxis} by ${widget.xAxis}`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="nodrag"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onRemove(e);
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '6px',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
                {loading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', zIndex: 10 }}>
                        <Loader2 size={32} className="animate-spin" color="var(--primary)" />
                    </div>
                )}

                {error ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#f87171', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                ) : (
                    <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 0 }}>
                        <ChartRenderer
                            type={widget.type}
                            data={data}
                            xAxis={widget.xAxis}
                            yAxis={widget.yAxis}
                            columnsMeta={columnsMeta}
                            widgetTitle={widget.title}
                            latitudeField={widget.latitudeField}
                            longitudeField={widget.longitudeField}
                            orientation={widget.orientation}
                            colorScheme={widget.colorScheme}
                            colorByCategory={widget.colorByCategory}
                            customColor={widget.customColor}
                        />
                    </div>
                )}
            </div>
        </div>
    );
});
WidgetCard.displayName = 'WidgetCard';

const ReportCanvas = React.forwardRef<{ handleSave: (isSaveAs?: boolean) => Promise<void>; reportName: string }, ReportCanvasProps>(({
    dataset,
    initialReportId,
    savedDatasets = [],
    onReportDeleted,
    onChangesStatusChange,
    onSwitchDataset
}, ref) => {
    const { t } = useTranslation();
    const [width, setWidth] = useState(1200);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const [isGridMounted, setIsGridMounted] = useState(false);

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === containerRef.current) {
                    setWidth(entry.contentRect.width);
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
            setWidth(containerRef.current.offsetWidth);
            setIsGridMounted(true);
        }

        return () => resizeObserver.disconnect();
    }, []);
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const layout = React.useMemo(() => {
        return widgets.map(w => ({
            i: w.id,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            minW: 1,
            maxW: 6,
            minH: 1,
            maxH: 6,
            resizeHandles: ['se'] as ResizeHandleAxis[]
        }));
    }, [widgets]);

    const onLayoutChange = React.useCallback((currentLayout: any[]) => {
        setWidgets(prevWidgets => {
            let changed = false;
            const updated = prevWidgets.map(w => {
                const l = currentLayout.find((item: any) => item.i === w.id);
                if (l && (l.x !== w.x || l.y !== w.y || l.w !== w.w || l.h !== w.h)) {
                    changed = true;
                    return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
                }
                return w;
            });
            return changed ? updated : prevWidgets;
        });
    }, []);

    const [selection, setSelection] = useState<SelectionState>({ type: 'none' });
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [user, setUser] = useState<any>(null); // Supabase User type can be complex, using any temporarily but scoped
    const [reportId, setReportId] = useState<string | null>(initialReportId || null);
    const [reportName, setReportName] = useState(dataset.name);
    const [isReportSettingsOpen, setIsReportSettingsOpen] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSavedState, setLastSavedState] = useState<string>('');
    const [globalFilters, setGlobalFilters] = useState<GlobalFilter[]>([]);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyURL = () => {
        const url = reportId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/report/${reportId}` : '';
        if (url) {
            navigator.clipboard.writeText(url).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            });
        }
    };

    // Expose methods to parent
    React.useImperativeHandle(ref, () => ({
        handleSave,
        reportName
    }));

    // Track changes
    useEffect(() => {
        const currentState = JSON.stringify({ widgets, reportName, globalFilters });
        if (lastSavedState && currentState !== lastSavedState) {
            setHasUnsavedChanges(true);
            onChangesStatusChange?.(true);
        } else {
            setHasUnsavedChanges(false);
            onChangesStatusChange?.(false);
        }
    }, [widgets, reportName, globalFilters, lastSavedState, onChangesStatusChange]);

    // 1. Manage User Session
    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Load Report Data
    const userId = user?.id;
    useEffect(() => {
        if (!dataset.id || !userId) {
            setLastSavedState(JSON.stringify({ widgets: [], reportName: dataset.name, globalFilters: [] }));
            return;
        }

        if (initialReportId) {
            getReports(userId, dataset.id).then(reports => {
                const existingReport = reports.find(r => r.id === initialReportId);

                if (existingReport) {
                    setWidgets(existingReport.widgets);
                    setGlobalFilters(existingReport.filters || []);
                    setReportId(existingReport.id);
                    setReportName(existingReport.name);
                    setLastSaved(new Date((existingReport as any).updated_at || existingReport.created_at));
                    setLastSavedState(JSON.stringify({
                        widgets: existingReport.widgets,
                        reportName: existingReport.name,
                        globalFilters: existingReport.filters || []
                    }));
                } else {
                    // If ID was provided but not found, reset or keep current? 
                    // Mostly fails if report was deleted.
                    setWidgets([]);
                    setGlobalFilters([]);
                    setReportId(null);
                    setReportName(dataset.name);
                    setLastSavedState(JSON.stringify({ widgets: [], reportName: dataset.name, globalFilters: [] }));
                }
            });
        } else {
            // New report mode - clear everything
            setWidgets([]);
            setGlobalFilters([]);
            setReportId(null);
            setReportName(dataset.name);
            setLastSaved(null);
            setLastSavedState(JSON.stringify({ widgets: [], reportName: dataset.name, globalFilters: [] }));
        }
    }, [dataset.id, initialReportId, dataset.name, userId]);
    const handleSave = async (isSaveAs: boolean = false) => {
        if (!user || !dataset.id) return;

        let nameToSave = reportName;
        const isNewReport = !reportId || isSaveAs;

        if (isNewReport) {
            const canCreate = await checkReportLimit(dataset.id);
            if (!canCreate) {
                alert('Límite de reportes por dataset alcanzado (3).');
                return;
            }

            const name = prompt(t('canvas.report_name_prompt'), isSaveAs ? `${reportName} (Copy)` : reportName);
            if (!name || name.trim() === '') {
                alert(t('canvas.report_name_required'));
                return;
            }
            nameToSave = name.trim();
        }

        setIsSaving(true);
        try {
            const reportData: any = {
                dataset_id: dataset.id,
                user_id: user.id,
                name: nameToSave,
                widgets: widgets,
                filters: globalFilters
            };

            if (!isNewReport) {
                reportData.id = reportId;
            }

            const saved = await saveReport(reportData);

            if (saved && saved.id) {
                setReportId(saved.id);
                setReportName(nameToSave);
                setLastSavedState(JSON.stringify({
                    widgets: widgets,
                    reportName: nameToSave,
                    globalFilters: globalFilters
                }));
                setHasUnsavedChanges(false);
                onChangesStatusChange?.(false);
            }
            setLastSaved(new Date());
            setIsReportSettingsOpen(false);
        } catch (err) {
            console.error('Error saving report:', err);
            alert('Failed to save report.');
        } finally {
            setIsSaving(false);
        }
    };

    const addWidget = (type: ChartType) => {
        if (widgets.length >= 9) {
            alert(t('canvas.limit_reached'));
            return;
        }

        const numericCol = dataset.stats.find(s => ['BIGINT', 'DOUBLE', 'INTEGER', 'DECIMAL'].includes(s.type))?.column || dataset.columns[1]?.name;
        const categoricalCol = dataset.columns[0]?.name;
        const latitudeCol = dataset.columns.find(col => /^(lat|latitude)$/i.test(col.name))?.name || dataset.columns[0]?.name;
        const longitudeCol = dataset.columns.find(col => /^(lng|lon|longitude)$/i.test(col.name))?.name || dataset.columns[1]?.name || dataset.columns[0]?.name;

        // Horizontal filling logic: 3 columns per row
        const nextIndex = widgets.length;
        const x = nextIndex % 3;
        const y = Math.floor(nextIndex / 3) * 2;

        const newWidget: Widget = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            title: type === 'pie' ? `Top 10 - ${numericCol} by ${categoricalCol}` : type === 'card' ? `Nuevo indicador de ${numericCol}` : type === 'map' ? `Nuevo mapa de ${numericCol}` : `Nuevo Gráfico de ${type}`,
            xAxis: categoricalCol,
            yAxis: numericCol,
            aggregation: type === 'map' ? 'SUM' : type === 'card' ? 'SUM' : 'SUM',
            columns: type === 'table' ? [categoricalCol, numericCol] : undefined,
            latitudeField: type === 'map' ? latitudeCol : undefined,
            longitudeField: type === 'map' ? longitudeCol : undefined,
            x,
            y,
            w: type === 'card' ? 1 : type === 'map' ? 2 : 1,
            h: type === 'card' ? 2 : type === 'map' ? 3 : 3,
            topN: type === 'pie' ? 10 : undefined,
            colorScheme: 'varied',
            colorByCategory: true,
            orientation: (type === 'bar') ? 'vertical' : undefined
        };
        setWidgets([...widgets, newWidget]);
        setSelection({ type: 'widget', id: newWidget.id });
    };

    const removeWidget = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setWidgets(widgets.filter(w => w.id !== id));
        if (selection.type === 'widget' && selection.id === id) setSelection({ type: 'none' });
    };

    const updateWidget = (id: string, updates: Partial<Widget>) => {
        setWidgets(widgets.map(w => {
            if (w.id === id) {
                const updated = { ...w, ...updates };
                // Handle dynamic title for Pie chart if TopN or column changes
                if (updated.type === 'pie' && (updates.topN || updates.xAxis || updates.yAxis)) {
                    updated.title = `Top ${updated.topN || 10} - ${updated.yAxis} by ${updated.xAxis}`;
                }
                return updated;
            }
            return w;
        }));
    };

    const activeWidget = selection.type === 'widget' ? widgets.find(w => w.id === selection.id) : null;

    const aggregations: AggregationType[] = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'NONE'];
    const colorSchemes = [
        { id: 'varied', label: 'Varied (Auto)', icon: SphereIcon },
        { id: 'blues', label: 'Blues (Auto)', icon: SphereIcon },
        { id: 'solid', label: 'Solid (Single)', icon: SphereIcon }
    ];

    const handleDeleteReport = async () => {
        if (!reportId) return;
        if (window.confirm(t('canvas.confirm_delete'))) {
            try {
                if (user) {
                    await deleteReport(reportId, user.id);
                    if (onReportDeleted) onReportDeleted();
                }
            } catch (err) {
                console.error('Error deleting report:', err);
                alert('No se pudo eliminar el reporte.');
            }
        }
    };

    const handleBackToVisuals = () => setSelection({ type: 'none' });

    const addGlobalFilter = (column: string) => {
        if (globalFilters.find(f => f.column === column)) return;
        setGlobalFilters([...globalFilters, { id: Math.random().toString(36).substr(2, 9), column, value: null }]);
    };

    const removeGlobalFilter = (id: string) => {
        setGlobalFilters(globalFilters.filter(f => f.id !== id));
    };

    const updateGlobalFilterValue = (id: string, value: string | null) => {
        setGlobalFilters(globalFilters.map(f => f.id === id ? { ...f, value } : f));
    };

    return (
        <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', minHeight: '100vh', marginLeft: '-18px', marginTop: '-18px' }}>
            {/* Sidebar: Data Fields & Visual Types */}
            <div className={`canvas-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{
                width: isSidebarCollapsed ? '80px' : '260px',
                display: 'flex',
                flexDirection: 'column',
                position: 'sticky',
                top: '0',
                height: 'calc(100vh)',
                overflow: 'hidden',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 50
            }}>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="sidebar-toggle"
                    style={{
                        position: 'absolute',
                        right: isSidebarCollapsed ? 'auto' : '-12px',
                        left: isSidebarCollapsed ? 'auto' : 'auto',
                        top: '40px',
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '999px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {!isSidebarCollapsed ? (
                    <>
                        {/* Sticky Save Section */}
                        {user && (
                            <div style={{
                                padding: '32px 24px 24px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                background: 'rgba(255,255,255,0.02)'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                    <button
                                        onClick={() => handleSave(false)}
                                        disabled={isSaving || !dataset.id}
                                        className="btn-primary"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            background: isSaving ? 'var(--surface)' : 'var(--primary)',
                                            opacity: !dataset.id ? 0.5 : 1
                                        }}
                                    >
                                        {isSaving ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        {isSaving ? t('common.loading') : (reportId ? t('canvas.save') : t('canvas.save_report'))}
                                    </button>
                                    {reportId && (
                                        <button
                                            onClick={() => handleSave(true)}
                                            disabled={isSaving}
                                            className="btn-secondary"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-muted)'
                                            }}
                                        >
                                            <Save size={16} />
                                            {t('canvas.save_as')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsReportSettingsOpen(!isReportSettingsOpen)}
                                        className="btn-secondary"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            border: isReportSettingsOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                                            color: isReportSettingsOpen ? 'var(--primary)' : 'var(--text-muted)'
                                        }}
                                    >
                                        <Settings size={18} />
                                        {isReportSettingsOpen ? t('canvas.report_settings') : t('canvas.settings')}
                                    </button>
                                    {lastSaved && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', justifyContent: 'center' }}>
                                            <CheckCircle2 size={12} color="#10b981" />
                                            {t('canvas.saved_at')} {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                    {!dataset.id && (
                                        <p style={{ fontSize: '0.65rem', color: '#fbbf24', textAlign: 'center' }}>
                                            ⚠️ {t('canvas.temporary_dataset')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Scrollable Content Section */}
                        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {isReportSettingsOpen ? (
                                <div className="animate-in slide-in-from-left duration-300">
                                    <h4 style={{ marginBottom: '16px', fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Report Settings
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>{t('canvas.view_url')}</label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={reportId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/report/${reportId}` : t('canvas.no_widgets')}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        paddingRight: '40px',
                                                        background: 'var(--surface-light)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '8px',
                                                        color: 'var(--text-muted)',
                                                        fontSize: '0.75rem',
                                                        outline: 'none'
                                                    }}
                                                />
                                                <button
                                                    onClick={handleCopyURL}
                                                    disabled={!reportId}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '8px',
                                                        background: isCopied ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                                                        border: 'none',
                                                        color: isCopied ? 'var(--accent)' : 'var(--text-muted)',
                                                        cursor: reportId ? 'pointer' : 'default',
                                                        padding: '6px',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        opacity: reportId ? 1 : 0.5
                                                    }}
                                                    title={t('canvas.copy_url')}
                                                >
                                                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                                {t('canvas.public_url_note')}
                                            </p>
                                        </div>

                                        <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                                            <button
                                                onClick={handleDeleteReport}
                                                disabled={!reportId}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: 'rgba(248, 113, 113, 0.1)',
                                                    border: '1px solid rgba(248, 113, 113, 0.2)',
                                                    borderRadius: '8px',
                                                    color: '#f87171',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                <Trash2 size={18} />
                                                {t('canvas.delete_report')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {selection.type === 'filters' ? (
                                        <div className="animate-in slide-in-from-left duration-300">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {t('canvas.filters_config')}
                                                </h4>
                                                <button onClick={handleBackToVisuals} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                    Drag and drop dataset fields into the Filter Bar at the top of the canvas to create global filters.
                                                </p>
                                                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                                    <h5 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '12px' }}>{t('canvas.active_filters')} ({globalFilters.length})</h5>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {globalFilters.map(f => (
                                                            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                                <span style={{ fontSize: '0.8125rem' }}>{f.column}</span>
                                                                <button onClick={() => removeGlobalFilter(f.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : activeWidget ? (
                                        <div className="animate-in slide-in-from-left duration-300">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Widget Settings
                                                </h4>
                                                <button onClick={handleBackToVisuals} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Chart Type</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                                                        {[
                                                            { type: 'bar' as ChartType, icon: BarChart3 },
                                                            { type: 'line' as ChartType, icon: LineIcon },
                                                            { type: 'pie' as ChartType, icon: PieIcon },
                                                            { type: 'area' as ChartType, icon: ChartArea },
                                                            { type: 'treemap' as ChartType, icon: TableCellsMerge },
                                                            { type: 'table' as ChartType, icon: TableIcon },
                                                            { type: 'card' as ChartType, icon: SquareStack },
                                                            { type: 'map' as ChartType, icon: MapPinned },
                                                        ].map((t) => (
                                                            <button
                                                                key={t.type}
                                                                onClick={() => updateWidget(activeWidget.id, { type: t.type })}
                                                                style={{
                                                                    padding: '8px',
                                                                    background: activeWidget.type === t.type ? 'var(--primary-glow)' : 'var(--surface)',
                                                                    border: activeWidget.type === t.type ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                                    color: activeWidget.type === t.type ? 'var(--primary)' : 'var(--text-muted)',
                                                                    borderRadius: '6px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <t.icon size={16} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {(activeWidget.type === 'bar') && (
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Orientation</label>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                            <button
                                                                onClick={() => updateWidget(activeWidget.id, { orientation: 'vertical' })}
                                                                style={{ padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: activeWidget.orientation === 'vertical' ? 'var(--primary-glow)' : 'transparent', color: activeWidget.orientation === 'vertical' ? 'var(--primary)' : 'var(--text-muted)' }}
                                                            >
                                                                Column (V)
                                                            </button>
                                                            <button
                                                                onClick={() => updateWidget(activeWidget.id, { orientation: 'horizontal' })}
                                                                style={{ padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: activeWidget.orientation === 'horizontal' ? 'var(--primary-glow)' : 'transparent', color: activeWidget.orientation === 'horizontal' ? 'var(--primary)' : 'var(--text-muted)' }}
                                                            >
                                                                Bar (H)
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Title</label>
                                                    <input
                                                        type="text"
                                                        value={activeWidget.title}
                                                        onChange={(e) => updateWidget(activeWidget.id, { title: e.target.value })}
                                                        style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                    />
                                                </div>

                                                {/* Color Settings */}
                                                {(['bar', 'pie', 'treemap'].includes(activeWidget.type)) && (
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Color Scheme</label>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {colorSchemes.map(scheme => (
                                                                <button
                                                                    key={scheme.id}
                                                                    onClick={() => updateWidget(activeWidget.id, { colorScheme: scheme.id as any })}
                                                                    style={{
                                                                        padding: '8px 12px',
                                                                        background: activeWidget.colorScheme === scheme.id ? 'var(--primary-glow)' : 'var(--surface)',
                                                                        border: activeWidget.colorScheme === scheme.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                                        borderRadius: '6px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '8px',
                                                                        fontSize: '0.8125rem',
                                                                        color: activeWidget.colorScheme === scheme.id ? 'var(--primary)' : 'var(--text-muted)'
                                                                    }}
                                                                >
                                                                    <scheme.icon size={14} /> {scheme.label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {activeWidget.colorScheme === 'solid' && (
                                                            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Color Personalizado:</label>
                                                                <input
                                                                    type="color"
                                                                    value={activeWidget.customColor || '#8b5cf6'}
                                                                    onChange={(e) => updateWidget(activeWidget.id, { customColor: e.target.value })}
                                                                    style={{
                                                                        width: '32px',
                                                                        height: '32px',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        background: 'transparent'
                                                                    }}
                                                                />
                                                                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                                                    {activeWidget.customColor || '#8b5cf6'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {activeWidget.type === 'table' ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Gestión de Columnas</label>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '380px', overflowY: 'auto', padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                                            {(() => {
                                                                const selectedCols = activeWidget.columns || [];
                                                                const availableCols = dataset.columns.filter(c => !selectedCols.includes(c.name));
                                                                const allOrdered = [
                                                                    ...selectedCols.map(name => dataset.columns.find(c => c.name === name)!),
                                                                    ...availableCols
                                                                ];

                                                                const abbrevs: Record<string, string> = {
                                                                    'SUM': 'SUM',
                                                                    'AVG': 'AVG',
                                                                    'COUNT': 'CNT',
                                                                    'DISTINCT': 'DST'
                                                                };

                                                                return allOrdered.map((col, idx) => {
                                                                    if (!col) return null;
                                                                    const isSelected = selectedCols.includes(col.name);
                                                                    const selIdx = selectedCols.indexOf(col.name);
                                                                    const agg = activeWidget.columnAggregations?.[col.name] || 'NONE';

                                                                    return (
                                                                        <div key={col.name} style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            padding: '6px 8px',
                                                                            background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid',
                                                                            borderColor: isSelected ? 'var(--border)' : 'transparent',
                                                                            transition: 'all 0.2s'
                                                                        }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={(e) => {
                                                                                    const newCols = e.target.checked
                                                                                        ? [...selectedCols, col.name]
                                                                                        : selectedCols.filter(c => c !== col.name);
                                                                                    updateWidget(activeWidget.id, { columns: newCols });
                                                                                }}
                                                                                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                                                                            />

                                                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <span style={{
                                                                                    fontSize: '0.8125rem',
                                                                                    fontWeight: isSelected ? 500 : 400,
                                                                                    color: isSelected ? 'var(--foreground)' : 'var(--text-muted)',
                                                                                    whiteSpace: 'nowrap',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis'
                                                                                }}>
                                                                                    {col.name}
                                                                                </span>
                                                                                {isSelected && agg !== 'NONE' && (
                                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', opacity: 0.8, marginLeft: '4px' }}>
                                                                                        ({abbrevs[agg] || agg})
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {isSelected && (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                                    {/* Aggregation Select */}
                                                                                    <select
                                                                                        value={agg}
                                                                                        onChange={(e) => {
                                                                                            const newAggs = { ...(activeWidget.columnAggregations || {}), [col.name]: e.target.value as AggregationType };
                                                                                            updateWidget(activeWidget.id, { columnAggregations: newAggs });
                                                                                        }}
                                                                                        style={{
                                                                                            background: 'rgba(255,255,255,0.05)',
                                                                                            border: '1px solid var(--border)',
                                                                                            borderRadius: '4px',
                                                                                            fontSize: '0.65rem',
                                                                                            padding: '1px 2px',
                                                                                            color: 'var(--text-muted)',
                                                                                            cursor: 'pointer',
                                                                                            marginRight: '4px'
                                                                                        }}
                                                                                    >
                                                                                        <option value="NONE">NONE</option>
                                                                                        <option value="SUM">SUM</option>
                                                                                        <option value="AVG">AVG</option>
                                                                                        <option value="COUNT">COUNT</option>
                                                                                        <option value="DISTINCT">DISTINCT</option>
                                                                                    </select>

                                                                                    <button
                                                                                        disabled={selIdx === 0}
                                                                                        onClick={() => {
                                                                                            const newCols = [...selectedCols];
                                                                                            [newCols[selIdx], newCols[selIdx - 1]] = [newCols[selIdx - 1], newCols[selIdx]];
                                                                                            updateWidget(activeWidget.id, { columns: newCols });
                                                                                        }}
                                                                                        style={{ padding: '2px', color: selIdx === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)', background: 'transparent', border: 'none', cursor: selIdx === 0 ? 'default' : 'pointer' }}
                                                                                    >
                                                                                        <ChevronUp size={12} />
                                                                                    </button>
                                                                                    <button
                                                                                        disabled={selIdx === selectedCols.length - 1}
                                                                                        onClick={() => {
                                                                                            const newCols = [...selectedCols];
                                                                                            [newCols[selIdx], newCols[selIdx + 1]] = [newCols[selIdx + 1], newCols[selIdx]];
                                                                                            updateWidget(activeWidget.id, { columns: newCols });
                                                                                        }}
                                                                                        style={{ padding: '2px', color: selIdx === selectedCols.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)', background: 'transparent', border: 'none', cursor: selIdx === selectedCols.length - 1 ? 'default' : 'pointer' }}
                                                                                    >
                                                                                        <ChevronDown size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    </div>
                                                ) : activeWidget.type === 'card' ? (
                                                    <>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Value Field</label>
                                                            <select
                                                                value={activeWidget.yAxis}
                                                                onChange={(e) => updateWidget(activeWidget.id, { yAxis: e.target.value })}
                                                                style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                            >
                                                                {dataset.columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Aggregation</label>
                                                            <select
                                                                value={activeWidget.aggregation || 'SUM'}
                                                                onChange={(e) => updateWidget(activeWidget.id, { aggregation: e.target.value as AggregationType })}
                                                                style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                            >
                                                                {aggregations.filter(agg => agg !== 'NONE').map(agg => <option key={agg} value={agg}>{agg}</option>)}
                                                            </select>
                                                        </div>
                                                    </>
                                                ) : activeWidget.type === 'map' ? (
                                                    <>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Label</label>
                                                            <select
                                                                value={activeWidget.xAxis}
                                                                onChange={(e) => updateWidget(activeWidget.id, { xAxis: e.target.value })}
                                                                style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                            >
                                                                {dataset.columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Latitude</label>
                                                                <select
                                                                    value={activeWidget.latitudeField || ''}
                                                                    onChange={(e) => updateWidget(activeWidget.id, { latitudeField: e.target.value })}
                                                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                                >
                                                                    {dataset.columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Longitude</label>
                                                                <select
                                                                    value={activeWidget.longitudeField || ''}
                                                                    onChange={(e) => updateWidget(activeWidget.id, { longitudeField: e.target.value })}
                                                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                                >
                                                                    {dataset.columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Value</label>
                                                            <select
                                                                value={activeWidget.yAxis}
                                                                onChange={(e) => updateWidget(activeWidget.id, { yAxis: e.target.value })}
                                                                style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                            >
                                                                {dataset.columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Aggregation</label>
                                                                <select
                                                                    value={activeWidget.aggregation || 'SUM'}
                                                                    onChange={(e) => updateWidget(activeWidget.id, { aggregation: e.target.value as AggregationType })}
                                                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                                >
                                                                    {aggregations.map(agg => <option key={agg} value={agg}>{agg}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Top N</label>
                                                                <input
                                                                    type="number"
                                                                    value={activeWidget.topN || ''}
                                                                    placeholder="500"
                                                                    onChange={(e) => updateWidget(activeWidget.id, { topN: e.target.value ? parseInt(e.target.value) : undefined })}
                                                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>X-Axis (Dimensión)</label>
                                                            <select
                                                                value={activeWidget.xAxis}
                                                                onChange={(e) => updateWidget(activeWidget.id, { xAxis: e.target.value })}
                                                                style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                            >
                                                                {dataset.columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Y-Axis ({activeWidget.type === 'treemap' ? 'Dimensión 2' : 'Value'})</label>
                                                            <select
                                                                value={activeWidget.yAxis}
                                                                onChange={(e) => updateWidget(activeWidget.id, { yAxis: e.target.value })}
                                                                style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                            >
                                                                {dataset.columns.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                                                            </select>
                                                        </div>
                                                        {activeWidget.type !== 'treemap' && (
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Aggregation</label>
                                                                <select
                                                                    value={activeWidget.aggregation || 'NONE'}
                                                                    onChange={(e) => updateWidget(activeWidget.id, { aggregation: e.target.value as AggregationType })}
                                                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                                >
                                                                    {aggregations.map(agg => <option key={agg} value={agg}>{agg}</option>)}
                                                                </select>
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Order</label>
                                                                <select
                                                                    value={activeWidget.orderBy || ''}
                                                                    onChange={(e) => updateWidget(activeWidget.id, { orderBy: e.target.value as any || undefined })}
                                                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                                >
                                                                    <option value="">None</option>
                                                                    <option value="ASC">Ascending</option>
                                                                    <option value="DESC">Descending</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Top N</label>
                                                                <input
                                                                    type="number"
                                                                    value={activeWidget.topN || ''}
                                                                    placeholder="All"
                                                                    onChange={(e) => updateWidget(activeWidget.id, { topN: e.target.value ? parseInt(e.target.value) : undefined })}
                                                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {t('canvas.visualizations')}
                                                    </h4>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
                                                        {[
                                                            { type: 'bar' as ChartType, icon: BarChart3, label: t('canvas.visuals.bar') },
                                                            { type: 'line' as ChartType, icon: LineIcon, label: t('canvas.visuals.line') },
                                                            { type: 'pie' as ChartType, icon: PieIcon, label: t('canvas.visuals.pie') },
                                                            { type: 'area' as ChartType, icon: ChartArea, label: t('canvas.visuals.area') },
                                                            { type: 'treemap' as ChartType, icon: TableCellsMerge, label: t('canvas.visuals.treemap') },
                                                            { type: 'table' as ChartType, icon: TableIcon, label: t('canvas.visuals.table') },
                                                            { type: 'card' as ChartType, icon: SquareStack, label: t('canvas.visuals.card') },
                                                            { type: 'map' as ChartType, icon: MapPinned, label: t('canvas.visuals.map') },
                                                        ].map((item) => (
                                                        <button
                                                            key={item.type}
                                                            onClick={() => addWidget(item.type)}
                                                            title={item.label}
                                                            aria-label={item.label}
                                                            style={{
                                                                padding: '0',
                                                                width: '100%',
                                                                aspectRatio: '1 / 1',
                                                                background: 'rgba(255, 255, 255, 0.08)',
                                                                border: '1px solid var(--border)',
                                                                borderRadius: '12px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                opacity: widgets.length >= 9 ? 0.5 : 1
                                                            }}
                                                            disabled={widgets.length >= 9}
                                                            className="visual-type-btn"
                                                        >
                                                            <item.icon size={20} color="var(--primary)" strokeWidth={1.8} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Dataset Fields */}
                                            <div style={{ marginTop: '32px' }}>
                                                <h4 style={{ marginBottom: '16px', fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {t('canvas.fields')}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {dataset.columns.map((col) => (
                                                        <div
                                                            key={col.name}
                                                            draggable
                                                            onDragStart={(e) => e.dataTransfer.setData('columnName', col.name)}
                                                            className="glass glass-card"
                                                            style={{
                                                                padding: '10px 14px',
                                                                fontSize: '0.8125rem',
                                                                cursor: 'grab',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                border: '1px solid var(--border)',
                                                                background: 'var(--surface)'
                                                            }}
                                                        >
                                                            <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>⠿</span>
                                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.name}</span>
                                                            <span style={{ fontSize: '10px', background: 'var(--surface-light)', padding: '2px 6px', borderRadius: '4px', color: 'var(--primary)' }}>
                                                                {col.type}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '48px', padding: '0 8px' }}>
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving || !dataset.id}
                            title="Save Report"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                marginBottom: '12px'
                            }}
                        >
                            {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                        </button>

                        {(['bar', 'line', 'pie', 'area', 'treemap', 'table', 'card', 'map'] as ChartType[]).map((type) => {
                            const iconMap = { bar: BarChart3, line: LineIcon, pie: PieIcon, area: ChartArea, table: TableIcon, treemap: TableCellsMerge, card: SquareStack, map: MapPinned };
                            const Icon = (iconMap as any)[type];
                            return (
                                <button
                                    key={type}
                                    onClick={() => {
                                        addWidget(type);
                                        setIsSidebarCollapsed(false);
                                    }}
                                    title={type}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'color 0.2s' }}
                                >
                                </button>
                            );
                        })}

                    </div>
                )}
            </div>

            {/* Main Canvas Area */}
            <div
                style={{
                    flex: 1,
                    position: 'relative',
                    padding: '0 40px 40px',
                    minHeight: 'calc(100vh - 36px)',
                    background: 'var(--background)',
                    overflow: 'visible'
                }}
            >
                {/* Sticky Header Section */}
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    background: 'rgba(10, 10, 15, 0.8)', // Dark background matching the theme
                    backdropFilter: 'blur(12px)',
                    padding: '40px 0 20px',
                    margin: '0 0 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    {/* Header with Report Name */}
                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--primary)' }}>
                                <SphereIcon size={18} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('sidebar.reports')}</span>
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{reportName}</h2>
                        </div>
                        {hasUnsavedChanges && (
                            <div style={{ padding: '6px 12px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '20px', fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24' }} />
                                Cambios sin guardar
                            </div>
                        )}
                    </div>

                    {/* Global Filters Bar */}
                    <div
                        onClick={(e) => { e.stopPropagation(); setSelection({ type: 'filters' }); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            const columnName = e.dataTransfer.getData('columnName');
                            if (columnName) addGlobalFilter(columnName);
                        }}
                        style={{
                            height: '54px',
                            background: selection.type === 'filters' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.03)',
                            border: selection.type === 'filters' ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 16px',
                            gap: '12px',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginRight: '4px', fontWeight: 600 }}>
                            <Settings size={14} /> {t('canvas.filters').toUpperCase()}
                        </div>
                        {globalFilters.length === 0 ? (
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', opacity: 0.5 }}>{t('canvas.filter_bar_empty')}</span>
                        ) : (
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', flex: 1 }} className="hide-scrollbar">
                                {globalFilters.map(filter => {
                                    const uniqueValues = Array.from(new Set(dataset.preview.map(row => String(row[filter.column])))).slice(0, 50);
                                    return (
                                        <div key={filter.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{filter.column}:</span>
                                            <select
                                                value={filter.value || ''}
                                                onChange={(e) => updateGlobalFilterValue(filter.id, e.target.value || null)}
                                                style={{ background: 'transparent', border: 'none', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="">{t('canvas.all')}</option>
                                                {uniqueValues.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                            <button onClick={() => removeGlobalFilter(filter.id)} style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Canvas Area */}
                <div
                    style={{ flex: 1, position: 'relative', minHeight: 0, paddingBottom: '40px' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleBackToVisuals();
                    }}
                >

                    <div
                        ref={containerRef}
                        style={{
                            position: 'relative',
                            width: '100%',
                            minHeight: '600px',
                            overflow: 'visible'
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) handleBackToVisuals();
                        }}
                    >
                        {widgets.length === 0 ? (
                            <div style={{
                                position: 'absolute',
                                top: '40%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                                opacity: 0.3
                            }}>
                                <BarChart3 size={64} style={{ marginBottom: '16px' }} />
                                <p>Select a visual type to start building your report</p>
                            </div>
                        ) : (
                            isGridMounted && (
                                <ResponsiveGridLayoutComponent
                                    className="layout"
                                    layouts={{ lg: layout }}
                                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                                    cols={{ lg: 3, md: 3, sm: 2, xs: 1, xxs: 1 }}
                                    rowHeight={150}
                                    width={width}
                                    margin={[24, 24]}
                                    containerPadding={[0, 0]}
                                    onLayoutChange={onLayoutChange}
                                    draggableHandle=".glass-card"
                                    useCSSTransforms={true}
                                >
                                    {widgets.map((widget) => (
                                        <div key={widget.id} onClick={(e) => { e.stopPropagation(); setSelection({ type: 'widget', id: widget.id }); }}>
                                            <WidgetCard
                                                widget={widget}
                                                isActive={selection.type === 'widget' && selection.id === widget.id}
                                                globalFilters={globalFilters}
                                                columnsMeta={dataset.columns}
                                                onSelect={() => setSelection({ type: 'widget', id: widget.id })}
                                                onRemove={(e) => removeWidget(widget.id, e)}
                                            />
                                        </div>
                                    ))}
                                </ResponsiveGridLayoutComponent>
                            )
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .active-widget {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 25px rgba(139, 92, 246, 0.3);
                }

                .canvas-sidebar {
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.06));
                    backdrop-filter: blur(30px) saturate(170%);
                    -webkit-backdrop-filter: blur(30px) saturate(170%);
                    border-right: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.06);
                    flex-shrink: 0;
                    margin-left: 0;
                    position: sticky;
                    border-left: 1px solid rgba(255, 255, 255, 0.04);
                }

                .canvas-sidebar.collapsed .sidebar-toggle {
                    right: -12px !important;
                    top: 24px !important;
                    position: absolute;
                    transform: none;
                }

                .sidebar-toggle:hover {
                    color: var(--foreground) !important;
                    border-color: rgba(255, 255, 255, 0.3) !important;
                    background: rgba(255, 255, 255, 0.18) !important;
                }

                :global(.react-resizable-handle) {
                    bottom: 8px !important;
                    right: 8px !important;
                    left: auto !important;
                    width: 16px !important;
                    height: 16px !important;
                    background-image: none !important;
                    cursor: nwse-resize !important;
                    z-index: 20 !important;
                }

                :global(.react-resizable-handle::after) {
                    content: "";
                    position: absolute;
                    right: 0;
                    bottom: 0;
                    width: 8px;
                    height: 8px;
                    border-right: 2px solid var(--primary);
                    border-bottom: 2px solid var(--primary);
                    opacity: 0.5;
                }

                :global(.react-resizable-handle:hover) {
                    opacity: 1;
                    transform: scale(1.1);
                }

                :global(.react-grid-placeholder) {
                    background: var(--primary-glow) !important;
                    border-radius: 20px !important;
                    opacity: 0.2 !important;
                }

                .ds-option:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    background: var(--primary-glow);
                }

                .visual-type-btn:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.14) !important;
                    border-color: rgba(255, 255, 255, 0.24) !important;
                    transform: translateY(-1px);
                }
            `}</style>

        </div>
    );
});
ReportCanvas.displayName = 'ReportCanvas';

export default ReportCanvas;
