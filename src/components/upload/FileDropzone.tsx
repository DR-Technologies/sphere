'use client';

import React, { useCallback, useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import styles from './FileDropzone.module.css';

interface FileDropzoneProps {
    onFileSelect: (file: File) => void;
}

export default function FileDropzone({ onFileSelect }: FileDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const validateFile = (file: File) => {
        const validExtensions = ['.csv', '.json', '.xlsx', '.xls'];
        const fileName = file.name.toLowerCase();
        const isValid = validExtensions.some(ext => fileName.endsWith(ext));

        if (!isValid) {
            setError('Unsupported file format. Please upload CSV, JSON, or Excel.');
            return false;
        }

        if (file.size > 50 * 1024 * 1024) {
            setError('File size exceeds 50MB limit.');
            return false;
        }

        setError(null);
        return true;
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    };

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        setError(null);
    };

    return (
        <div style={{ width: '100%' }}>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={clsx(
                    styles.dropzone,
                    isDragging && styles.dragging,
                    error && styles.error
                )}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input
                    id="file-upload"
                    type="file"
                    style={{ display: 'none' }}
                    accept=".csv,.json,.xlsx,.xls"
                    onChange={handleFileChange}
                />

                {selectedFile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className={styles.iconWrapper} style={{ background: 'rgba(139, 92, 246, 0.1)', border: 'none' }}>
                            <CheckCircle2 size={32} color="var(--primary)" />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px' }}>{selectedFile.name}</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to process
                        </p>
                        <button
                            type="button"
                            onClick={clearFile}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.875rem',
                                color: '#f87171',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={14} /> Remove and try another
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={styles.iconWrapper}>
                            <Upload size={32} color="var(--primary)" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Drop your dataset here</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                            Drag and drop your file, or click to browse
                        </p>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            {['CSV', 'JSON', 'Excel'].map(format => (
                                <span key={format} className={styles.formatBadge}>
                                    {format}
                                </span>
                            ))}
                        </div>
                    </>
                )}

                {error && (
                    <div className={styles.errorBanner}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
