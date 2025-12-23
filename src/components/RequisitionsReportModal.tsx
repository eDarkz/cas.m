import { X, Printer } from 'lucide-react';
import { Requisition, Supervisor } from '../lib/api';

interface RequisitionsReportModalProps {
  requisitions: Requisition[];
  supervisors: Supervisor[];
  onClose: () => void;
}

export default function RequisitionsReportModal({ requisitions, supervisors, onClose }: RequisitionsReportModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const getDaysAgo = (dateString: string) => {
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="print:hidden sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 border-b border-blue-500 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl z-10">
          <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-md">Reporte de Requisiciones</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors shadow-lg font-medium"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 transition-colors hover:scale-110 duration-200"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-3 sm:p-6 print:p-8">
          <div className="print:block hidden mb-6 border-b-2 border-slate-300 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <img
                  src="https://elinge.tech/seplc/logos/casm.png"
                  alt="CAS:M Logo"
                  className="h-16 w-auto"
                />
                <img
                  src="https://elinge.tech/seplc/logos/seplclogo.png"
                  alt="Secrets Puerto Los Cabos"
                  className="h-16 w-auto"
                />
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-900">
                  CAS:M Control Activities Center
                </h2>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 text-center mt-4">Reporte de Requisiciones</h1>
            <p className="text-sm text-slate-600 mt-2 text-center">
              Generado el {new Intl.DateTimeFormat('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }).format(new Date())}
            </p>
            <p className="text-sm text-slate-600 mt-1 text-center">
              Total de requisiciones: {requisitions.length}
            </p>
          </div>

          {requisitions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No hay requisiciones para mostrar en el reporte
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-700 to-slate-900 text-white print:bg-slate-800">
                    <th className="border border-slate-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Folio
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Área
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Prioridad
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Solicitante
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                      Items
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                      Pendientes
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Fecha Creación
                    </th>
                    <th className="border border-slate-300 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                      Días
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requisitions.map((req, index) => (
                    <tr
                      key={req.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      } hover:bg-blue-50 print:hover:bg-transparent transition-colors`}
                    >
                      <td className="border border-slate-300 px-3 py-2 text-sm text-slate-700 font-bold">
                        #{req.folio}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-sm text-slate-700 font-medium">
                        {req.requested_for_area}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-sm text-slate-700">
                        {req.priority}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-sm text-slate-700">
                        {req.requested_by_nombre}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-sm text-slate-700">
                        {req.responsible_nombre || 'N/A'}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-sm text-slate-700 text-center">
                        {req.total_items}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-sm text-center">
                        <span className={req.pending_items > 0 ? 'text-orange-600 font-bold' : 'text-slate-700'}>
                          {req.pending_items}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          req.status === 'CERRADA'
                            ? 'bg-emerald-100 text-emerald-800 print:border print:border-emerald-800'
                            : req.status === 'PARCIAL'
                            ? 'bg-orange-100 text-orange-800 print:border print:border-orange-800'
                            : req.status === 'EN_COMPRAS'
                            ? 'bg-purple-100 text-purple-800 print:border print:border-purple-800'
                            : req.status === 'ENVIADA'
                            ? 'bg-blue-100 text-blue-800 print:border print:border-blue-800'
                            : 'bg-slate-100 text-slate-800 print:border print:border-slate-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-sm text-slate-600 text-center whitespace-nowrap">
                        {getDaysAgo(req.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 print:block hidden">
            <div className="border-t-2 border-slate-300 pt-4">
              <p className="text-xs text-gray-400 text-center">CAS:M Control Activities System</p>
              <p className="text-xs text-gray-400 text-center">Dirección de Ingeniería - Secrets Puerto Los Cabos</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white;
          }
          @page {
            margin: 1cm;
            size: landscape;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  );
}
