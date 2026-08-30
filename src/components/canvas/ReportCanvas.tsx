'use client';

import React, { useState, useEffect } from 'react';
import {
    Check, X, Plus, Trash2, Settings, Copy, Monitor, Layout, Search, BarChart3, PieChart as PieIcon, LineChart as LineIcon, Table as TableIcon, Merge, Activity as SphereIcon, Hash, ALargeSmall, Calendar, ChevronDown, LayoutPanelLeft, Filter, Layers, Info, ChartArea, TableCellsMerge, Loader2, ChevronRight, ChevronLeft, Save, CheckCircle2, Maximize2, ChevronUp, MapPinned, SquareStack
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ChartRenderer, { ChartType } from '../visuals/ChartRenderer';
import { saveReport, getReports, deleteReport, checkReportLimit, SavedDataset, SavedReport } from '@/lib/persistence';
import { appLogger, getErrorMessage } from '@/lib/logger';
import { ResponsiveGridLayout, ResizeHandleAxis } from 'react-grid-layout';
const ResponsiveGridLayoutComponent = ResponsiveGridLayout as any;
import { supabase } from '@/lib/supabase';
import type { ReportPresentation } from '@/lib/widgets/types';
import { buildWidgetQueryModel } from '@/lib/analytics/queryModel';
import { resolveWidgetVisualizationResult } from '@/lib/analytics/widgetResult';
import { getQuickResultTemplate, type QuickResultTemplate } from '@/lib/quickResult/templates';
import { getPresentationWidgetLayout } from '@/lib/quickResult/layout';
import ReportWidgetCard from '@/components/presentation/ReportWidgetCard';
import { normalizeReportWidgets } from '@/lib/reportLayout';
import { isSphereQaStaticRender } from '@/lib/qa';
import {
    getWidgetDefaultSize,
    getWidgetSizePolicy,
    normalizeCanvasWidgetLayout,
    REPORT_EDITOR_GRID_BREAKPOINTS,
    REPORT_EDITOR_GRID_COLS,
    REPORT_EDITOR_GRID_COMPACT_TYPE,
    REPORT_EDITOR_GRID_MARGIN,
    REPORT_EDITOR_GRID_ROW_HEIGHT
} from '@/lib/widgets/sizing';

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
    showLegend?: boolean;
    showTooltip?: boolean;
    showDataLabels?: boolean;
    numberFormat?: 'standard' | 'compact';
    dateDisplayFormat?: 'default' | 'short';
    columnAggregations?: Record<string, AggregationType>;
    latitudeField?: string;
    longitudeField?: string;
    showWidgetTitle?: boolean;
    showWidgetSubtitle?: boolean;
    showCardLabel?: boolean;
    cardValueSize?: 'small' | 'medium' | 'large';
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

type WidgetSettingsSection = 'data' | 'query' | 'presentation' | null;

interface ReportCanvasProps {
    dataset: {
        id?: string;
        name: string;
        columns: { name: string; type: string }[];
        stats: { column: string; type: string;[key: string]: any }[];
        preview: Record<string, any>[];
    };
    initialReportId?: string | null;
    initialWidgets?: Widget[];
    initialPresentation?: ReportPresentation;
    savedDatasets?: SavedDataset[];
    onReportDeleted?: () => void;
    onChangesStatusChange?: (hasChanges: boolean) => void;
    onSwitchDataset?: (dataset: SavedDataset) => void;
}

const NUMERIC_COLUMN_TYPES = new Set(['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL', 'SMALLINT']);
const PRESENTATION_CONTROL_SUPPORT: Record<ChartType, { legend: boolean; tooltip: boolean; dataLabels: boolean; colors: boolean; numberFormat: boolean; dateFormat: boolean; orientation: boolean }> = {
    bar: { legend: true, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: true },
    line: { legend: true, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: false },
    pie: { legend: true, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: false },
    area: { legend: true, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: false },
    table: { legend: false, tooltip: false, dataLabels: false, colors: false, numberFormat: true, dateFormat: true, orientation: false },
    treemap: { legend: false, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: false },
    card: { legend: false, tooltip: false, dataLabels: false, colors: false, numberFormat: true, dateFormat: false, orientation: false },
    map: { legend: false, tooltip: false, dataLabels: false, colors: true, numberFormat: true, dateFormat: false, orientation: false }
};

const WIDGET_TYPE_CAPABILITIES: Record<ChartType, {
    usesColumns: boolean;
    usesMapFields: boolean;
    usesOrientation: boolean;
    usesTopN: boolean;
    usesCardControls: boolean;
}> = {
    bar: { usesColumns: false, usesMapFields: false, usesOrientation: true, usesTopN: true, usesCardControls: false },
    line: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: true, usesCardControls: false },
    pie: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: true, usesCardControls: false },
    area: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: true, usesCardControls: false },
    table: { usesColumns: true, usesMapFields: false, usesOrientation: false, usesTopN: false, usesCardControls: false },
    treemap: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: false, usesCardControls: false },
    card: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: false, usesCardControls: true },
    map: { usesColumns: false, usesMapFields: true, usesOrientation: false, usesTopN: true, usesCardControls: false }
};

function getWidgetDisplayDefaults(type: ChartType) {
    return {
        showLegend: PRESENTATION_CONTROL_SUPPORT[type].legend,
        showTooltip: PRESENTATION_CONTROL_SUPPORT[type].tooltip,
        showDataLabels: false,
        numberFormat: 'standard' as const,
        dateDisplayFormat: 'default' as const
    };
}

function getColumnType(columnsMeta: { name: string; type: string }[], columnName?: string) {
    if (!columnName) return null;
    return columnsMeta.find((column) => column.name === columnName)?.type?.toUpperCase() || null;
}

function isExistingColumn(columnsMeta: { name: string; type: string }[], columnName?: string) {
    return Boolean(columnName && columnsMeta.some((column) => column.name === columnName));
}

function formatWidgetFieldLabel(value?: string) {
    if (!value) return '';
    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildLegacyDefaultWidgetTitle(widget: Pick<Widget, 'type' | 'xAxis' | 'yAxis' | 'topN'>) {
    if (widget.type === 'pie') {
        return `Top ${widget.topN || 10} - ${widget.yAxis} by ${widget.xAxis}`;
    }

    if (widget.type === 'card') {
        return `Nuevo indicador de ${widget.yAxis}`;
    }

    if (widget.type === 'map') {
        return `Nuevo mapa de ${widget.yAxis}`;
    }

    return `Nuevo Gráfico de ${widget.type}`;
}

function buildDefaultWidgetTitle(widget: Pick<Widget, 'type' | 'xAxis' | 'yAxis'>) {
    const xLabel = formatWidgetFieldLabel(widget.xAxis);
    const yLabel = formatWidgetFieldLabel(widget.yAxis);

    if (widget.type === 'table') {
        return 'Detalle';
    }

    if (widget.type === 'card') {
        return yLabel || 'Indicador';
    }

    if (widget.type === 'map') {
        return yLabel ? `${yLabel} por ubicación` : 'Mapa';
    }

    if (widget.type === 'treemap' && xLabel && yLabel) {
        return `${xLabel} por ${yLabel}`;
    }

    if (xLabel && yLabel) {
        return `${yLabel} por ${xLabel}`;
    }

    return yLabel || xLabel || 'Visualización';
}

function shouldRefreshWidgetTitle(currentWidget: Widget) {
    const currentTitle = currentWidget.title?.trim();

    if (!currentTitle) {
        return true;
    }

    const generatedTitles = new Set([
        buildLegacyDefaultWidgetTitle(currentWidget),
        buildDefaultWidgetTitle(currentWidget)
    ]);

    return generatedTitles.has(currentTitle);
}

function getSuggestedWidgetFields(dataset: ReportCanvasProps['dataset']) {
    const numericCol = dataset.stats.find(s => ['BIGINT', 'DOUBLE', 'INTEGER', 'DECIMAL'].includes(s.type))?.column || dataset.columns[1]?.name || dataset.columns[0]?.name || '';
    const categoricalCol = dataset.columns[0]?.name || numericCol;
    const latitudeCol = dataset.columns.find(col => /^(lat|latitude)$/i.test(col.name))?.name || dataset.columns[0]?.name || '';
    const longitudeCol = dataset.columns.find(col => /^(lng|lon|longitude)$/i.test(col.name))?.name || dataset.columns[1]?.name || dataset.columns[0]?.name || '';

    return { numericCol, categoricalCol, latitudeCol, longitudeCol };
}

function getWidgetTypeDefaults(type: ChartType, dataset: ReportCanvasProps['dataset']): Partial<Widget> {
    const { numericCol, categoricalCol, latitudeCol, longitudeCol } = getSuggestedWidgetFields(dataset);

    return {
        type,
        xAxis: categoricalCol,
        yAxis: numericCol,
        aggregation: 'SUM',
        columns: type === 'table' ? [categoricalCol, numericCol].filter(Boolean) : undefined,
        columnAggregations: type === 'table' ? {} : undefined,
        latitudeField: type === 'map' ? latitudeCol : undefined,
        longitudeField: type === 'map' ? longitudeCol : undefined,
        topN: type === 'pie' ? 10 : type === 'map' ? 500 : undefined,
        orientation: type === 'bar' ? 'vertical' : undefined,
        colorScheme: 'varied',
        colorByCategory: true,
        showWidgetTitle: true,
        showWidgetSubtitle: true,
        showCardLabel: type === 'card' ? true : undefined,
        cardValueSize: type === 'card' ? 'medium' : undefined,
        ...getWidgetDisplayDefaults(type)
    };
}

function sanitizeWidgetForType(widget: Widget, nextType: ChartType, dataset: ReportCanvasProps['dataset']): Widget {
    const capabilities = WIDGET_TYPE_CAPABILITIES[nextType];
    const defaults = getWidgetTypeDefaults(nextType, dataset);

    const nextWidget: Widget = {
        ...widget,
        ...defaults,
        id: widget.id,
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
        type: nextType,
        xAxis: isExistingColumn(dataset.columns, widget.xAxis) ? widget.xAxis : (defaults.xAxis || ''),
        yAxis: isExistingColumn(dataset.columns, widget.yAxis) ? widget.yAxis : (defaults.yAxis || ''),
        showWidgetTitle: widget.showWidgetTitle ?? true,
        showWidgetSubtitle: widget.showWidgetSubtitle ?? true
    };

    if (capabilities.usesColumns) {
        const validColumns = (widget.columns || []).filter((columnName) => isExistingColumn(dataset.columns, columnName));
        nextWidget.columns = validColumns.length > 0 ? validColumns : defaults.columns;
        nextWidget.columnAggregations = Object.fromEntries(
            Object.entries(widget.columnAggregations || {}).filter(([columnName]) => nextWidget.columns?.includes(columnName))
        );
    } else {
        nextWidget.columns = undefined;
        nextWidget.columnAggregations = undefined;
    }

    if (capabilities.usesMapFields) {
        nextWidget.latitudeField = isExistingColumn(dataset.columns, widget.latitudeField) ? widget.latitudeField : defaults.latitudeField;
        nextWidget.longitudeField = isExistingColumn(dataset.columns, widget.longitudeField) ? widget.longitudeField : defaults.longitudeField;
    } else {
        nextWidget.latitudeField = undefined;
        nextWidget.longitudeField = undefined;
    }

    nextWidget.orientation = capabilities.usesOrientation ? (widget.orientation || defaults.orientation) : undefined;
    nextWidget.topN = capabilities.usesTopN ? (widget.topN ?? defaults.topN) : undefined;

    if (capabilities.usesCardControls) {
        nextWidget.showCardLabel = widget.showCardLabel ?? true;
        nextWidget.cardValueSize = widget.cardValueSize || 'medium';
    } else {
        nextWidget.showCardLabel = undefined;
        nextWidget.cardValueSize = undefined;
    }

    if (!PRESENTATION_CONTROL_SUPPORT[nextType].legend) nextWidget.showLegend = false;
    if (!PRESENTATION_CONTROL_SUPPORT[nextType].tooltip) nextWidget.showTooltip = false;
    if (!PRESENTATION_CONTROL_SUPPORT[nextType].dataLabels) nextWidget.showDataLabels = false;
    if (!PRESENTATION_CONTROL_SUPPORT[nextType].dateFormat) nextWidget.dateDisplayFormat = getWidgetDisplayDefaults(nextType).dateDisplayFormat;
    if (!PRESENTATION_CONTROL_SUPPORT[nextType].numberFormat) nextWidget.numberFormat = getWidgetDisplayDefaults(nextType).numberFormat;

    if (nextType === 'treemap') {
        const nextYAxisType = getColumnType(dataset.columns, nextWidget.yAxis);
        if (nextYAxisType && NUMERIC_COLUMN_TYPES.has(nextYAxisType) && nextWidget.aggregation === 'NONE') {
            nextWidget.aggregation = 'SUM';
        }
        nextWidget.orderBy = undefined;
    }

    if (shouldRefreshWidgetTitle(widget)) {
        nextWidget.title = buildDefaultWidgetTitle(nextWidget);
    }

    return normalizeCanvasWidgetLayout(nextWidget);
}

function normalizeWidgetForCanvas(widget: Widget, dataset: ReportCanvasProps['dataset']) {
    const sanitized = sanitizeWidgetForType(widget, widget.type, dataset);
    return normalizeCanvasWidgetLayout(sanitized);
}

function getWidgetConfigIssue(widget: Widget, columnsMeta: { name: string; type: string }[]) {
    const columnExists = (columnName?: string) => isExistingColumn(columnsMeta, columnName);
    const isNumericAggregation = widget.aggregation === 'SUM' || widget.aggregation === 'AVG';
    const yAxisType = getColumnType(columnsMeta, widget.yAxis);

    if (widget.type === 'table') {
        const validColumns = (widget.columns || []).filter((columnName) => columnExists(columnName));
        if (validColumns.length === 0) {
            return 'Selecciona al menos una columna para mostrar la tabla.';
        }
        return null;
    }

    if (widget.type === 'card') {
        if (!columnExists(widget.yAxis)) {
            return 'Selecciona un campo de valor válido para la tarjeta.';
        }
        if (isNumericAggregation && (!yAxisType || !NUMERIC_COLUMN_TYPES.has(yAxisType))) {
            return `“${widget.yAxis}” debe ser una columna numérica para usar ${widget.aggregation}.`;
        }
        return null;
    }

    if (widget.type === 'map') {
        if (!columnExists(widget.latitudeField) || !columnExists(widget.longitudeField)) {
            return 'Selecciona campos válidos de latitud y longitud para mostrar el mapa.';
        }
        if (!columnExists(widget.yAxis)) {
            return 'Selecciona un campo de valor válido para el mapa.';
        }
        if (widget.aggregation !== 'NONE' && isNumericAggregation && (!yAxisType || !NUMERIC_COLUMN_TYPES.has(yAxisType))) {
            return `“${widget.yAxis}” debe ser una columna numérica para usar ${widget.aggregation}.`;
        }
        return null;
    }

    if (!columnExists(widget.xAxis) || !columnExists(widget.yAxis)) {
        return 'Selecciona campos válidos para configurar esta visualización.';
    }

    if (widget.aggregation !== 'NONE' && isNumericAggregation && (!yAxisType || !NUMERIC_COLUMN_TYPES.has(yAxisType))) {
        return `“${widget.yAxis}” debe ser una columna numérica para usar ${widget.aggregation}.`;
    }

    return null;
}

function buildAggregationExpression(
    columnsMeta: { name: string; type: string }[],
    columnName: string,
    aggregation: AggregationType
) {
    if (aggregation === 'COUNT') {
        return `COUNT("${columnName}")`;
    }

    if (aggregation === 'DISTINCT') {
        return `COUNT(DISTINCT "${columnName}")`;
    }

    if (aggregation === 'SUM' || aggregation === 'AVG') {
        const columnType = getColumnType(columnsMeta, columnName);
        if (!columnType || !NUMERIC_COLUMN_TYPES.has(columnType)) {
            throw new Error(`Aggregation ${aggregation} requires a numeric column.`);
        }

        return `${aggregation}("${columnName}"::double precision)`;
    }

    return `${aggregation}("${columnName}")`;
}

const WidgetCard = React.memo(({
    widget,
    isActive,
    globalFilters,
    columnsMeta,
    datasetId,
    template,
    onSelect,
    onRemove
}: {
    widget: Widget;
    isActive: boolean;
    globalFilters: GlobalFilter[];
    columnsMeta: { name: string; type: string }[];
    datasetId?: string;
    template: QuickResultTemplate;
    onSelect: () => void;
    onRemove: (e: React.MouseEvent) => void;
}) => {
    const [data, setData] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const configIssue = React.useMemo(() => getWidgetConfigIssue(widget, columnsMeta), [widget, columnsMeta]);
    const qaStaticRender = React.useMemo(() => isSphereQaStaticRender(), []);

    useEffect(() => {
        const fetchData = async () => {
            if (configIssue) {
                setLoading(false);
                setData([]);
                setError(configIssue);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                if (!datasetId) {
                    setData([]);
                    return;
                }

                const built = buildWidgetQueryModel(widget as any, columnsMeta as any, globalFilters as any);
                if (!built.model) {
                    setError(built.issue || 'Configuración incompleta.');
                    setData([]);
                    return;
                }

                const result = await resolveWidgetVisualizationResult(built.model, columnsMeta as any, datasetId);
                setData(result.rows);
                setError(result.issue);
            } catch (err: unknown) {
                appLogger.error('analytics', 'WIDGET_QUERY_FAILED', 'Failed to fetch widget data.', {
                    error: err,
                    meta: {
                        widgetId: widget.id,
                        widgetType: widget.type,
                        aggregation: widget.aggregation,
                        xAxis: widget.xAxis,
                        yAxis: widget.yAxis
                    }
                });
                const msg = getErrorMessage(err, '');
                if (msg.includes('No function matches')) {
                    setError(`Aggregation ${widget.aggregation} not supported for this column type.`);
                } else if (msg.includes('requires a numeric column')) {
                    setError(`"${widget.yAxis}" debe ser una columna numérica para usar ${widget.aggregation}.`);
                } else {
                    setError('No se pudo cargar el widget. Revisa que los campos y la agregación sean compatibles.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [configIssue, widget.xAxis, widget.yAxis, widget.aggregation, widget.columns, widget.type, widget.orderBy, widget.topN, globalFilters, widget.colorScheme, widget.customColor, widget.colorByCategory, widget.orientation, widget.columnAggregations, widget.latitudeField, widget.longitudeField, datasetId]);

    const layout = getPresentationWidgetLayout(widget as unknown as import('@/lib/widgets/types').Widget);

    return (
        <div onClick={onSelect} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <ReportWidgetCard
                widget={widget as unknown as import('@/lib/widgets/types').Widget}
                template={template}
                layout={layout}
                error={error}
                style={isActive ? { boxShadow: `0 0 0 1px ${template.accent}, 0 18px 38px rgba(3, 7, 18, 0.26)` } : undefined}
            >
                {loading ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', zIndex: 10 }}>
                        <Loader2 size={32} className="animate-spin" color={template.accent} />
                    </div>
                ) : (
                    <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 0, minWidth: 0, width: '100%', display: 'flex' }}>
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
                            showLegend={widget.showLegend ?? getWidgetDisplayDefaults(widget.type).showLegend}
                            showTooltip={widget.showTooltip ?? getWidgetDisplayDefaults(widget.type).showTooltip}
                            showDataLabels={widget.showDataLabels ?? getWidgetDisplayDefaults(widget.type).showDataLabels}
                            numberFormat={widget.numberFormat ?? getWidgetDisplayDefaults(widget.type).numberFormat}
                            dateDisplayFormat={widget.dateDisplayFormat ?? getWidgetDisplayDefaults(widget.type).dateDisplayFormat}
                            showCardLabel={widget.showCardLabel ?? true}
                            cardValueSize={widget.cardValueSize ?? 'medium'}
                            tableMaxHeight={layout.maxTableHeight}
                            colors={template.chartColors}
                            renderMode={qaStaticRender ? 'qa' : 'interactive'}
                        />
                    </div>
                )}
            </ReportWidgetCard>
            <div
                style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: '999px',
                    color: template.mutedText,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    background: `color-mix(in srgb, ${template.surfaceAlt} 84%, transparent)`,
                    border: `1px solid ${template.border}`,
                    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.12)',
                    backdropFilter: 'blur(12px) saturate(120%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(120%)'
                }}
            >
                <span>{widget.type}</span>
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
                        color: template.mutedText,
                        border: `1px solid ${template.border}`,
                        borderRadius: '999px',
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
    );
});
WidgetCard.displayName = 'WidgetCard';

const ReportCanvas = React.forwardRef<{ handleSave: (isSaveAs?: boolean) => Promise<void>; reportName: string }, ReportCanvasProps>(({
    dataset,
    initialReportId,
    initialWidgets = [],
    initialPresentation,
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
        return widgets.map(w => {
            const policy = getWidgetSizePolicy(w.type);

            return {
            i: w.id,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            minW: policy.minW,
            maxW: policy.maxW,
            minH: policy.minH,
            maxH: policy.maxH,
            resizeHandles: ['se'] as ResizeHandleAxis[]
            };
        });
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
    const [isNarrowViewport, setIsNarrowViewport] = useState(false);
    const [user, setUser] = useState<any>(null); // Supabase User type can be complex, using any temporarily but scoped
    const [reportId, setReportId] = useState<string | null>(initialReportId || null);
    const [reportName, setReportName] = useState(initialPresentation?.title || dataset.name);
    const activeTemplate = React.useMemo(
        () => getQuickResultTemplate(initialPresentation?.templateId || 'modern'),
        [initialPresentation?.templateId]
    );
    const [isReportSettingsOpen, setIsReportSettingsOpen] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSavedState, setLastSavedState] = useState<string>('');
    const [globalFilters, setGlobalFilters] = useState<GlobalFilter[]>([]);
    const [isCopied, setIsCopied] = useState(false);
    const [openSettingsSection, setOpenSettingsSection] = useState<WidgetSettingsSection>(null);

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

    useEffect(() => {
        if (selection.type === 'widget') {
            setOpenSettingsSection(null);
        }
    }, [selection]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const media = window.matchMedia('(max-width: 1180px)');
        const sync = () => {
            setIsNarrowViewport(media.matches);
            setIsSidebarCollapsed(media.matches);
        };

        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

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
        const normalizedInitialWidgets = normalizeReportWidgets(
            initialWidgets.map((widget) => normalizeWidgetForCanvas(widget, dataset))
        );

        if (!dataset.id || !userId) {
            setLastSavedState(JSON.stringify({ widgets: normalizedInitialWidgets, reportName: initialPresentation?.title || dataset.name, globalFilters: [] }));
            return;
        }

        if (initialReportId) {
            getReports(userId, dataset.id).then(reports => {
                const existingReport = reports.find(r => r.id === initialReportId);

                if (existingReport) {
                    const sanitizedWidgets = normalizeReportWidgets(
                        existingReport.widgets.map((widget) => normalizeWidgetForCanvas(widget as Widget, dataset))
                    );
                    setWidgets(sanitizedWidgets);
                    setGlobalFilters(existingReport.filters || []);
                    setReportId(existingReport.id);
                    setReportName(existingReport.name);
                    setLastSaved(new Date((existingReport as any).updated_at || existingReport.created_at));
                    setLastSavedState(JSON.stringify({
                        widgets: sanitizedWidgets,
                        reportName: existingReport.name,
                        globalFilters: existingReport.filters || []
                    }));
                } else {
                    // If ID was provided but not found, reset or keep current? 
                    // Mostly fails if report was deleted.
                    setWidgets(normalizedInitialWidgets);
                    setGlobalFilters([]);
                    setReportId(null);
                    setReportName(initialPresentation?.title || dataset.name);
                    setLastSavedState(JSON.stringify({ widgets: normalizedInitialWidgets, reportName: initialPresentation?.title || dataset.name, globalFilters: [] }));
                }
            });
        } else {
            // New report mode - clear everything
            setWidgets(normalizedInitialWidgets);
            setGlobalFilters([]);
            setReportId(null);
            setReportName(initialPresentation?.title || dataset.name);
            setLastSaved(null);
            setLastSavedState(JSON.stringify({ widgets: normalizedInitialWidgets, reportName: initialPresentation?.title || dataset.name, globalFilters: [] }));
        }
    }, [dataset.id, initialPresentation?.title, initialReportId, initialWidgets, dataset.name, userId]);
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
            const sanitizedWidgets = normalizeReportWidgets(
                widgets.map((widget) => sanitizeWidgetForType(widget, widget.type, dataset))
            );
            const reportData: any = {
                dataset_id: dataset.id,
                user_id: user.id,
                name: nameToSave,
                widgets: sanitizedWidgets,
                filters: globalFilters,
                presentation: initialPresentation ? { ...initialPresentation, title: nameToSave } : undefined
            };

            if (!isNewReport) {
                reportData.id = reportId;
            }

            const saved = await saveReport(reportData);

            if (saved && saved.id) {
                setReportId(saved.id);
                setReportName(nameToSave);
                setWidgets(sanitizedWidgets);
                setLastSavedState(JSON.stringify({
                    widgets: sanitizedWidgets,
                    reportName: nameToSave,
                    globalFilters: globalFilters
                }));
                setHasUnsavedChanges(false);
                onChangesStatusChange?.(false);
            }
            setLastSaved(new Date());
            setIsReportSettingsOpen(false);
        } catch (err) {
            appLogger.error('analytics', 'SAVE_REPORT_FROM_CANVAS_FAILED', 'Failed to save report from canvas.', {
                error: err,
                meta: { datasetId: dataset.id, reportId }
            });
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

        const defaultSize = getWidgetDefaultSize(type);
        const nextY = widgets.reduce((max, current) => Math.max(max, current.y + current.h), 0);
        const widgetDefaults = getWidgetTypeDefaults(type, dataset);

        const newWidget = normalizeCanvasWidgetLayout({
            id: Math.random().toString(36).substr(2, 9),
            type,
            xAxis: widgetDefaults.xAxis || '',
            yAxis: widgetDefaults.yAxis || '',
            aggregation: widgetDefaults.aggregation || 'SUM',
            columns: widgetDefaults.columns,
            columnAggregations: widgetDefaults.columnAggregations,
            latitudeField: widgetDefaults.latitudeField,
            longitudeField: widgetDefaults.longitudeField,
            topN: widgetDefaults.topN,
            orientation: widgetDefaults.orientation,
            colorScheme: widgetDefaults.colorScheme,
            colorByCategory: widgetDefaults.colorByCategory,
            showLegend: widgetDefaults.showLegend,
            showTooltip: widgetDefaults.showTooltip,
            showDataLabels: widgetDefaults.showDataLabels,
            numberFormat: widgetDefaults.numberFormat,
            dateDisplayFormat: widgetDefaults.dateDisplayFormat,
            showWidgetTitle: widgetDefaults.showWidgetTitle,
            showWidgetSubtitle: widgetDefaults.showWidgetSubtitle,
            showCardLabel: widgetDefaults.showCardLabel,
            cardValueSize: widgetDefaults.cardValueSize,
            x: 0,
            y: nextY,
            w: defaultSize.w,
            h: defaultSize.h,
            title: buildDefaultWidgetTitle({
                type,
                xAxis: widgetDefaults.xAxis || '',
                yAxis: widgetDefaults.yAxis || ''
            })
        });
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
                const updated = updates.type && updates.type !== w.type
                    ? sanitizeWidgetForType({ ...w, ...updates }, updates.type, dataset)
                    : normalizeCanvasWidgetLayout({ ...w, ...updates });
                const titleRelevantUpdates = updates.type !== undefined
                    || updates.xAxis !== undefined
                    || updates.yAxis !== undefined
                    || updates.latitudeField !== undefined
                    || updates.longitudeField !== undefined;

                if (titleRelevantUpdates && updates.title === undefined && shouldRefreshWidgetTitle(w)) {
                    updated.title = buildDefaultWidgetTitle(updated);
                }
                return updated;
            }
            return w;
        }));
    };

    const activeWidget = selection.type === 'widget' ? widgets.find(w => w.id === selection.id) : null;
    const activePresentationSupport = activeWidget ? PRESENTATION_CONTROL_SUPPORT[activeWidget.type] : null;

    const aggregations: AggregationType[] = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'NONE'];
    const colorSchemes = [
        { id: 'varied', label: 'Varied (Auto)', icon: SphereIcon },
        { id: 'blues', label: 'Blues (Auto)', icon: SphereIcon },
        { id: 'solid', label: 'Solid (Single)', icon: SphereIcon }
    ];

    const renderSettingsSection = (section: WidgetSettingsSection, title: string, content: React.ReactNode) => {
        const isOpen = openSettingsSection === section;

        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    paddingBottom: '4px',
                    borderBottom: isOpen ? 'none' : '1px solid rgba(255, 255, 255, 0.05)'
                }}
            >
                <button
                    onClick={() => setOpenSettingsSection(current => current === section ? null : section)}
                    style={{
                        width: '100%',
                        padding: '0 0 4px',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'var(--foreground)',
                        cursor: 'pointer'
                    }}
                >
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {title}
                    </span>
                    <ChevronDown
                        size={14}
                        style={{
                            color: 'var(--text-muted)',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                        }}
                    />
                </button>
                {isOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '4px' }}>
                        {content}
                    </div>
                )}
            </div>
        );
    };

    const renderDataSettings = () => {
        if (!activeWidget) return null;

        const titleControl = (
            <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Title</label>
                <input
                    type="text"
                    value={activeWidget.title}
                    onChange={(e) => updateWidget(activeWidget.id, { title: e.target.value })}
                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                />
            </div>
        );

        if (activeWidget.type === 'table') {
            return titleControl;
        }

        if (activeWidget.type === 'card') {
            return (
                <>
                    {titleControl}
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
                </>
            );
        }

        if (activeWidget.type === 'map') {
            return (
                <>
                    {titleControl}
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
                </>
            );
        }

        return (
            <>
                {titleControl}
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
            </>
        );
    };

    const renderQuerySettings = () => {
        if (!activeWidget) return null;

        if (activeWidget.type === 'table') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Gestión de Columnas</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '380px', overflowY: 'auto', padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        {(() => {
                            const selectedCols = activeWidget.columns || [];
                            const availableCols = dataset.columns.filter(c => !selectedCols.includes(c.name));
                            const allOrdered = [
                                ...selectedCols.map(name => dataset.columns.find(c => c.name === name)!),
                                ...availableCols
                            ];

                            return allOrdered.map((col) => {
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
                                        </div>

                                        {isSelected && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
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
                                                        width: '52px',
                                                        minWidth: '52px',
                                                        padding: '1px 2px',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        marginRight: '4px'
                                                    }}
                                                >
                                                    <option value="NONE">NONE</option>
                                                    <option value="SUM">SUM</option>
                                                    <option value="AVG">AVG</option>
                                                    <option value="COUNT">CNT</option>
                                                    <option value="DISTINCT">DST</option>
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
            );
        }

        if (activeWidget.type === 'card') {
            return (
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
            );
        }

        if (activeWidget.type === 'map') {
            return (
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
            );
        }

        return (
            <>
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
                            onChange={(e) => updateWidget(activeWidget.id, { orderBy: e.target.value as Widget['orderBy'] || undefined })}
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
        );
    };

    const renderPresentationSettings = () => {
        if (!activeWidget || !activePresentationSupport) return null;

        return (
            <>
                {activeWidget.type === 'bar' && (
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

                {(activePresentationSupport.legend || activePresentationSupport.tooltip || activePresentationSupport.dataLabels) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {activePresentationSupport.legend && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                <input
                                    type="checkbox"
                                    checked={activeWidget.showLegend ?? getWidgetDisplayDefaults(activeWidget.type).showLegend}
                                    onChange={(e) => updateWidget(activeWidget.id, { showLegend: e.target.checked })}
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                Legend
                            </label>
                        )}
                        {activePresentationSupport.tooltip && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                <input
                                    type="checkbox"
                                    checked={activeWidget.showTooltip ?? getWidgetDisplayDefaults(activeWidget.type).showTooltip}
                                    onChange={(e) => updateWidget(activeWidget.id, { showTooltip: e.target.checked })}
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                Tooltip
                            </label>
                        )}
                        {activePresentationSupport.dataLabels && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                <input
                                    type="checkbox"
                                    checked={activeWidget.showDataLabels ?? getWidgetDisplayDefaults(activeWidget.type).showDataLabels}
                                    onChange={(e) => updateWidget(activeWidget.id, { showDataLabels: e.target.checked })}
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                Data labels
                            </label>
                        )}
                    </div>
                )}

                {activePresentationSupport.colors && (
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Color Scheme</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {colorSchemes.map(scheme => (
                                <button
                                    key={scheme.id}
                                    onClick={() => updateWidget(activeWidget.id, { colorScheme: scheme.id as Widget['colorScheme'] })}
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
                            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Custom color</label>
                                <input
                                    type="color"
                                    value={activeWidget.customColor || '#8b5cf6'}
                                    onChange={(e) => updateWidget(activeWidget.id, { customColor: e.target.value })}
                                    style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                />
                                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                    {activeWidget.customColor || '#8b5cf6'}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {(activePresentationSupport.numberFormat || activePresentationSupport.dateFormat) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {activePresentationSupport.numberFormat && (
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Number format</label>
                                <select
                                    value={activeWidget.numberFormat || getWidgetDisplayDefaults(activeWidget.type).numberFormat}
                                    onChange={(e) => updateWidget(activeWidget.id, { numberFormat: e.target.value as Widget['numberFormat'] })}
                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                >
                                    <option value="standard">Standard</option>
                                    <option value="compact">Compact</option>
                                </select>
                            </div>
                        )}
                        {activePresentationSupport.dateFormat && (
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Date format</label>
                                <select
                                    value={activeWidget.dateDisplayFormat || getWidgetDisplayDefaults(activeWidget.type).dateDisplayFormat}
                                    onChange={(e) => updateWidget(activeWidget.id, { dateDisplayFormat: e.target.value as Widget['dateDisplayFormat'] })}
                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                >
                                    <option value="default">DD/MM/YYYY</option>
                                    <option value="short">Short</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {activeWidget.type === 'card' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                <input
                                    type="checkbox"
                                    checked={activeWidget.showWidgetTitle ?? true}
                                    onChange={(e) => updateWidget(activeWidget.id, { showWidgetTitle: e.target.checked })}
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                Título
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                <input
                                    type="checkbox"
                                    checked={activeWidget.showWidgetSubtitle ?? true}
                                    onChange={(e) => updateWidget(activeWidget.id, { showWidgetSubtitle: e.target.checked })}
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                Subtítulo
                            </label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                <input
                                    type="checkbox"
                                    checked={activeWidget.showCardLabel ?? true}
                                    onChange={(e) => updateWidget(activeWidget.id, { showCardLabel: e.target.checked })}
                                    style={{ accentColor: 'var(--accent)' }}
                                />
                                Label del valor
                            </label>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tamaño del valor</label>
                                <select
                                    value={activeWidget.cardValueSize || 'medium'}
                                    onChange={(e) => updateWidget(activeWidget.id, { cardValueSize: e.target.value as Widget['cardValueSize'] })}
                                    style={{ width: '100%', padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '0.875rem' }}
                                >
                                    <option value="small">Pequeño</option>
                                    <option value="medium">Mediano</option>
                                    <option value="large">Grande</option>
                                </select>
                            </div>
                        </div>
                    </>
                )}
            </>
        );
    };

    const handleDeleteReport = async () => {
        if (!reportId) return;
        if (window.confirm(t('canvas.confirm_delete'))) {
            try {
                if (user) {
                    await deleteReport(reportId, user.id);
                    if (onReportDeleted) onReportDeleted();
                }
            } catch (err) {
                appLogger.error('analytics', 'DELETE_REPORT_FROM_CANVAS_FAILED', 'Failed to delete report from canvas.', {
                    error: err,
                    meta: { reportId }
                });
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

    const inspectorExpandedWidth = 248;
    const inspectorCollapsedWidth = 72;
    const isInspectorDrawerOpen = isNarrowViewport && !isSidebarCollapsed;
    const showInspectorContent = !isSidebarCollapsed;

    return (
        <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', minHeight: '100vh', width: '100%', position: 'relative', background: 'var(--background)' }}>
            {isInspectorDrawerOpen ? (
                <button
                    type="button"
                    aria-label="Close inspector"
                    onClick={() => setIsSidebarCollapsed(true)}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 45,
                        background: 'rgba(8, 12, 20, 0.36)',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer'
                    }}
                />
            ) : null}
            {/* Sidebar: Data Fields & Visual Types */}
            <div className={`canvas-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{
                width: isSidebarCollapsed ? `${inspectorCollapsedWidth}px` : `${inspectorExpandedWidth}px`,
                display: 'flex',
                flexDirection: 'column',
                position: isNarrowViewport ? 'absolute' : 'sticky',
                left: 0,
                top: 0,
                height: '100vh',
                overflow: 'hidden',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 50,
                transform: isNarrowViewport ? (isSidebarCollapsed ? 'translateX(-104%)' : 'translateX(0)') : 'none',
                boxShadow: isNarrowViewport && !isSidebarCollapsed ? '0 24px 60px rgba(3, 7, 18, 0.28)' : undefined
            }}>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="sidebar-toggle"
                    style={{
                        position: 'absolute',
                        right: isSidebarCollapsed ? 'auto' : '-12px',
                        left: isSidebarCollapsed ? 'auto' : 'auto',
                        top: '30px',
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

                {showInspectorContent ? (
                    <>
                        {/* Scrollable Content Section */}
                        <div style={{ padding: '20px 14px 18px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', minHeight: 0 }}>
                            {isReportSettingsOpen ? (
                                <div className="animate-in slide-in-from-left duration-300">
                                    <h4 style={{ marginBottom: '12px', fontSize: '0.84rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Report Settings
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

                                        <div style={{ paddingTop: '14px' }}>
                                            <button
                                                onClick={handleDeleteReport}
                                                disabled={!reportId}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {t('canvas.filters_config')}
                                                </h4>
                                                <button onClick={handleBackToVisuals} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                    Drag and drop dataset fields into the Filter Bar at the top of the canvas to create global filters.
                                                </p>
                                                <div style={{ paddingTop: '12px' }}>
                                                    <h5 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '12px' }}>{t('canvas.active_filters')} ({globalFilters.length})</h5>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {globalFilters.map(f => (
                                                            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border)' }}>
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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Widget Settings
                                                </h4>
                                                <button onClick={handleBackToVisuals} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
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
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: '4px' }}>
                                                    {renderSettingsSection('data', 'Datos', renderDataSettings())}
                                                    {renderSettingsSection('query', 'Consulta', renderQuerySettings())}
                                                    {activePresentationSupport && renderSettingsSection('presentation', 'Presentación', renderPresentationSettings())}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                    <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {t('canvas.visualizations')}
                                                    </h4>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
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
                                                                border: '1px solid transparent',
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
                                            <div style={{ marginTop: '24px' }}>
                                                <h4 style={{ marginBottom: '12px', fontSize: '0.84rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {t('canvas.fields')}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {dataset.columns.map((col) => (
                                                        <div
                                                            key={col.name}
                                                            draggable
                                                            onDragStart={(e) => e.dataTransfer.setData('columnName', col.name)}
                                                            className="glass glass-card"
                                                            style={{
                                                                padding: '9px 12px',
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '56px', padding: '0 8px' }}>
                        {[
                            { id: 'visuals', icon: Layout, label: t('canvas.visualizations') },
                            { id: 'fields', icon: Layers, label: t('canvas.fields') },
                            { id: 'settings', icon: Settings, label: t('canvas.settings') }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setIsSidebarCollapsed(false)}
                                title={item.label}
                                aria-label={item.label}
                                style={{
                                    width: '100%',
                                    aspectRatio: '1 / 1',
                                    background: 'transparent',
                                    border: '1px solid transparent',
                                    borderRadius: '10px',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                className="inspector-rail-btn"
                            >
                                <item.icon size={18} />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Canvas Area */}
            <div
                style={{
                    flex: 1,
                    position: 'relative',
                    padding: isNarrowViewport ? '0 16px 20px' : '0 24px 24px',
                    minHeight: '100vh',
                    background: 'var(--background)',
                    overflow: 'visible',
                    minWidth: 0
                }}
            >
                {/* Sticky Header Section */}
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    background: 'color-mix(in srgb, var(--background) 78%, transparent)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    padding: isNarrowViewport ? '18px 0 14px' : '22px 0 16px',
                    margin: '0 0 18px'
                }}>
                    {/* Header with Report Name */}
                    <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--primary)' }}>
                                <SphereIcon size={16} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('sidebar.reports')}</span>
                            </div>
                            <h2 style={{ fontSize: '1.55rem', fontWeight: 700 }}>{reportName}</h2>
                            {!dataset.id && (
                                <p style={{ marginTop: '8px', fontSize: '0.72rem', color: '#fbbf24' }}>
                                    ⚠️ {t('canvas.temporary_dataset')}
                                </p>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                            <button
                                onClick={() => setIsSidebarCollapsed(prev => !prev)}
                                className="btn-secondary"
                                style={{
                                    padding: '10px 14px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: '1px solid var(--border)',
                                    color: showInspectorContent ? 'var(--foreground)' : 'var(--text-muted)',
                                    background: showInspectorContent ? 'var(--surface-hover)' : 'var(--surface-light)'
                                }}
                            >
                                <LayoutPanelLeft size={16} />
                                {!isNarrowViewport ? 'Inspector' : (showInspectorContent ? 'Ocultar inspector' : 'Inspector')}
                            </button>
                            <button
                                onClick={() => setIsReportSettingsOpen(!isReportSettingsOpen)}
                                className="btn-secondary"
                                style={{
                                    padding: '10px 14px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: isReportSettingsOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    color: isReportSettingsOpen ? 'var(--primary)' : 'var(--text-muted)'
                                }}
                            >
                                <Settings size={16} />
                                {t('canvas.settings')}
                            </button>
                            {reportId ? (
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={isSaving}
                                    className="btn-secondary"
                                    style={{
                                        padding: '10px 14px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-muted)'
                                    }}
                                >
                                    <Save size={16} />
                                    {t('canvas.save_as')}
                                </button>
                            ) : null}
                            <button
                                onClick={() => handleSave(false)}
                                disabled={isSaving || !dataset.id}
                                className="btn-primary"
                                style={{
                                    padding: '10px 16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: !dataset.id ? 0.5 : 1
                                }}
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSaving ? t('common.loading') : (reportId ? t('canvas.save') : t('canvas.save_report'))}
                            </button>
                            <div style={{
                                padding: hasUnsavedChanges ? '7px 12px' : '7px 10px',
                                background: hasUnsavedChanges ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                                border: hasUnsavedChanges ? '1px solid rgba(251, 191, 36, 0.2)' : '1px solid rgba(16, 185, 129, 0.18)',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                color: hasUnsavedChanges ? '#fbbf24' : '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: hasUnsavedChanges ? '#fbbf24' : '#10b981' }} />
                                {hasUnsavedChanges
                                    ? 'Cambios sin guardar'
                                    : lastSaved
                                        ? `${t('canvas.saved_at')} ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : 'Listo'}
                            </div>
                        </div>
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
                            height: '50px',
                            background: selection.type === 'filters' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.03)',
                            border: selection.type === 'filters' ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 14px',
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
                                    breakpoints={REPORT_EDITOR_GRID_BREAKPOINTS}
                                    cols={REPORT_EDITOR_GRID_COLS}
                                    rowHeight={REPORT_EDITOR_GRID_ROW_HEIGHT}
                                    width={width}
                                    margin={REPORT_EDITOR_GRID_MARGIN}
                                    containerPadding={[0, 0]}
                                    onLayoutChange={onLayoutChange}
                                    draggableHandle=".glass-card"
                                    useCSSTransforms={true}
                                    compactType={REPORT_EDITOR_GRID_COMPACT_TYPE}
                                    preventCollision={false}
                                    allowOverlap={false}
                                >
                                    {widgets.map((widget) => (
                                        <div key={widget.id} onClick={(e) => { e.stopPropagation(); setSelection({ type: 'widget', id: widget.id }); }}>
                                            <WidgetCard
                                                widget={widget}
                                                isActive={selection.type === 'widget' && selection.id === widget.id}
                                                globalFilters={globalFilters}
                                                columnsMeta={dataset.columns}
                                                datasetId={dataset.id}
                                                template={activeTemplate}
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
                    top: 18px !important;
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
