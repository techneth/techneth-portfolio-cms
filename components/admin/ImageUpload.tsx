'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImageUploadProps {
    value: string;
    onChange: (value: string) => void;
    onUploadFile?: (file: File) => void;
    label?: string;
    description?: string;
    bucket?: 'blogs' | 'case_studies';
}

export default function ImageUpload({
    value,
    onChange,
    onUploadFile,
    label = "Upload Image",
    description = "Drag and drop or click to upload",
    bucket
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(value || null);
    const [isDragging, setIsDragging] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
        if (value) {
            // Basic validation to prevent "Invalid URL" errors
            try {
                if (value.startsWith('data:') || value.startsWith('/')) {
                    setPreview(value);
                } else {
                    // Try constructing a URL to check validity
                    new URL(value);
                    setPreview(value);
                }
            } catch (e) {
                console.warn('Invalid image URL provided:', value);
                setPreview(null);
                setImageError(true);
            }
        } else {
            setPreview(null);
        }
    }, [value]);

    const handleFile = useCallback((file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        // Create local preview
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setPreview(result);

            // If onUploadFile is provided, pass the file up
            // Otherwise, we just use the data URL as the value (for localStorage caching)
            if (onUploadFile) {
                onUploadFile(file);
            } else {
                onChange(result);
            }
        };
        reader.readAsDataURL(file);
    }, [onChange, onUploadFile]);

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [handleFile]);

    const handleRemove = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        onChange('');
    }, [onChange]);

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>

            <div
                className={`
                    relative border-2 border-dashed rounded-lg p-4 transition-colors
                    ${isDragging ? 'border-[#00A99D] bg-[#00A99D]/5' : 'border-gray-300 hover:border-[#00A99D]'}
                    ${preview ? 'h-64' : 'h-32'}
                `}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
            >
                {preview ? (
                    <div className="relative w-full h-full">
                        {imageError ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <AlertCircle size={48} className="mb-2" />
                                <p className="text-sm font-medium">Failed to load image</p>
                                <p className="text-xs mt-1">Invalid or broken image URL</p>
                            </div>
                        ) : (
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-full object-contain rounded"
                                onError={(e) => {
                                    console.warn('Image failed to load:', preview);
                                    setImageError(true);
                                }}
                            />
                        )}
                        <button
                            onClick={handleRemove}
                            className="absolute top-2 right-2 p-1 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors shadow-sm"
                            type="button"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Upload size={24} className="mb-2" />
                        <p className="text-sm font-medium">{description}</p>
                        <p className="text-xs mt-1">PNG, JPG, GIF up to 5MB</p>
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleFile(e.target.files[0]);
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
