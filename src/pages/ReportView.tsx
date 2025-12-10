import { useEffect, useState } from 'react';
import PrintableReport from '../components/PrintableReport';
import { Note } from '../lib/api';
import { ExportFilters } from '../components/ExportReportModal';

export default function ReportView() {
  const [reportData, setReportData] = useState<{
    supervisorName: string;
    notes: Note[];
    filters: ExportFilters;
  } | null>(null);

  useEffect(() => {
    const data = localStorage.getItem('reportData');
    if (data) {
      const parsed = JSON.parse(data);
      console.log('📊 ReportView loaded data:', parsed);
      setReportData(parsed);
    }
  }, []);

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors shadow-lg"
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
        >
          Cerrar
        </button>
      </div>
      <PrintableReport
        supervisorName={reportData.supervisorName}
        notes={reportData.notes}
        filters={reportData.filters}
      />
    </div>
  );
}
