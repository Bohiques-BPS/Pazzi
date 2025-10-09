import React from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, disabled }) => {
    // This is a simple mock using a textarea to satisfy the component's interface.
    // A real implementation would use a library like Quill, Tiptap, or similar.
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="block w-full px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-offset-neutral-800 focus:border-primary min-h-[100px]"
        />
    );
};
