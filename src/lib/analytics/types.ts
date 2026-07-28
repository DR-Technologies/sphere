export interface DatasetColumn {
  name: string;
  type: string;
  semanticRole?: string;
  semanticConfidence?: number;
  semanticReason?: string;
}

export interface DatasetColumnStat {
  column: string;
  type: string;
  min: unknown;
  max: unknown;
  total: number;
  nulls: number;
  unique: number;
}

export interface DatasetRow {
  [key: string]: string | number | boolean | null | undefined;
}

export type JsonOrient = 'records' | 'split' | 'index' | 'columns' | 'values' | 'table';

export type DateInputFormat = 'AUTO' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY/MM/DD';

export interface DatasetImportOptions {
  sheetName?: string;
  csvDelimiter?: string;
  csvQuoteChar?: string;
  jsonOrient?: JsonOrient;
  dateFormat?: DateInputFormat;
}

export interface NormalizedDatasetManifest {
  version: 1;
  generated_at: string;
  source_format: string;
  sheet_name?: string;
  normalized_format: 'csv';
  columns: DatasetColumn[];
  stats: DatasetColumnStat[];
  transforms: string[];
  import_options?: DatasetImportOptions;
}

export interface NormalizedDatasetArtifacts {
  normalizedCsv: string;
  normalizedRows: DatasetRow[];
  manifest: NormalizedDatasetManifest;
}

export interface DatasetProfileResult {
  columns: DatasetColumn[];
  stats: DatasetColumnStat[];
  preview: DatasetRow[];
  artifacts?: NormalizedDatasetArtifacts;
}

export interface ProfileFromUrlOptions {
  normalizedFileUrl?: string;
  analyticsManifestUrl?: string;
}

export interface AnalyticsProvider {
  profileFile(file: File, options?: DatasetImportOptions): Promise<DatasetProfileResult>;
  profileFromUrl(url: string, name: string, sheetName?: string, options?: ProfileFromUrlOptions): Promise<DatasetProfileResult>;
  runQuery(query: string, options?: { datasetId?: string }): Promise<Record<string, any>[]>;
  getExcelSheetNames(file: File): Promise<string[]>;
}
