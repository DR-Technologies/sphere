export interface DatasetColumn {
  name: string;
  type: string;
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

export interface NormalizedDatasetManifest {
  version: 1;
  generated_at: string;
  source_format: string;
  sheet_name?: string;
  normalized_format: 'csv';
  columns: DatasetColumn[];
  stats: DatasetColumnStat[];
  transforms: string[];
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
  profileFile(file: File, sheetName?: string): Promise<DatasetProfileResult>;
  profileFromUrl(url: string, name: string, sheetName?: string, options?: ProfileFromUrlOptions): Promise<DatasetProfileResult>;
  runQuery(query: string, options?: { datasetId?: string }): Promise<Record<string, any>[]>;
  getExcelSheetNames(file: File): Promise<string[]>;
}
