import { useState, useEffect, useRef } from 'react';
import { fumigationApi, PestOperator } from '../lib/fumigationApi';
import { User, Building2, ChevronDown } from 'lucide-react';

interface OperatorAutocompleteProps {
  nombreValue: string;
  empresaValue: string;
  onNombreChange: (value: string) => void;
  onEmpresaChange: (value: string) => void;
  nombreLabel?: string;
  empresaLabel?: string;
  nombrePlaceholder?: string;
  empresaPlaceholder?: string;
  required?: boolean;
}

export default function OperatorAutocomplete({
  nombreValue,
  empresaValue,
  onNombreChange,
  onEmpresaChange,
  nombreLabel = 'Inspector',
  empresaLabel = 'Empresa',
  nombrePlaceholder = 'Nombre',
  empresaPlaceholder = 'Opcional',
  required = true,
}: OperatorAutocompleteProps) {
  const [operators, setOperators] = useState<PestOperator[]>([]);
  const [filteredOperators, setFilteredOperators] = useState<PestOperator[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOperators();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOperators = async () => {
    setLoading(true);
    try {
      const data = await fumigationApi.getOperators();
      setOperators(data);
    } catch (error) {
      console.error('Error loading operators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNombreChange = (value: string) => {
    onNombreChange(value);

    if (value.trim().length > 0) {
      const filtered = operators.filter((op) =>
        op.nombre.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOperators(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredOperators([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectOperator = (operator: PestOperator) => {
    onNombreChange(operator.nombre);
    onEmpresaChange(operator.empresa || '');
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (nombreValue.trim().length > 0) {
      const filtered = operators.filter((op) =>
        op.nombre.toLowerCase().includes(nombreValue.toLowerCase())
      );
      if (filtered.length > 0) {
        setFilteredOperators(filtered);
        setShowSuggestions(true);
      }
    } else if (operators.length > 0) {
      setFilteredOperators(operators.slice(0, 10));
      setShowSuggestions(true);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4" ref={containerRef}>
      <div className="relative">
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          <User className="w-4 h-4 inline mr-1" />
          {nombreLabel} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            value={nombreValue}
            onChange={(e) => handleNombreChange(e.target.value)}
            onFocus={handleFocus}
            className="w-full px-3 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-8"
            placeholder={nombrePlaceholder}
            required={required}
            autoComplete="off"
          />
          {operators.length > 0 && (
            <button
              type="button"
              onClick={handleFocus}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {showSuggestions && filteredOperators.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredOperators.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => handleSelectOperator(op)}
                className="w-full px-3 py-2.5 text-left hover:bg-emerald-50 flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors"
              >
                <span className="font-medium text-slate-700">{op.nombre}</span>
                {op.empresa && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {op.empresa}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          <Building2 className="w-4 h-4 inline mr-1" />
          {empresaLabel}
        </label>
        <input
          type="text"
          value={empresaValue}
          onChange={(e) => onEmpresaChange(e.target.value)}
          className="w-full px-3 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder={empresaPlaceholder}
        />
      </div>
    </div>
  );
}
