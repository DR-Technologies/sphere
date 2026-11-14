'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

import {
    getDatasets, uploadDatasetAssets, saveDataset, SavedDataset, syncNormalizedDataset,
    getReports, SavedReport, deleteDataset, updateReportName, getDatasetById,
    checkDatasetLimit, deleteReport, getCurrentAccountLimits, getDatasetDeleteDependencies,
    formatDatasetDependencyMessage, DATASET_LIMIT_MESSAGE, cleanupUploadedDatasetAssets, DatasetImportError,
    AccountSuspendedError, type AccountLimits
} from '@/lib/persistence';
import { profileFile, profileFromUrl, getExcelSheetNames } from '@/lib/profiler';
import type { DatasetImportOptions, DatasetProcessingProgress, DateInputFormat, JsonOrient } from '@/lib/analytics/types';
import { isSameDatasetProgress } from '@/lib/analytics/progress';
import { appLogger, getErrorMessage } from '@/lib/logger';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import DashboardLayout from './layout/DashboardLayout';
import FileDropzone from '@/components/upload/FileDropzone';
import DataTable from '@/components/ui/DataTable';
import ReportCanvas from './canvas/ReportCanvas';
import QuickResultView from './quick-result/QuickResultView';
import StoryStudio from './story/StoryStudio';
import LoginView from './auth/LoginView';
import SphereLogo from './brand/SphereLogo';
import ThreeDotMenu from './ui/ThreeDotMenu';
import ReportPreloader from './reports/ReportPreloader';
import { ArrowRight, Activity as SphereIcon, Database, FileText, Plus, Edit2, ExternalLink, Trash2, Hash, ALargeSmall, Calendar, Clapperboard } from 'lucide-react';
import { LanguageProvider, useTranslation } from '@/lib/i18n/LanguageContext';
import SettingsView from './layout/SettingsView';
import AdminUsersView from './admin/AdminUsersView';
import { formatDate } from '@/lib/dateUtils';
import { buildQuickResultRecommendation } from '@/lib/quickResult/recommendation';
import type { ReportPresentation, Widget } from '@/lib/widgets/types';
import { deleteStory, getStories, type SavedStoryRecord } from '@/lib/story/persistence';

type ViewState = 'home' | 'datasets' | 'upload' | 'reports' | 'settings' | 'admin';

function profileProgressWithOverall(progress: DatasetProcessingProgress): DatasetProcessingProgress {
    const ranges = {
        reading: [0, 0.1],
        profiling: [0.1, 0.3],
        normalizing: [0.3, 0.55]
    } as const;
    const range = progress.stage in ranges
        ? ranges[progress.stage as keyof typeof ranges]
        : [0, 0.55] as const;
    return {
        ...progress,
        overallProgress: range[0] + Math.min(1, Math.max(0, progress.progress)) * (range[1] - range[0])
    };
}

function persistenceProgressWithOverall(progress: DatasetProcessingProgress): DatasetProcessingProgress {
    if (progress.stage === 'persisting') {
        return { ...progress, overallProgress: 0.72 + Math.min(1, progress.progress) * 0.23 };
    }
    if (progress.stage === 'finalizing') {
        return { ...progress, overallProgress: 0.95 + Math.min(1, progress.progress) * 0.04 };
    }
    return progress;
}

function importFailureMessage(error: unknown) {
    if (!(error instanceof DatasetImportError)) {
        return 'No pudimos completar la importación. No se guardó un dataset parcial; puedes reintentar.';
    }
    if (error.stage === 'uploading') {
        return `No pudimos guardar los archivos del dataset. ${error.message} Puedes reintentar.`;
    }
    if (error.stage === 'metadata') {
        return 'No pudimos registrar el dataset. Los archivos parciales se limpiaron; puedes reintentar.';
    }
    if (error.stage === 'finalizing') {
        return `${error.message} La importación no fue marcada como completada y puedes reintentar.`;
    }
    return 'No pudimos persistir todos los bloques del dataset. La carga parcial fue abortada y puedes reintentar.';
}

function DashboardContent() {
    const { t } = useTranslation();
    const [activeView, setActiveView] = useState<ViewState>('home');
    const [step, setStep] = useState<'main' | 'profiling' | 'report-loading' | 'quick' | 'canvas' | 'story'>('main');
    const [dataset, setDataset] = useState<any>(null);
    const [isProfiling, setIsProfiling] = useState(false);
    const [importProgress, setImportProgress] = useState<DatasetProcessingProgress | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [savedDatasets, setSavedDatasets] = useState<SavedDataset[]>([]);
    const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
    const [savedStories, setSavedStories] = useState<SavedStoryRecord[]>([]);
    const [accountLimits, setAccountLimits] = useState<AccountLimits>({
        role: 'standard',
        subscriptionPlan: 'free',
        status: 'active',
        maxDatasets: 3,
        maxReportsPerDataset: 3,
        maxWidgetsPerReport: 9
    });
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);
    const [previewView, setPreviewView] = useState<'stats' | 'preview'>('preview');
    const [initialReportId, setInitialReportId] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<{ view?: ViewState, step?: 'main' | 'profiling' | 'report-loading' | 'quick' | 'canvas' | 'story' } | null>(null);
    const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
    const [pendingImportFormat, setPendingImportFormat] = useState<string>('');
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [csvDelimiter, setCsvDelimiter] = useState(',');
    const [csvQuoteChar, setCsvQuoteChar] = useState('\"');
    const [jsonOrient, setJsonOrient] = useState<JsonOrient>('records');
    const [dateFormat, setDateFormat] = useState<DateInputFormat>('AUTO');
    const [quickResultWidgets, setQuickResultWidgets] = useState<Widget[]>([]);
    const [quickResultPresentation, setQuickResultPresentation] = useState<ReportPresentation | null>(null);
    const [initialStory, setInitialStory] = useState<import('@/lib/story/types').StoryDefinition | null>(null);
    const canvasRef = React.useRef<{ handleSave: (isSaveAs?: boolean) => Promise<boolean>; reportName: string } | null>(null);

    const updateImportProgress = useCallback((next: DatasetProcessingProgress | null) => {
        setImportProgress((current) => isSameDatasetProgress(current, next) ? current : next);
    }, []);

    const handleViewChange = (view: ViewState) => {
        if (hasUnsavedChanges) {
            setPendingNavigation({ view, step: 'main' });
            setShowConfirmModal(true);
            return;
        }
        setActiveView(view);
        setStep('main');
        setInitialReportId(null);
        setInitialStory(null);
        if (view === 'reports' && user) {
            void fetchSavedReports(user.id);
            void fetchSavedStories(user.id);
        }
    };

    const confirmNavigation = (action: 'save' | 'saveAs' | 'discard' | 'cancel') => {
        if (action === 'cancel') {
            setShowConfirmModal(false);
            setPendingNavigation(null);
            return;
        }

        if (action === 'discard') {
            setHasUnsavedChanges(false);
            if (pendingNavigation) {
                executePendingNavigation();
            } else {
                setStep('main');
                setInitialReportId(null);
                setShowConfirmModal(false);
            }
            return;
        }

        if (action === 'save' || action === 'saveAs') {
            if (canvasRef.current) {
                canvasRef.current.handleSave(action === 'saveAs').then((saved) => {
                    if (!saved) return;
                    setHasUnsavedChanges(false);
                    if (user) void fetchSavedReports(user.id);
                    executePendingNavigation();
                });
            }
            return;
        }
    };

    const executePendingNavigation = () => {
        if (pendingNavigation) {
            if (pendingNavigation.view) setActiveView(pendingNavigation.view);
            // Default to 'main' step if not specified, crucial for exiting canvas
            const targetStep = pendingNavigation.step || 'main';
            setStep(targetStep);
            if (targetStep !== 'quick') setInitialReportId(null);
            setInitialStory(null);
        } else {
            setStep('main');
            setInitialReportId(null);
            setInitialStory(null);
        }
        setShowConfirmModal(false);
        setPendingNavigation(null);
    };

    const fetchSavedDatasets = useCallback(async (userId?: string) => {
        const uid = userId || user?.id;
        if (!uid) return;
        setIsLoadingSaved(true);
        const data = await getDatasets(uid);
        setSavedDatasets(data);
        setIsLoadingSaved(false);
    }, [user?.id]);

    const fetchSavedReports = useCallback(async (userId?: string) => {
        const uid = userId || user?.id;
        if (!uid) return;
        try {
            const data = await getReports(uid);
            setSavedReports(data);
        } catch (error) {
            appLogger.error('analytics', 'REFRESH_REPORT_LIST_FAILED', 'Could not refresh the report list.', { error, meta: { userId: uid } });
        }
    }, [user?.id]);

    const fetchSavedStories = useCallback(async (userId?: string) => {
        const uid = userId || user?.id;
        if (!uid) return;
        const data = await getStories(uid);
        setSavedStories(data);
    }, [user?.id]);

    const handleStorySaved = useCallback(() => {
        if (user) void fetchSavedStories(user.id);
    }, [fetchSavedStories, user]);

    const handleStoryDeleted = useCallback(() => {
        if (user) void fetchSavedStories(user.id);
    }, [fetchSavedStories, user]);

    const handleReportSaved = useCallback((saved: SavedReport) => {
        setSavedReports((current) => [saved, ...current.filter((report) => report.id !== saved.id)]);
        if (saved.dataset_id === dataset?.id) {
            const savedWidgets = saved.widgets as Widget[];
            setQuickResultWidgets((current) => (
                JSON.stringify(current) === JSON.stringify(savedWidgets) ? current : savedWidgets
            ));
            const savedPresentation = saved.presentation
                ? { ...saved.presentation, title: saved.name }
                : {
                    title: saved.name,
                    subtitle: '',
                    templateId: 'modern',
                    source: 'quick-result'
                } as ReportPresentation;
            setQuickResultPresentation((current) => (
                JSON.stringify(current) === JSON.stringify(savedPresentation) ? current : savedPresentation
            ));
            setInitialReportId(saved.id);
        }
        if (user) void fetchSavedReports(user.id);
    }, [dataset?.id, fetchSavedReports, user]);

    useEffect(() => {
        let disposed = false;
        let loadedUserId: string | null = null;

        const applySession = async (event: AuthChangeEvent, session: Session | null) => {
            appLogger.debug('auth', 'AUTH_EVENT', 'Supabase auth state change received.', {
                meta: { event, hasSession: Boolean(session) }
            });
            const currentUser = session?.user ?? null;
            if (disposed) return;
            setUser(currentUser);

            if (currentUser) {
                if (loadedUserId !== currentUser.id || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    loadedUserId = currentUser.id;
                    fetchSavedDatasets(currentUser.id);
                    fetchSavedReports(currentUser.id);
                    fetchSavedStories(currentUser.id);
                    getCurrentAccountLimits()
                        .then(setAccountLimits)
                        .catch(async (limitsError) => {
                            if (limitsError instanceof AccountSuspendedError) {
                                alert(limitsError.message);
                                await supabase.auth.signOut();
                                return;
                            }
                            appLogger.error('auth', 'FETCH_ACCOUNT_LIMITS_UNHANDLED', 'Could not load account limits.', { error: limitsError });
                        });
                }
            } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
                loadedUserId = null;
                setSavedDatasets([]);
                setSavedReports([]);
                setSavedStories([]);
                setAccountLimits({ role: 'standard', subscriptionPlan: 'free', status: 'active', maxDatasets: 3, maxReportsPerDataset: 3, maxWidgetsPerReport: 9 });
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            void applySession(event, session);
        });

        // INITIAL_SESSION is normally emitted by Supabase, but an explicit read makes
        // startup deterministic if the subscription is registered after that event.
        void supabase.auth.getSession()
            .then(({ data, error }) => {
                if (error) throw error;
                return applySession('INITIAL_SESSION', data.session);
            })
            .catch((error) => {
                if (disposed) return;
                appLogger.error('auth', 'INITIAL_SESSION_FAILED', 'Could not initialize the current session.', { error });
                setUser(null);
            });

        return () => {
            disposed = true;
            subscription.unsubscribe();
        };
    }, [fetchSavedDatasets, fetchSavedReports, fetchSavedStories]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const detectCsvDelimiter = async (file: File) => {
        const sample = (await file.slice(0, 4096).text()).split(/\r?\n/).slice(0, 5).join('\n');
        const candidates = [',', ';', '\t', '|'];
        return candidates
            .map((delimiter) => ({ delimiter, score: sample.split('\n').reduce((sum, line) => sum + line.split(delimiter).length, 0) }))
            .sort((a, b) => b.score - a.score)[0]?.delimiter || ',';
    };

    const getFileDisplayPath = (file: File) => {
        const fileWithPath = file as File & { path?: string; webkitRelativePath?: string };
        return fileWithPath.path || fileWithPath.webkitRelativePath || file.name;
    };

    const buildImportOptions = (): DatasetImportOptions => ({
        sheetName: selectedSheet || undefined,
        csvDelimiter: pendingImportFormat === 'csv' ? csvDelimiter : undefined,
        csvQuoteChar: pendingImportFormat === 'csv' ? csvQuoteChar : undefined,
        jsonOrient: pendingImportFormat === 'json' ? jsonOrient : undefined,
        dateFormat
    });

    const resetImportOptions = () => {
        setPendingImportFile(null);
        setPendingImportFormat('');
        setAvailableSheets([]);
        setSelectedSheet('');
        setCsvDelimiter(',');
        setCsvQuoteChar('\"');
        setJsonOrient('records');
        setDateFormat('AUTO');
        updateImportProgress(null);
        setImportError(null);
    };

    const handleFileSelect = async (file: File) => {
        if (!user) return;

        const canUpload = await checkDatasetLimit(user.id);
        if (!canUpload) {
            alert(DATASET_LIMIT_MESSAGE);
            return;
        }

        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        setPendingImportFile(file);
        setPendingImportFormat(extension);
        setDateFormat('AUTO');
        setActiveView('upload');
        setStep('main');

        if (extension === 'csv') {
            setCsvDelimiter(await detectCsvDelimiter(file));
            setCsvQuoteChar('\"');
            return;
        }

        if (extension === 'json') {
            setJsonOrient('records');
            return;
        }

        if (extension === 'xlsx' || extension === 'xls') {
            try {
                const sheets = await getExcelSheetNames(file);
                setAvailableSheets(sheets);
                setSelectedSheet(sheets[0] || '');
            } catch (err) {
                appLogger.error('ingestion', 'READ_EXCEL_SHEETS_FAILED', 'Failed to read Excel sheet names.', { error: err });
                setAvailableSheets([]);
                setSelectedSheet('');
            }
        }
    };


    const ensureDatasetAnalyticsTable = async (saved: SavedDataset, profile: Awaited<ReturnType<typeof profileFile>>) => {
        if (saved.normalized_table_name || !profile.artifacts?.normalizedRows?.length) {
            return saved;
        }

        const normalizedTableName = await syncNormalizedDataset(saved.id, profile.columns, profile.artifacts.normalizedRows);
        if (!normalizedTableName) {
            throw new Error('No se pudo crear la tabla analítica normalizada del dataset.');
        }

        return { ...saved, normalized_table_name: normalizedTableName };
    };

    const processFile = async (file: File, importOptions: DatasetImportOptions = {}) => {
        if (!user) return;
        setIsProfiling(true);
        setStep('profiling');
        setImportError(null);
        updateImportProgress({ stage: 'reading', progress: 0 });
        let completed = false;
        try {
            const profile = await profileFile(file, importOptions, {
                onProgress: (progress) => updateImportProgress(profileProgressWithOverall(progress))
            });
            const datasetName = importOptions.sheetName ? `${file.name} (${importOptions.sheetName})` : file.name;
            if (user) {
                const totalRows = profile.artifacts?.normalizedRows.length || 0;
                updateImportProgress({ stage: 'uploading', progress: 0, overallProgress: 0.55, processedRows: totalRows, totalRows });
                const uploadedAssets = await uploadDatasetAssets(file, user.id, profile.artifacts, (completedParts, totalParts) => {
                    const progress = totalParts > 0 ? completedParts / totalParts : 0;
                    updateImportProgress({
                        stage: 'uploading',
                        progress,
                        overallProgress: 0.55 + Math.min(1, progress) * 0.15,
                        processedRows: totalRows,
                        totalRows
                    });
                });

                let savedDs: SavedDataset | null = null;
                try {
                    updateImportProgress({ stage: 'persisting', progress: 0, overallProgress: 0.7, processedRows: 0, totalRows });
                    let persistedDataset: SavedDataset;
                    try {
                        persistedDataset = await saveDataset({
                            user_id: user.id,
                            name: datasetName,
                            file_url: uploadedAssets.fileUrl,
                            normalized_file_url: uploadedAssets.normalizedFileUrl || undefined,
                            analytics_manifest_url: uploadedAssets.analyticsManifestUrl,
                            sheet_name: importOptions.sheetName,
                            columns: profile.columns,
                            stats: profile.stats
                        });
                    } catch (error) {
                        throw new DatasetImportError('metadata', 'SAVE_DATASET_METADATA_FAILED', 'No se pudo registrar el dataset.', {
                            cause: getErrorMessage(error)
                        });
                    }
                    savedDs = persistedDataset;
                    if (persistedDataset.file_url !== uploadedAssets.fileUrl
                        || persistedDataset.analytics_manifest_url !== uploadedAssets.analyticsManifestUrl) {
                        throw new DatasetImportError(
                            'metadata',
                            'DATASET_ARTIFACT_METADATA_MISMATCH',
                            'La base de datos no confirmó las referencias obligatorias de los archivos del dataset.'
                        );
                    }
                    const normalizedTableName = await syncNormalizedDataset(
                        persistedDataset.id,
                        profile.columns,
                        profile.artifacts?.normalizedRows || [],
                        (progress) => updateImportProgress(persistenceProgressWithOverall(progress))
                    );
                    const syncedDs = { ...persistedDataset, normalized_table_name: normalizedTableName };
                    const nextDataset = { id: syncedDs.id, name: datasetName, ...profile };
                    const recommendation = buildQuickResultRecommendation(nextDataset);
                    setDataset(nextDataset);
                    setQuickResultWidgets(recommendation.widgets);
                    setQuickResultPresentation(recommendation.presentation);
                    setInitialStory(null);
                    setStep('quick');
                    fetchSavedDatasets(user.id);
                    updateImportProgress({ stage: 'complete', progress: 1, overallProgress: 1, processedRows: totalRows, totalRows });
                    completed = true;
                } catch (persistenceError) {
                    if (savedDs) {
                        await deleteDataset(savedDs.id, savedDs.file_url, user.id).catch((cleanupError) => {
                            appLogger.warn('ingestion', 'ROLLBACK_PARTIAL_DATASET_FAILED', 'Could not roll back dataset metadata after import failure.', {
                                error: cleanupError,
                                meta: { datasetId: savedDs?.id }
                            });
                        });
                    }
                    await cleanupUploadedDatasetAssets(uploadedAssets);
                    throw persistenceError;
                }
            }
        } catch (err) {
            appLogger.error('ingestion', 'IMPORT_DATASET_FAILED', 'Failed to profile or persist dataset file.', {
                error: err,
                meta: {
                    extension: file.name.split('.').pop()?.toLowerCase() || 'unknown',
                    sizeBytes: file.size,
                    sheetSelected: Boolean(importOptions.sheetName),
                    stage: err instanceof DatasetImportError ? err.stage : importProgress?.stage,
                    code: err instanceof DatasetImportError ? err.code : undefined,
                    ...(err instanceof DatasetImportError ? err.diagnostics : {})
                }
            });
            setImportError(importFailureMessage(err));
            setStep('main');
        } finally {
            setIsProfiling(false);
            if (completed) resetImportOptions();
        }
    };

    const handleLoadSavedDataset = async (saved: SavedDataset) => {
        setIsProfiling(true);
        setStep('profiling');
        try {
            const profile = await profileFromUrl(saved.file_url, saved.name, saved.sheet_name, {
                normalizedFileUrl: saved.normalized_file_url,
                analyticsManifestUrl: saved.analytics_manifest_url
            });
            const syncedDataset = await ensureDatasetAnalyticsTable(saved, profile);
            const nextDataset = { id: syncedDataset.id, name: syncedDataset.name, ...profile };
            const recommendation = buildQuickResultRecommendation(nextDataset);
            setDataset(nextDataset);
            setQuickResultWidgets(recommendation.widgets);
            setQuickResultPresentation(recommendation.presentation);
            setInitialStory(null);
            setStep('quick');
        } catch (err) {
            appLogger.error('ingestion', 'LOAD_SAVED_DATASET_FAILED', 'Failed to load saved dataset.', { error: err, meta: { datasetId: saved.id } });
            alert('Failed to load saved dataset.');
            setStep('main');
        } finally {
            setIsProfiling(false);
        }
    };

    const handleLoadSavedReport = async (report: SavedReport) => {
        setIsProfiling(true);
        setStep('report-loading');
        try {
            // 1. Find the dataset metadata
            let ds = savedDatasets.find((d: SavedDataset) => d.id === report.dataset_id);
            if (!ds && user) {
                const datasets = await getDatasets(user.id);
                ds = datasets.find((d: SavedDataset) => d.id === report.dataset_id);
            }
            if (!ds) throw new Error('Dataset no encontrado');

            const profile = await profileFromUrl(ds.file_url, ds.name, ds.sheet_name, {
                normalizedFileUrl: ds.normalized_file_url,
                analyticsManifestUrl: ds.analytics_manifest_url
            });
            const syncedDataset = await ensureDatasetAnalyticsTable(ds, profile);
            setDataset({ id: syncedDataset.id, name: syncedDataset.name, ...profile });
            setQuickResultWidgets(report.widgets as Widget[]);
            setQuickResultPresentation(report.presentation
                ? { ...report.presentation, title: report.name }
                : {
                    title: report.name,
                    subtitle: '',
                    templateId: 'modern',
                    source: 'quick-result'
                });

            // Existing reports open in the same presentation surface as Instant Wow.
            setInitialReportId(report.id);
            setInitialStory(null);
            setStep('quick');
        } catch (err) {
            appLogger.error('analytics', 'LOAD_SAVED_REPORT_FAILED', 'Failed to load saved report.', { error: err, meta: { reportId: report.id } });
            alert('Fallo al cargar el reporte.');
            setStep('main');
        } finally {
            setIsProfiling(false);
        }
    };

    const handleLoadSavedStory = async (savedStory: SavedStoryRecord) => {
        setIsProfiling(true);
        setStep('profiling');
        try {
            let ds: SavedDataset | undefined = savedDatasets.find((item: SavedDataset) => item.id === savedStory.datasetId);
            if (!ds) {
                const fetched = await getDatasetById(savedStory.datasetId);
                ds = fetched || undefined;
            }
            if (!ds) throw new Error('Dataset no encontrado para esta Story.');

            const profile = await profileFromUrl(ds.file_url, ds.name, ds.sheet_name, {
                normalizedFileUrl: ds.normalized_file_url,
                analyticsManifestUrl: ds.analytics_manifest_url
            });
            const syncedDataset = await ensureDatasetAnalyticsTable(ds, profile);
            setDataset({ id: syncedDataset.id, name: syncedDataset.name, ...profile });
            setInitialReportId(savedStory.sourceReportId || null);
            setInitialStory(savedStory.storyDefinition);
            setStep('story');
        } catch (err) {
            appLogger.error('story', 'LOAD_SAVED_STORY_FAILED', 'Failed to load saved story.', {
                error: err,
                meta: { storyId: savedStory.id }
            });
            alert('No pudimos abrir la Story.');
            setStep('main');
        } finally {
            setIsProfiling(false);
        }
    };

    const handleDeleteDataset = async (ds: SavedDataset) => {
        appLogger.debug('ingestion', 'DELETE_DATASET_REQUESTED', 'Dataset deletion requested from dashboard.', {
            meta: { datasetId: ds.id }
        });
        try {
            const dependencies = await getDatasetDeleteDependencies(ds.id);
            if (dependencies.reportCount > 0 || dependencies.storyCount > 0) {
                alert(formatDatasetDependencyMessage(dependencies));
                return;
            }
        } catch (err) {
            appLogger.error('ingestion', 'CHECK_DATASET_DEPENDENCIES_FAILED', 'Failed to inspect dataset dependencies before deletion.', {
                error: err,
                meta: { datasetId: ds.id }
            });
            alert('No pudimos verificar si el dataset está en uso. No se eliminó ningún dato.');
            return;
        }

        if (window.confirm('¿Estás seguro de que deseas eliminar este dataset?')) {
            try {
                setIsProfiling(true);
                appLogger.debug('ingestion', 'DELETE_DATASET_CONFIRMED', 'Deleting dataset from Supabase.', {
                    meta: { datasetId: ds.id }
                });
                if (user) await deleteDataset(ds.id, ds.file_url, user.id);

                appLogger.debug('ingestion', 'DELETE_DATASET_SUCCEEDED', 'Dataset deletion succeeded, refreshing local state.', {
                    meta: { datasetId: ds.id }
                });
                // 1. Update local state immediately for fast UI feedback
                setSavedDatasets(prev => prev.filter(d => d.id !== ds.id));

                // 2. Refetch to sync with DB
                if (user) {
                    const updatedDatasets = await getDatasets(user.id);
                    setSavedDatasets(updatedDatasets);
                    await Promise.all([fetchSavedReports(user.id), fetchSavedStories(user.id)]);
                }

                // Explicitly clear the current dataset if it was the one deleted
                if (dataset?.id === ds.id) {
                    setDataset(null);
                    setStep('main');
                }

                alert('Dataset eliminado correctamente.');
            } catch (err: any) {
                appLogger.error('ingestion', 'DELETE_DATASET_FAILED', 'Failed to delete dataset from dashboard.', { error: err, meta: { datasetId: ds.id } });
                alert(`Error al eliminar el dataset: ${getErrorMessage(err, 'Error desconocido')}`);
            } finally {
                setIsProfiling(false);
            }
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar este reporte?')) {
            try {
                if (user) await deleteReport(reportId, user.id);
                setSavedReports((current) => current.filter((report) => report.id !== reportId));
                if (user) await fetchSavedReports(user.id);
            } catch (error) {
                alert('Error al eliminar el reporte.');
            }
        }
    };

    const handleDeleteStory = async (storyId: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta Story?')) {
            try {
                if (user) await deleteStory(storyId, user.id);
                setSavedStories((current) => current.filter((story) => story.id !== storyId));
                if (user) await fetchSavedStories(user.id);
            } catch {
                alert('Error al eliminar la Story.');
            }
        }
    };

    const handleRenameReport = async (report: SavedReport) => {
        const newName = prompt('Nuevo nombre para el reporte:', report.name);
        if (newName && newName.trim() !== '' && newName !== report.name) {
            try {
                if (user) await updateReportName(report.id, newName.trim(), user.id);
                setSavedReports((current) => current.map((item) => item.id === report.id ? { ...item, name: newName.trim() } : item));
                if (user) await fetchSavedReports(user.id);
            } catch {
                alert('Error al cambiar el nombre del reporte.');
            }
        }
    };

    if (user === undefined) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
                <div className="animate-pulse" style={{ color: 'var(--primary)', textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', margin: '0 auto 16px' }}>
                        <SphereLogo compact width={40} height={40} />
                    </div>
                    <p>Preparando tu espacio...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <LoginView />;
    }

    const handleBackToReportPreview = () => {
        if (hasUnsavedChanges) {
            setPendingNavigation({ step: 'quick' });
            setShowConfirmModal(true);
            return;
        }
        setStep('quick');
    };

    const renderContent = () => {
        if (step === 'report-loading') {
            return <ReportPreloader />;
        }

        if (step === 'canvas' && dataset) {
            return (
                <ReportCanvas
                    ref={canvasRef}
                    dataset={dataset as any}
                    initialReportId={initialReportId}
                    initialWidgets={quickResultWidgets}
                    initialPresentation={quickResultPresentation || undefined}
                    savedDatasets={savedDatasets}
                    onChangesStatusChange={(val) => setHasUnsavedChanges(val)}
                    onReportSaved={handleReportSaved}
                    onBackToPreview={handleBackToReportPreview}
                    onReportDeleted={() => {
                        setHasUnsavedChanges(false);
                        setStep('main');
                        setActiveView('reports');
                        if (user) void fetchSavedReports(user.id);
                    }}
                    onSwitchDataset={(ds) => {
                        setHasUnsavedChanges(false);
                        handleLoadSavedDataset(ds);
                    }}
                />
            );
        }

        if (step === 'quick' && dataset && user && quickResultPresentation) {
            return (
                <QuickResultView
                    dataset={dataset as any}
                    initialWidgets={quickResultWidgets}
                    initialPresentation={quickResultPresentation}
                    initialReportId={initialReportId}
                    prepareBeforeReveal={Boolean(initialReportId)}
                    userId={user.id}
                    onReportSaved={handleReportSaved}
                    onRefine={({ widgets, presentation, reportId }) => {
                        setQuickResultWidgets(widgets);
                        setQuickResultPresentation(presentation);
                        setInitialReportId(reportId || null);
                        setStep('canvas');
                    }}
                    onCreateStory={({ widgets, presentation, reportId }) => {
                        setQuickResultWidgets(widgets);
                        setQuickResultPresentation(presentation);
                        setInitialReportId(reportId || null);
                        setInitialStory(null);
                        setStep('story');
                    }}
                />
            );
        }

        if (step === 'story' && dataset && user) {
            return (
                <StoryStudio
                    dataset={dataset as any}
                    widgets={quickResultWidgets}
                    presentation={quickResultPresentation}
                    userId={user.id}
                    sourceReportId={initialReportId}
                    initialStory={initialStory}
                    onBack={() => {
                        if (initialStory) {
                            setStep('main');
                            setActiveView('reports');
                            return;
                        }
                        setStep('quick');
                    }}
                    onStorySaved={handleStorySaved}
                    onStoryDeleted={handleStoryDeleted}
                />
            );
        }

        if (step === 'profiling' && dataset) {
            return (
                <div style={{ padding: '40px' }} className="animate-in fade-in duration-500">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>{dataset.name}</h2>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button
                                    onClick={() => setPreviewView('preview')}
                                    className={`tab-btn ${previewView === 'preview' ? 'active' : ''}`}
                                >
                                    Previsualización
                                </button>
                                <button
                                    onClick={() => setPreviewView('stats')}
                                    className={`tab-btn ${previewView === 'stats' ? 'active' : ''}`}
                                >
                                    Estadísticas
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setStep('main')}
                                style={{
                                    padding: '12px 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                Cerrar
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => setStep('canvas')}
                                style={{
                                    padding: '12px 28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 15px var(--primary-glow)'
                                }}
                            >
                                Crear Reporte <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>

                    {previewView === 'stats' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {(dataset.stats as any[]).map((col: any) => {
                                const Icon = col.type === 'DATE' || col.type === 'TIMESTAMP' ? Calendar :
                                           ['BIGINT', 'DOUBLE', 'INTEGER', 'DECIMAL'].includes(col.type) ? Hash : ALargeSmall;
                                
                                return (
                                    <div key={col.column} className="glass-card stat-card" style={{ padding: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div className="stat-icon-wrapper">
                                                    <Icon size={16} />
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>{col.column}</span>
                                            </div>
                                            <span className="badge">{col.type}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div className="stat-item">
                                                <p className="stat-label">Únicos</p>
                                                <p className="stat-value">{col.unique}</p>
                                            </div>
                                            <div className="stat-item">
                                                <p className="stat-label">Nulos</p>
                                                <p className="stat-value" style={{ color: col.nulls > 0 ? '#f87171' : 'inherit' }}>{col.nulls}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="glass-card" style={{ overflow: 'hidden' }}>
                            <DataTable columns={dataset.columns} data={dataset.preview} />
                        </div>
                    )}

                    <style jsx>{`
                        .tab-btn {
                            background: rgba(255, 255, 255, 0.08);
                            padding: 8px 18px;
                            border-radius: 999px;
                            color: rgba(238, 245, 255, 0.72);
                            border: 1px solid rgba(255, 255, 255, 0.14);
                            cursor: pointer;
                            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
                        }
                        .tab-btn.active {
                            background: linear-gradient(180deg, rgba(166, 196, 255, 0.28), rgba(137, 182, 255, 0.16));
                            color: #fff;
                            border-color: rgba(196, 217, 255, 0.26);
                        }
                        .badge {
                            font-size: 0.7rem;
                            color: #fff;
                            background: rgba(255, 255, 255, 0.1);
                            padding: 5px 10px;
                            border-radius: 999px;
                            border: 1px solid rgba(255, 255, 255, 0.14);
                        }
                        .stat-card {
                            border: 1px solid rgba(255, 255, 255, 0.14);
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            background: linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%);
                            position: relative;
                            overflow: hidden;
                        }
                        .stat-card:hover {
                            transform: translateY(-4px);
                            border-color: rgba(255, 255, 255, 0.24);
                            background: linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.07) 100%);
                            box-shadow: 0 24px 44px rgba(7, 15, 29, 0.28);
                        }
                        .stat-icon-wrapper {
                            background: rgba(255, 255, 255, 0.1);
                            color: #fff;
                            padding: 8px;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border: 1px solid rgba(255, 255, 255, 0.14);
                        }
                        .stat-item {
                            padding: 12px;
                            background: rgba(255, 255, 255, 0.06);
                            border-radius: 12px;
                            border: 1px solid rgba(255, 255, 255, 0.12);
                        }
                        .stat-label { 
                            font-size: 0.7rem; 
                            color: var(--text-muted); 
                            text-transform: uppercase; 
                            letter-spacing: 0.05em;
                            margin-bottom: 4px;
                        }
                        .stat-value { 
                            font-weight: 700; 
                            font-size: 1.25rem; 
                            color: #fff;
                        }
                    `}</style>
                </div>
            );
        }

        switch (activeView) {
            case 'home':
                return (
                    <div style={{ padding: '40px' }}>
                        <header style={{ marginBottom: '48px' }}>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>
                                {t('dashboard.welcome')}, <span className="gradient-text">{user.user_metadata.full_name?.split(' ')[0] || 'Usuario'}</span>
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>{t('dashboard.welcome_sub')}</p>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px' }}>
                            <div className="glass-card action-card" onClick={() => setActiveView('upload')}>
                                <div className="card-icon"><Plus size={32} /></div>
                                <div>
                                    <h3>{t('dashboard.new_dataset')}</h3>
                                    <p>{t('dashboard.new_dataset_sub')}</p>
                                </div>
                            </div>
                            <div className="glass-card action-card" onClick={() => setActiveView('datasets')}>
                                <div className="card-icon"><Database size={32} /></div>
                                <div>
                                    <h3>{t('dashboard.explore_data')}</h3>
                                    <p>{t('dashboard.explore_data_sub')}</p>
                                </div>
                            </div>
                        </div>

                        {savedReports.length > 0 && (
                            <section>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <SphereIcon size={20} color="var(--accent)" />
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{t('dashboard.recent_reports')}</h2>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                    {savedReports.slice(0, 3).map(report => (
                                        <div key={report.id} className="glass-card ds-card" onClick={() => handleLoadSavedReport(report)}>
                                            <div className="ds-icon" style={{ color: 'var(--accent)' }}><SphereIcon size={20} /></div>
                                            <div className="ds-info">
                                                <h4>{report.name}</h4>
                                                <p>{formatDate(report.created_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <style jsx>{`
                            .action-card {
                                padding: 32px;
                                display: flex;
                                align-items: center;
                                gap: 24px;
                                cursor: pointer;
                                transition: all 0.28s ease;
                            }
                            .action-card:hover { transform: translateY(-4px); border-color: var(--shell-active-border); background: var(--surface-hover); }
                            .card-icon { color: var(--text-primary); }
                            .ds-card {
                                padding: 16px;
                                display: flex;
                                align-items: center;
                                gap: 16px;
                                cursor: pointer;
                            }
                            .ds-icon { background: var(--surface-light); padding: 10px; border-radius: 12px; color: var(--text-primary); border: 1px solid var(--border); }
                            .ds-info h4 { font-size: 0.9375rem; margin: 0; }
                            .ds-info p { font-size: 0.8125rem; color: var(--text-muted); margin: 0; }
                        `}</style>
                    </div>
                );
            case 'datasets':
                return (
                    <div style={{ padding: '40px' }}>
                        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>{t('dashboard.my_datasets')}</h2>
                                <p style={{ color: 'var(--text-muted)' }}>{t('dashboard.my_datasets_sub')}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <button
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                                    onClick={() => handleViewChange('upload')}
                                >
                                    <Plus size={18} />
                                    {t('dashboard.new_dataset')}
                                </button>
                                <div style={{ fontSize: '0.875rem', color: accountLimits.maxDatasets !== null && savedDatasets.length >= accountLimits.maxDatasets ? '#fbbf24' : 'var(--text-muted)', background: 'var(--surface)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                    {accountLimits.maxDatasets === null
                                        ? `${savedDatasets.length} · Sin límite`
                                        : `${savedDatasets.length}/${accountLimits.maxDatasets}`} {t('dashboard.my_datasets')}
                                </div>
                            </div>
                        </header>

                        {isLoadingSaved ? (
                            <p>Cargando...</p>
                        ) : savedDatasets.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                                {savedDatasets.map(ds => (
                                    <div
                                        key={ds.id}
                                        className="glass-card ds-item"
                                        onClick={(e) => {
                                            // Only trigger if not clicking on the menu or its children
                                            if (!(e.target as HTMLElement).closest('.three-dot-menu')) {
                                                handleLoadSavedDataset(ds);
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <FileText size={24} color="var(--primary)" />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {formatDate(ds.created_at)}
                                                </span>
                                                <ThreeDotMenu items={[
                                                    { label: t('common.open'), icon: <ExternalLink size={16} />, onClick: () => handleLoadSavedDataset(ds) },
                                                    { label: t('common.delete'), icon: <Trash2 size={16} />, onClick: () => handleDeleteDataset(ds), variant: 'danger' }
                                                ]} />
                                            </div>
                                        </div>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>{ds.name}</h3>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                            {ds.columns?.length || 0} Columnas • {ds.stats?.length || 0} Métricas detectadas
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
                                <Database size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                                <h3>{t('dashboard.no_datasets')}</h3>
                                <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => setActiveView('upload')}>{t('dashboard.start_now')}</button>
                            </div>
                        )}
                        <style jsx>{`
                            .ds-item { padding: 24px; cursor: pointer; transition: all 0.2s; }
                            .ds-item:hover { border-color: rgba(255, 255, 255, 0.24); transform: translateY(-2px); }
                        `}</style>
                    </div>
                );
            case 'upload':
                return (
                    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                        <header style={{ marginBottom: '32px', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Subir Dataset</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Aceptamos CSV, Excel (xlsx) y JSON.</p>
                        </header>
                        
                        {pendingImportFile ? (
                            <div className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ padding: '32px' }}>
                                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                                    <div className="ds-icon" style={{ margin: '0 auto 16px', width: 'fit-content' }}>
                                        <FileText size={32} color="var(--primary)" />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Opciones de importación</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
                                        Revisa cómo debemos leer este archivo antes de procesarlo.
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gap: '18px' }}>
                                    <label style={{ display: 'grid', gap: '8px' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ruta del archivo</span>
                                        <input
                                            value={getFileDisplayPath(pendingImportFile)}
                                            readOnly
                                            className="glass-input"
                                            style={{ width: '100%', opacity: 0.85 }}
                                        />
                                    </label>

                                    {pendingImportFormat === 'csv' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                                            <label style={{ display: 'grid', gap: '8px' }}>
                                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Separador</span>
                                                <select className="glass-input" value={csvDelimiter} onChange={(e) => setCsvDelimiter(e.target.value)}>
                                                    <option value=",">Coma (,)</option>
                                                    <option value=";">Punto y coma (;)</option>
                                                    <option value={'\t'}>Tabulación</option>
                                                    <option value="|">Pipe (|)</option>
                                                </select>
                                            </label>
                                            <label style={{ display: 'grid', gap: '8px' }}>
                                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quote char</span>
                                                <select className="glass-input" value={csvQuoteChar} onChange={(e) => setCsvQuoteChar(e.target.value)}>
                                                    <option value={'"'}>Doble comilla (&quot;)</option>
                                                    <option value={"'"}>Comilla simple (&apos;)</option>
                                                </select>
                                            </label>
                                        </div>
                                    )}

                                    {pendingImportFormat === 'json' && (
                                        <label style={{ display: 'grid', gap: '8px' }}>
                                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Orientación JSON</span>
                                            <select className="glass-input" value={jsonOrient} onChange={(e) => setJsonOrient(e.target.value as JsonOrient)}>
                                                <option value="records">records</option>
                                                <option value="split">split</option>
                                                <option value="index">index</option>
                                                <option value="columns">columns</option>
                                                <option value="values">values</option>
                                                <option value="table">table</option>
                                            </select>
                                        </label>
                                    )}

                                    {(pendingImportFormat === 'xlsx' || pendingImportFormat === 'xls') && availableSheets.length > 0 && (
                                        <label style={{ display: 'grid', gap: '8px' }}>
                                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hoja de Excel</span>
                                            <select className="glass-input" value={selectedSheet} onChange={(e) => setSelectedSheet(e.target.value)}>
                                                {availableSheets.map(sheet => (
                                                    <option key={sheet} value={sheet}>{sheet}</option>
                                                ))}
                                            </select>
                                        </label>
                                    )}

                                    <label style={{ display: 'grid', gap: '8px' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Formato estándar de fechas</span>
                                        <select className="glass-input" value={dateFormat} onChange={(e) => setDateFormat(e.target.value as DateInputFormat)}>
                                            <option value="AUTO">Auto detectar</option>
                                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                                            <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                            <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                                        </select>
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
                                    <button
                                        className="btn-secondary"
                                        style={{ flex: 1, padding: '12px' }}
                                        onClick={resetImportOptions}
                                        disabled={isProfiling}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="btn-primary"
                                        style={{ flex: 2, padding: '12px' }}
                                        onClick={() => processFile(pendingImportFile, buildImportOptions())}
                                        disabled={isProfiling}
                                    >
                                        {isProfiling ? 'Procesando...' : importError ? 'Reintentar importación' : 'Procesar archivo'}
                                    </button>
                                </div>

                                {importProgress && (
                                    <div
                                        aria-live="polite"
                                        style={{
                                            marginTop: '20px',
                                            padding: '16px',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            background: 'var(--surface-light)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
                                            <strong style={{ fontSize: '0.875rem' }}>
                                                {{
                                                    reading: 'Leyendo archivo',
                                                    profiling: 'Analizando columnas y tipos',
                                                    normalizing: 'Normalizando datos',
                                                    uploading: 'Guardando archivos',
                                                    persisting: 'Persistiendo filas',
                                                    finalizing: 'Verificando y finalizando',
                                                    complete: 'Importación completada'
                                                }[importProgress.stage]}
                                            </strong>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                                {Math.round((importProgress.overallProgress ?? importProgress.progress) * 100)}%
                                            </span>
                                        </div>
                                        <div style={{ height: '6px', overflow: 'hidden', background: 'var(--border)', borderRadius: '999px' }}>
                                            <div
                                                style={{
                                                    width: `${Math.round((importProgress.overallProgress ?? importProgress.progress) * 100)}%`,
                                                    height: '100%',
                                                    background: 'var(--primary)',
                                                    transition: 'width 160ms ease-out'
                                                }}
                                            />
                                        </div>
                                        {typeof importProgress.processedRows === 'number' && typeof importProgress.totalRows === 'number' && (
                                            <p style={{ margin: '10px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                                {importProgress.processedRows.toLocaleString()} de {importProgress.totalRows.toLocaleString()} filas
                                            </p>
                                        )}
                                    </div>
                                )}

                                {importError && !isProfiling && (
                                    <div role="alert" style={{ marginTop: '20px', color: 'var(--danger-text)', fontSize: '0.875rem' }}>
                                        {importError}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <FileDropzone onFileSelect={handleFileSelect} />
                        )}

                    </div>
                );
            case 'reports':
                return (
                    <div style={{ padding: '40px' }}>
                        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>{t('dashboard.my_reports')}</h2>
                                <p style={{ color: 'var(--text-muted)' }}>{t('dashboard.my_reports_sub')}</p>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: savedReports.length >= 10 ? '#fbbf24' : 'var(--text-muted)', background: 'var(--surface)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                {savedReports.length} {t('dashboard.my_reports')}
                            </div>
                        </header>

                        {savedReports.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                                {savedReports.map(report => (
                                    <div
                                        key={report.id}
                                        className="glass-card report-item"
                                        onClick={(e) => {
                                            if (!(e.target as HTMLElement).closest('.three-dot-menu')) {
                                                handleLoadSavedReport(report);
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <SphereIcon size={24} color="var(--accent)" />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {formatDate(report.created_at)}
                                                </span>
                                                <ThreeDotMenu items={[
                                                    { label: t('common.open'), icon: <ExternalLink size={16} />, onClick: () => handleLoadSavedReport(report) },
                                                    { label: t('common.rename'), icon: <Edit2 size={16} />, onClick: () => handleRenameReport(report) },
                                                    { label: t('common.delete'), icon: <Trash2 size={16} />, onClick: () => handleDeleteReport(report.id), variant: 'danger' }
                                                ]} />
                                            </div>
                                        </div>
                                        <h3 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>{report.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {savedDatasets.find((d: SavedDataset) => d.id === report.dataset_id)?.name || 'Dataset asociado'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: '36px', textAlign: 'center', marginBottom: '28px' }}>
                                <SphereIcon size={40} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                                <h3>{t('dashboard.no_reports')}</h3>
                                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>{t('dashboard.no_reports_sub')}</p>
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '6px' }}>Stories</h3>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Tus historias visuales guardadas y listas para publicar o exportar.</p>
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', background: 'var(--surface)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                    {savedStories.length} stories
                                </div>
                            </div>

                            {savedStories.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                    {savedStories.map(savedStory => (
                                        <div
                                            key={savedStory.id}
                                            className="glass-card report-item"
                                            onClick={(e) => {
                                                if (!(e.target as HTMLElement).closest('.three-dot-menu')) {
                                                    handleLoadSavedStory(savedStory);
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                <Clapperboard size={24} color="var(--primary)" />
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {formatDate(savedStory.updatedAt || savedStory.createdAt || new Date().toISOString())}
                                                    </span>
                                                    <ThreeDotMenu items={[
                                                        { label: t('common.open'), icon: <ExternalLink size={16} />, onClick: () => handleLoadSavedStory(savedStory) },
                                                        { label: t('common.delete'), icon: <Trash2 size={16} />, onClick: () => handleDeleteStory(savedStory.id), variant: 'danger' }
                                                    ]} />
                                                </div>
                                            </div>
                                            <h3 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>{savedStory.title}</h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                                                {savedStory.subtitle || 'Story visual lista para reproducir, publicar o exportar.'}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {savedDatasets.find((d: SavedDataset) => d.id === savedStory.datasetId)?.name || 'Dataset asociado'}
                                                </span>
                                                <span className="badge-small">{savedStory.orientation === 'portrait' ? '9:16' : '16:9'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
                                    <Clapperboard size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                                    <h3 style={{ marginBottom: '8px' }}>Aún no has creado Stories</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Genera una Story desde Quick Result y aparecerá aquí para reabrirla.</p>
                                </div>
                            )}
                        </div>
                        <style jsx>{`
                            .report-item { padding: 24px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
                            .report-item:hover { border-color: rgba(255, 255, 255, 0.24); transform: translateY(-4px); }
                            .report-item::after {
                                content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
                                background: linear-gradient(to right, transparent, rgba(255,255,255,0.75), transparent);
                                opacity: 0; transition: opacity 0.2s;
                            }
                            .report-item:hover::after { opacity: 1; }
                            .badge-small {
                                font-size: 0.65rem; background: var(--surface-light); padding: 4px 8px; border-radius: 4px; color: var(--accent);
                            }
                        `}</style>
                    </div>
                );
            case 'settings':
                return <SettingsView />;
            case 'admin':
                return accountLimits.role === 'superadmin'
                    ? <AdminUsersView />
                    : (
                        <div style={{ padding: '40px' }}>
                            <div className="glass-card" style={{ padding: '32px', maxWidth: '560px' }}>
                                <h2 style={{ marginBottom: '8px' }}>Acceso denegado</h2>
                                <p style={{ color: 'var(--text-muted)' }}>Esta sección requiere acceso SUPERADMIN.</p>
                            </div>
                        </div>
                    );
            default:
                return null;
        }
    };

    return (
        <DashboardLayout
            activeView={activeView}
            onViewChange={handleViewChange}
            onLogout={handleLogout}
            userName={user.user_metadata.full_name || user.email}
            editorMode={step === 'canvas'}
            isSuperadmin={accountLimits.role === 'superadmin'}
        >
            {renderContent()}

            {/* Unsaved Changes Confirmation Modal */}
            {showConfirmModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div className="glass-card" style={{ padding: '32px', maxWidth: '450px', width: '90%', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Cambios sin guardar</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9375rem', lineHeight: '1.5' }}>
                            Tienes cambios pendientes en tu reporte. ¿Qué deseas hacer antes de salir?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                className="btn-primary"
                                onClick={() => confirmNavigation('save')}
                                style={{ padding: '12px' }}
                            >
                                Guardar y salir
                            </button>
                            {canvasRef.current?.reportName && (
                                <button
                                    className="btn-secondary"
                                    onClick={() => confirmNavigation('saveAs')}
                                    style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#ffffffff' }}
                                >
                                    Guardar como...
                                </button>
                            )}
                            <button
                                onClick={() => confirmNavigation('discard')}
                                style={{ padding: '12px', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.875rem' }}
                            >
                                Descartar cambios
                            </button>
                            <button
                                onClick={() => confirmNavigation('cancel')}
                                style={{ padding: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

export default function Dashboard() {
    return <DashboardContent />;
}
