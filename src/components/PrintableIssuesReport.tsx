import { InspectionIssue } from '../lib/inspections-api';

interface PrintableIssuesReportProps {
  issues: InspectionIssue[];
  title?: string;
}

export default function PrintableIssuesReport({ issues, title }: PrintableIssuesReportProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const groupedByRoom = issues.reduce((acc, issue) => {
    const key = issue.roomNumber;
    if (!acc[key]) acc[key] = [];
    acc[key].push(issue);
    return acc;
  }, {} as Record<number, InspectionIssue[]>);

  const roomNumbers = Object.keys(groupedByRoom)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="print-content bg-white p-4 max-w-full text-xs">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10px;
            font-size: 9pt;
          }
          @page {
            size: letter;
            margin: 0.5cm;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
          .thumbnail-img {
            max-width: 40px;
            max-height: 40px;
          }
        }
      `}</style>

      <div className="border-b-2 border-gray-800 pb-2 mb-3">
        <h1 className="text-base font-bold text-gray-900">
          {title || 'LISTA DE PENDIENTES'}
        </h1>
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>Total: {issues.length}</span>
          <span>Fecha: {formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="text-left py-1 px-1 font-bold w-12">Hab.</th>
            <th className="text-left py-1 px-1 font-bold">Pendiente</th>
            <th className="text-center py-1 px-1 font-bold w-12">Foto</th>
            <th className="text-center py-1 px-1 font-bold w-16">✓</th>
          </tr>
        </thead>
        <tbody>
          {roomNumbers.map((roomNumber) => {
            const roomIssues = groupedByRoom[roomNumber];

            return roomIssues.map((issue) => (
              <tr
                key={issue.id}
                className="border-b border-gray-300 avoid-break hover:bg-gray-50"
              >
                <td className="py-1 px-1 font-bold align-top">
                  {roomNumber}
                </td>
                <td className="py-1 px-1 align-top">
                  <div>
                    <span className="font-semibold">{issue.pregunta}:</span>
                    {' '}
                    <span className="text-gray-700">{issue.problema}</span>
                    {issue.comment && (
                      <span className="text-gray-500 italic"> - {issue.comment}</span>
                    )}
                    <span className="text-gray-400 ml-1">({issue.area || 'N/A'})</span>
                  </div>
                </td>
                <td className="py-1 px-1 text-center align-top">
                  {issue.photoMainUrl ? (
                    <img
                      src={issue.photoMainUrl}
                      alt="📷"
                      className="thumbnail-img inline-block w-8 h-8 object-cover border border-gray-300 rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.insertAdjacentHTML('afterend', '📷');
                      }}
                    />
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="py-1 px-1 text-center align-top">
                  <div className="w-4 h-4 border-2 border-gray-400 inline-block rounded"></div>
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>

      <div className="mt-2 pt-2 border-t border-gray-400 text-center text-xs text-gray-500">
        {roomNumbers.length} habitación(es) - Sistema de Gestión de Inspecciones
      </div>
    </div>
  );
}
