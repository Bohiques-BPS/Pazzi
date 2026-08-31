import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

// Emojis/íconos útiles para describir productos y servicios.
const EMOJIS = ['✅', '⭐', '🔥', '✨', '💡', '🚀', '📦', '🛠️', '💻', '📱', '📞', '📧', '🌐', '🔒', '⚡', '🎯', '📈', '💰', '🎁', '👍', '💯', '🕒', '📌', '🏷️', '🤝', '🧾', '🚚', '🎨', '⚙️', '❤️', '👉', '➡️', '•', '✔️', '❌', '⚠️'];
const COLORS = ['#0D9488', '#2563EB', '#DC2626', '#D97706', '#7C3AED', '#16A34A', '#111827', '#6B7280'];

const Btn: React.FC<{ onMouseDown: (e: React.MouseEvent) => void; children: React.ReactNode; title: string; active?: boolean }> = ({ onMouseDown, children, title, active }) => (
    <button
        type="button"
        title={title}
        onMouseDown={onMouseDown}
        className={`px-2 py-1 rounded text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 focus:outline-none text-sm min-w-[30px] ${active ? 'bg-neutral-200 dark:bg-neutral-600' : ''}`}
    >
        {children}
    </button>
);

// Convierte "\n" literales (de importaciones) en saltos de línea reales.
const normalizeHtml = (v: string) => (v || '').replace(/\\n/g, '<br>');

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, disabled }) => {
    const { t } = useTranslation();
    const editorRef = useRef<HTMLDivElement>(null);
    const isFocused = useRef(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [colorOpen, setColorOpen] = useState(false);

    useEffect(() => {
        if (editorRef.current) editorRef.current.innerHTML = normalizeHtml(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const html = normalizeHtml(value);
        if (editorRef.current && !isFocused.current && editorRef.current.innerHTML !== html) {
            editorRef.current.innerHTML = html;
        }
    }, [value]);

    const handleInput = () => { if (editorRef.current) onChange(editorRef.current.innerHTML); };

    const execCmd = (command: string, val?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, val);
        handleInput();
    };
    const cmd = (e: React.MouseEvent, command: string, val?: string) => { e.preventDefault(); execCmd(command, val); };
    const insertText = (e: React.MouseEvent, text: string) => { e.preventDefault(); execCmd('insertText', text); };

    return (
        <div className="relative w-full border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-primary bg-white dark:bg-neutral-700">
            {!disabled && (
                <div className="flex items-center flex-wrap gap-0.5 p-1.5 border-b border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 rounded-t-md">
                    <Btn title={t('cmpx.rte.bold')} onMouseDown={(e) => cmd(e, 'bold')}><b>B</b></Btn>
                    <Btn title={t('cmpx.rte.italic')} onMouseDown={(e) => cmd(e, 'italic')}><i>I</i></Btn>
                    <Btn title={t('cmpx.rte.underline')} onMouseDown={(e) => cmd(e, 'underline')}><u>U</u></Btn>
                    <Btn title="Título" onMouseDown={(e) => cmd(e, 'formatBlock', 'H3')}><span className="font-bold">H</span></Btn>
                    <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-600 mx-1" />
                    <Btn title={t('cmpx.rte.bullets')} onMouseDown={(e) => cmd(e, 'insertUnorderedList')}>☰</Btn>
                    <Btn title={t('cmpx.rte.numbered')} onMouseDown={(e) => cmd(e, 'insertOrderedList')}>1.</Btn>
                    <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-600 mx-1" />

                    {/* Color de texto */}
                    <div className="relative">
                        <Btn title="Color del texto" onMouseDown={(e) => { e.preventDefault(); setColorOpen(o => !o); setEmojiOpen(false); }}>
                            <span className="inline-flex items-center gap-0.5">A<span className="w-3 h-1 rounded" style={{ background: COLORS[0] }} /></span>
                        </Btn>
                        {colorOpen && (
                            <div className="absolute z-30 mt-1 left-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-md shadow-lg p-2 grid grid-cols-4 gap-1.5">
                                {COLORS.map(c => (
                                    <button key={c} type="button" onMouseDown={(e) => { cmd(e, 'foreColor', c); setColorOpen(false); }} className="w-6 h-6 rounded-full border border-neutral-200 dark:border-neutral-600" style={{ background: c }} title={c} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Emojis / íconos */}
                    <div className="relative">
                        <Btn title="Insertar icono / emoji" onMouseDown={(e) => { e.preventDefault(); setEmojiOpen(o => !o); setColorOpen(false); }}>😊</Btn>
                        {emojiOpen && (
                            <div className="absolute z-30 mt-1 left-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-md shadow-lg p-2 grid grid-cols-9 gap-0.5 w-[280px] max-h-40 overflow-y-auto">
                                {EMOJIS.map(em => (
                                    <button key={em} type="button" onMouseDown={(e) => insertText(e, em)} className="w-7 h-7 text-lg rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 leading-none">{em}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div
                ref={editorRef}
                contentEditable={!disabled}
                onInput={handleInput}
                onFocus={() => { isFocused.current = true; }}
                onBlur={() => { isFocused.current = false; setTimeout(() => { setEmojiOpen(false); setColorOpen(false); }, 150); }}
                className="w-full px-3 py-2 text-base min-h-[120px] focus:outline-none leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 empty:before:pointer-events-none [&_h3]:text-lg [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                data-placeholder={placeholder}
                suppressContentEditableWarning
            />
        </div>
    );
};
