'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getReportById, getDatasetById, SavedReport } from '@/lib/persistence';
import { profileFromUrl, runQuery } from '@/lib/profiler';
import ChartRenderer, { ChartType } from '@/components/visuals/ChartRenderer';
import { Loader2, BarChart3, Globe } from 'lucide-react';
import { ResponsiveGridLayout } from 'react-grid-layout';

interface Widget {
    id: string;
    type: ChartType;
    title: string;
    xAxis: string;
    yAxis: string;
    aggregation: string;
    columns?: string[];
    x: number;
    y: number;
    w: number;
    h: number;
    orderBy?: 'ASC' | 'DESC';
    topN?: number;
    colorScheme?: 'varied' | 'blues' | 'solid';
    colorByCategory?: boolean;
    customColor?: string;
    columnAggregations?: Record<string, string>;
    latitudeField?: string;
    longitudeField?: string;
}

function PublicWidget({ widget, isInitialized, columnsMeta, datasetId }: { widget: Widget, isInitialized: boolean, columnsMeta: { name: string; type: string }[], datasetId: string }) {
    const [data, setData] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isInitialized) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                let query = '';
                if (widget.type === 'table' && widget.columns && widget.columns.length > 0) {
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
                        query = `SELECT ${selects} FROM dataset ${groupByClause} LIMIT 50`;
                    } else {
                        const cols = widget.columns.map(c => `"${c}"`).join(', ');
                        query = `SELECT ${cols} FROM dataset LIMIT 100`;
                    }
                } else if (widget.type === 'card') {
                    const aggExpr = widget.aggregation === 'COUNT'
                        ? `COUNT("${widget.yAxis}")`
                        : `${widget.aggregation}(TRY_CAST("${widget.yAxis}" AS DOUBLE))`;
                    query = `SELECT ${aggExpr} as "${widget.yAxis}" FROM dataset`;
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
                        ${groupByClause}
                        LIMIT ${widget.topN || 500}
                    `;
                } else if (widget.aggregation === 'NONE') {
                    const orderClause = widget.orderBy ? `ORDER BY "${widget.xAxis}" ${widget.orderBy}` : '';
                    const limitClause = widget.topN ? `LIMIT ${widget.topN}` : 'LIMIT 100';
                    query = `SELECT "${widget.xAxis}", "${widget.yAxis}" FROM dataset ${orderClause} ${limitClause}`;
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
                        GROUP BY "${widget.xAxis}"
                        ORDER BY ${orderCol} ${orderDir}
                        ${limitClause}
                    `;
                }

                const result = await runQuery(query, { datasetId });
                setData(result);
            } catch (err: unknown) {
                console.error('Error fetching widget data:', err);
                setError('Error al cargar datos');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [widget, isInitialized, datasetId]);

    return (
        <div className="glass glass-card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{widget.title}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {widget.type === 'table' ? 'Vista de tabla' : `${widget.xAxis} vs ${widget.yAxis}`}
                </p>
            </div>
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', minHeight: '250px' }}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Loader2 className="animate-spin" color="var(--primary)" />
                    </div>
                ) : error ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#f87171' }}>
                        {error}
                    </div>
                ) : (
                    <ChartRenderer 
                        type={widget.type} 
                        data={data} 
                        xAxis={widget.xAxis} 
                        yAxis={widget.yAxis} 
                        columnsMeta={columnsMeta}
                        widgetTitle={widget.title}
                        latitudeField={widget.latitudeField}
                        longitudeField={widget.longitudeField}
                        colorScheme={widget.colorScheme}
                        colorByCategory={widget.colorByCategory}
                        customColor={widget.customColor}
                    />
                )}
            </div>
        </div>
    );
}
PublicWidget.displayName = 'PublicWidget';

export default function ReportPage() {
    const { id } = useParams();
    const [report, setReport] = useState<SavedReport | null>(null);
    const [datasetColumns, setDatasetColumns] = useState<{ name: string; type: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!id) return;

        const loadData = async () => {
            try {
                const reportData = await getReportById(id as string);
                if (!reportData) {
                    setError('Reporte no encontrado');
                    setLoading(false);
                    return;
                }
                setReport(reportData);

                const dataset = await getDatasetById(reportData.dataset_id);
                if (dataset) {
                    setDatasetColumns(dataset.columns || []);
                    await profileFromUrl(dataset.file_url, dataset.name, dataset.sheet_name, {
                        normalizedFileUrl: dataset.normalized_file_url,
                        analyticsManifestUrl: dataset.analytics_manifest_url
                    });
                    setIsInitialized(true);
                } else {
                    setError('Dataset no encontrado');
                }
                setLoading(false);
            } catch (error) {
                console.error('Error loading public report:', error);
                setError('Error cargando el reporte');
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: theme === 'dark' ? 'var(--background)' : '#f8fafc',
                color: theme === 'dark' ? 'white' : '#1e293b'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={48} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 24px' }} />
                    <p style={{ color: theme === 'dark' ? 'var(--text-muted)' : '#64748b' }}>Cargando reporte público...</p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <BarChart3 size={64} color="#f87171" style={{ margin: '0 auto 24px' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{error || 'No pudimos encontrar este reporte'}</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>El enlace podría ser incorrecto o el reporte ya no existe.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh',
            overflowY: 'auto',
            background: theme === 'dark' ? 'var(--background)' : '#f8fafc',
            color: theme === 'dark' ? 'white' : '#1e293b',
            padding: '0 20px 40px',
            transition: 'background 0.3s, color 0.3s',
            position: 'relative'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <header style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    marginBottom: '48px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '40px 0 24px',
                    background: theme === 'dark' ? 'rgba(10, 10, 15, 0.8)' : 'rgba(248, 250, 252, 0.8)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--primary)' }}>
                            <Globe size={18} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vista Pública</span>
                        </div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 700 }}>{report.name}</h1>
                        <p style={{ color: theme === 'dark' ? 'var(--text-muted)' : '#64748b', marginTop: '8px' }}>Interactúa con los datos visualizados en tiempo real.</p>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        style={{
                            padding: '8px 16px',
                            background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            boxShadow: theme === 'light' ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
                            color: theme === 'dark' ? '#fff' : '#1e293b'
                        }}
                    >
                        {theme === 'dark' ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}
                    </button>
                </header>

                <div style={{ position: 'relative', width: '100%', minHeight: '600px' }}>
                    <ResponsiveGridLayout
                        className="layout"
                        layouts={{
                            lg: report.widgets.map((w: Widget) => ({
                                i: w.id,
                                x: w.x,
                                y: w.y,
                                w: w.w,
                                h: w.h,
                                static: true
                            }))
                        }}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 3, md: 3, sm: 2, xs: 1, xxs: 1 }}
                        rowHeight={120}
                        width={1200}
                        margin={[24, 24]}
                        containerPadding={[0, 0]}
                        dragConfig={{ enabled: false }}
                        resizeConfig={{ enabled: false }}
                    >
                        {report.widgets.map((widget: Widget) => (
                            <div key={widget.id}>
                                <PublicWidget widget={widget} isInitialized={isInitialized} columnsMeta={datasetColumns} datasetId={report.dataset_id} />
                            </div>
                        ))}
                    </ResponsiveGridLayout>
                </div>

                <footer style={{ marginTop: '80px', borderTop: `1px solid ${theme === 'dark' ? 'var(--border)' : '#e2e8f0'}`, paddingTop: '32px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: theme === 'dark' ? 'var(--text-muted)' : '#64748b' }}>
                        Generado con <span className="gradient-text" style={{ fontWeight: 700 }}>Sphere</span> • Herramientas de análisis rápido.
                    </p>
                </footer>
            </div>

            <style jsx global>{`
                .glass-card {
                    background: ${theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))'};
                    backdrop-filter: blur(28px) saturate(180%);
                    border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)'};
                    border-radius: 28px;
                    box-shadow: 0 24px 60px rgba(7,15,29,0.16), inset 0 1px 0 rgba(255,255,255,0.22);
                    color: ${theme === 'light' ? '#1e293b !important' : 'inherit'};
                }
                .glass-card h3 {
                    color: ${theme === 'light' ? '#1e293b' : 'white'};
                }
                .gradient-text {
                    background: linear-gradient(135deg, var(--primary), var(--accent));
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                /* Apply light theme overrides to ChartRenderer components if needed */
                ${theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''}
            `}</style>
        </div>
    );
}
