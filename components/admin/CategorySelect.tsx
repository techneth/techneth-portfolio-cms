'use client';

import { useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { X, ChevronDown } from 'lucide-react';

interface CategorySelectProps {
    value: string;           // English category value
    onChange: (enValue: string) => void;
    required?: boolean;
    className?: string;
}

export default function CategorySelect({ value, onChange, required, className }: CategorySelectProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = search.trim()
        ? CATEGORIES.filter((c) => c.en.toLowerCase().includes(search.toLowerCase().trim()))
        : CATEGORIES;

    const selectedLabel = value || '';

    function handleSelect(enValue: string) {
        onChange(enValue);
        setIsOpen(false);
        setSearch('');
    }

    function handleClear(e: React.MouseEvent) {
        e.stopPropagation();
        onChange('');
        setSearch('');
        setIsOpen(false);
    }

    function handleOpen() {
        setIsOpen(true);
        // When opening, clear the search so user starts fresh
        setSearch('');
        setTimeout(() => inputRef.current?.focus(), 0);
    }

    return (
        <div ref={containerRef} className={`relative ${className ?? ''}`}>
            {/* Trigger row */}
            <div
                onClick={handleOpen}
                className={`flex items-center w-full px-3 py-2 border rounded cursor-pointer transition-colors ${
                    isOpen
                        ? 'border-[#00A99D] ring-2 ring-[#00A99D]/20'
                        : 'border-gray-300 hover:border-gray-400'
                } bg-white`}
            >
                <span className={`flex-1 text-sm truncate ${selectedLabel ? 'text-gray-800' : 'text-gray-400'}`}>
                    {selectedLabel || 'Select a category'}
                </span>
                {selectedLabel ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        aria-label="Clear category"
                    >
                        <X size={14} />
                    </button>
                ) : (
                    <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-1" />
                )}
            </div>

            {/* Hidden required input for form validation */}
            {required && (
                <input
                    type="text"
                    value={value}
                    onChange={() => {}}
                    required
                    tabIndex={-1}
                    aria-hidden
                    className="absolute inset-0 w-full opacity-0 pointer-events-none"
                />
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-100">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search categories…"
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-[#00A99D]"
                        />
                    </div>

                    {/* Category list */}
                    <ul className="overflow-y-auto max-h-72 py-1">
                        {filtered.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-gray-400 text-center">No categories found</li>
                        ) : (
                            filtered.map((cat) => (
                                <li
                                    key={cat.en}
                                    onMouseDown={(e) => {
                                        // Use mousedown so it fires before blur on the search input
                                        e.preventDefault();
                                        handleSelect(cat.en);
                                    }}
                                    className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                                        cat.en === value
                                            ? 'bg-[#00A99D]/10 text-[#007A73] font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {cat.en}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
