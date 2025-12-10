import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Plus, DollarSign, BarChart3, TrendingUp, FileText, Database, Share2, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';

export default function Energy() {
  const [activeView, setActiveView] = useState<'form' | 'dashboard' | 'forecast' | 'pricing'>('dashboard');
  const [copied, setCopied] = useState(false);

  const copyStandaloneLink = () => {
    const link = `${window.location.origin}/energy-forecast-to-fin`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Gestión de Energía
          </h1>
          <p className="text-slate-600 mt-1">Secrets Puerto Los Cabos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Primera fila */}
        <Link
          to="/energy/form"
          className="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-8 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
        >
          <div className="relative z-10">
            <div className="mb-4">
              <div className="inline-flex p-4 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:bg-white/30 transition-all">
                <Plus className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">Registrar Lecturas</h3>
            <p className="text-sm text-white/90">Nueva captura de datos energéticos</p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </Link>

        <Link
          to="/energy/raw-data"
          className="group relative overflow-hidden bg-white rounded-2xl p-8 border-2 border-slate-200 shadow-lg hover:shadow-2xl hover:border-slate-400 transition-all duration-300 hover:scale-105"
        >
          <div className="relative z-10">
            <div className="mb-4">
              <div className="inline-flex p-4 bg-slate-100 rounded-2xl group-hover:bg-slate-200 transition-all">
                <Database className="w-8 h-8 text-slate-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Visor de registro de datos energeticos  diarios</h3>
            <p className="text-sm text-slate-600">Ver y editar registros históricos</p>
          </div>
        </Link>

        <Link
          to="/energy/dashboard"
          className="group relative overflow-hidden bg-white rounded-2xl p-8 border-2 border-blue-200 shadow-lg hover:shadow-2xl hover:border-blue-400 transition-all duration-300 hover:scale-105"
        >
          <div className="relative z-10">
            <div className="mb-4">
              <div className="inline-flex p-4 bg-blue-100 rounded-2xl group-hover:bg-blue-200 transition-all">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Dashboard de Analisis de Energeticos</h3>
            <p className="text-sm text-slate-600">Análisis de consumos y tendencias</p>
          </div>
        </Link>

        {/* Segunda fila - espacio vacío en primera columna */}
        <div className="hidden lg:block"></div>

        <Link
          to="/energy/pricing"
          className="group relative overflow-hidden bg-white rounded-2xl p-8 border-2 border-teal-200 shadow-lg hover:shadow-2xl hover:border-teal-400 transition-all duration-300 hover:scale-105"
        >
          <div className="relative z-10">
            <div className="mb-4">
              <div className="inline-flex p-4 bg-teal-100 rounded-2xl group-hover:bg-teal-200 transition-all">
                <DollarSign className="w-8 h-8 text-teal-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Precios</h3>
            <p className="text-sm text-slate-600">Gestión de tarifas energéticas</p>
          </div>
        </Link>

        <Link
          to="/energy/forecast"
          className="group relative overflow-hidden bg-white rounded-2xl p-8 border-2 border-green-200 shadow-lg hover:shadow-2xl hover:border-green-400 transition-all duration-300 hover:scale-105"
        >
          <div className="relative z-10">
            <div className="mb-4">
              <div className="inline-flex p-4 bg-green-100 rounded-2xl group-hover:bg-green-200 transition-all">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Pronóstico</h3>
            <p className="text-sm text-slate-600">Proyección de costos mensuales</p>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-slate-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-800">Módulos del Sistema</h2>
            <p className="text-sm text-slate-600">Gestión completa de energéticos</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">1. Registro de Lecturas</h3>
            <p className="text-sm text-yellow-800">Captura diaria de consumos de agua, gas y electricidad con validación automática.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-2">2. Vista de Datos Crudos</h3>
            <p className="text-sm text-slate-800">Visualización y edición de todos los registros históricos con filtros por mes.</p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">3. Dashboard de Consumos</h3>
            <p className="text-sm text-blue-800">Análisis de estadísticas, tendencias e indicadores de sustentabilidad.</p>
          </div>

          <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h3 className="font-semibold text-teal-900 mb-2">4. Registro de Tarifas</h3>
            <p className="text-sm text-teal-800">Administración de precios de electricidad (GDMTH), gas LP y agua municipal.</p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">5. Pronóstico de Energéticos</h3>
            <p className="text-sm text-green-800">Proyección de costos mensuales y análisis de tendencias de consumo.</p>
          </div>
        </div>
      </div>

      {/* Sección de Link Compartible */}
      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-200 shadow-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Share2 className="w-7 h-7 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-orange-900">Link de Pronóstico Standalone</h2>
              <ExternalLink className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-sm text-orange-800 mb-4">
              Comparte este link con otras áreas (Finanzas, Dirección) para que puedan ver los pronósticos energéticos sin acceso a otras secciones de la app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-white rounded-lg p-3 border-2 border-orange-200">
                <code className="text-sm text-slate-700 break-all">
                  {window.location.origin}/energy-forecast-to-fin
                </code>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyStandaloneLink}
                  className="flex items-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-medium shadow-md hover:shadow-lg"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar Link
                    </>
                  )}
                </button>

                <a
                  href="/energy-forecast-to-fin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-white text-orange-600 border-2 border-orange-600 rounded-lg hover:bg-orange-50 transition-all font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  Abrir
                </a>
              </div>
            </div>

            <div className="mt-4 p-3 bg-orange-100 rounded-lg border border-orange-200">
              <p className="text-xs text-orange-900">
                <strong>Nota:</strong> Esta vista standalone no muestra navegación ni menús, ideal para compartir con personal externo o para presentaciones.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
