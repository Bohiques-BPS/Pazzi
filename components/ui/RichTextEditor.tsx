import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

const RichTextEditorButton: React.FC<{ onMouseDown: (e: React.MouseEvent) => void; children: React.ReactNode; title: string }> = ({ onMouseDown, children, title }) => (
    <button
        type="button"
        title={title}
        onMouseDown={onMouseDown}
        className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary"
    >
        {children}
    </button>
);


export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, disabled }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Sync external value changes to the editor, but only if they differ.
    // This prevents cursor jumps during typing.
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);
    
    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };
    
    const execCmd = (command: string, value: string | null = null) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleCommand = (e: React.MouseEvent, command: string) => {
        e.preventDefault(); // Prevent editor from losing focus
        execCmd(command);
    };

    return (
        <div className="w-full border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary dark:focus-within:ring-offset-neutral-800 focus-within:border-primary bg-white dark:bg-neutral-700">
            {!disabled && (
                <div className="flex items-center space-x-1 p-1.5 border-b border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 rounded-t-md">
                    <RichTextEditorButton title="Bold" onMouseDown={(e) => handleCommand(e, 'bold')}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M8.21 13c-2.11 0-3.41-1.24-3.41-3.23 0-1.85 1.05-2.88 2.3-3.23.4-.11.8-.17 1.2-.17H11V5.2H8.7c-1.12 0-1.93.43-2.43 1.2a3.52 3.52 0 00-.5 1.83c0 1.54.8 2.54 2.2 2.54h2.5v1.23H8.21zM11 5.2V3.5H5.5v1.7h5.5zm-2.7 5.28c-1.3 0-2.14-.8-2.14-2.15 0-1.2.7-2.02 1.8-2.23.5-.1 1.05-.1 1.58-.02h.1v5.12h-1.34z"/></svg>
                    </RichTextEditorButton>
                    <RichTextEditorButton title="Italic" onMouseDown={(e) => handleCommand(e, 'italic')}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M7.99 11.68l-2.5-8.22h1.63L9.4 11.1c.14.45.22.8.22 1.05 0 .26-.06.44-.18.53-.12.09-.3.13-.56.13-.41 0-.8-.13-1.16-.4L7.99 11.68zM6.55 3.5h5.5v1.2h-5.5V3.5z"/></svg>
                    </RichTextEditorButton>
                    <RichTextEditorButton title="Underline" onMouseDown={(e) => handleCommand(e, 'underline')}>
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M8.5 11.23c-1.55 0-2.6-1.04-2.6-2.6V3.5h1.2v5.13c0 .8.4 1.3 1.4 1.3s1.4-.5 1.4-1.3V3.5h1.2v5.13c0 1.56-1.05 2.6-2.6 2.6zM4.5 14h7v-1.2h-7V14z"/></svg>
                    </RichTextEditorButton>
                    <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-600"></div>
                    <RichTextEditorButton title="Bulleted List" onMouseDown={(e) => handleCommand(e, 'insertUnorderedList')}>
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M5 4a.5.5 0 01.5.5v10a.5.5 0 01-1 0V4.5A.5.5 0 015 4zM2 5.5a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm0 4a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm0 4a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5z"/></svg>
                    </RichTextEditorButton>
                     <RichTextEditorButton title="Numbered List" onMouseDown={(e) => handleCommand(e, 'insertOrderedList')}>
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M2 3.5a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zM2.5 8a.5.5 0 000 1h11a.5.5 0 000-1h-11zM2 12.5a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5z"/></svg>
                    </RichTextEditorButton>
                </div>
            )}
            <div
                ref={editorRef}
                contentEditable={!disabled}
                onInput={handleInput}
                className="w-full px-3 py-1.5 text-base min-h-[100px] focus:outline-none"
                dangerouslySetInnerHTML={{ __html: value }}
                aria-placeholder={placeholder}
            />
        </div>
    );
};
