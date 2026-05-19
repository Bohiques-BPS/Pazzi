import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';

interface SearchResult {
  id: string;
  label: string;
  description: string;
  path: string;
  type: 'client' | 'product' | 'project' | 'employee' | 'supplier';
}

export const GlobalSearch: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { products, clients, projects, employees, suppliers } = useData();

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const all: SearchResult[] = [
      ...clients.map(c => ({ id: c.id, label: `${c.name} ${c.lastName}`, description: c.email || '', path: '/pm/clients', type: 'client' as const })),
      ...products.map(p => ({ id: p.id, label: p.name, description: `$${p.unitPrice?.toFixed(2) || '0.00'}`, path: '/pm/products', type: 'product' as const })),
      ...projects.map(p => ({ id: p.id, label: p.name || 'Sin nombre', description: p.status || '', path: '/pm/projects', type: 'project' as const })),
      ...employees.map(e => ({ id: e.id, label: `${e.name} ${e.lastName}`, description: e.email || '', path: '/pm/employees', type: 'employee' as const })),
      ...suppliers.map(s => ({ id: s.id, label: s.name, description: s.email || '', path: '/ecommerce/suppliers', type: 'supplier' as const })),
    ];

    return all.filter(r =>
      r.label.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [query, clients, products, projects, employees, suppliers]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex].path);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const typeColors: Record<string, string> = {
    client: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    product: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    project: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    employee: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    supplier: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-800 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 border-b border-neutral-200 dark:border-neutral-700">
          <svg className="w-5 h-5 text-neutral-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar clientes, productos, proyectos..."
            className="flex-1 py-4 bg-transparent border-none outline-none text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 text-lg"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-700 rounded">ESC</kbd>
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                className={`w-full flex items-center px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${i === selectedIndex ? 'bg-neutral-100 dark:bg-neutral-700' : ''}`}
                onClick={() => { navigate(r.path); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-3 uppercase ${typeColors[r.type]}`}>
                  {r.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{r.label}</div>
                  <div className="text-xs text-neutral-500 truncate">{r.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-neutral-400 text-sm">
            No se encontraron resultados para "{query}"
          </div>
        )}
      </div>
    </div>
  );
};
