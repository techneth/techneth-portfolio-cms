import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    warnings: string[];
}

export default function ValidationModal({ isOpen, onClose, onConfirm, warnings }: ValidationModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Content Quality Check">
            <div className="space-y-4">
                <div className="bg-[#E0F2F1] border-l-4 border-[#00A99D] p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-[#00A99D]" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-[#00695C]">
                                We found some potential issues with your content. You can review them below or continue anyway.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-gray-50">
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                        {warnings.map((warning, index) => (
                            <li key={index} className="leading-relaxed">
                                {warning}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Edit Content
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-[#00A99D] text-white rounded hover:bg-[#008F84] transition-colors"
                    >
                        Continue Anyway
                    </button>
                </div>
            </div>
        </Modal>
    );
}
