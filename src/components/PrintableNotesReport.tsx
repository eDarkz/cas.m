import { Note, Supervisor } from '../lib/api';

interface ReportFilters {
  dateRange: string;
  states: string[];
}

export function generatePrintableReport(
  notes: Note[],
  supervisors: Supervisor[],
  filters: ReportFilters
) {
  const getStatusText = (estado: number) => {
    switch (estado) {
      case 0:
        return 'Pendiente';
      case 1:
        return 'En Progreso';
      case 2:
        return 'Completada';
      default:
        return 'Desconocido';
    }
  };

  const getStatusColor = (estado: number) => {
    switch (estado) {
      case 0:
        return '#dc2626';
      case 1:
        return '#ea580c';
      case 2:
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const getSupervisorName = (supervisorId: number) => {
    const supervisor = supervisors.find((s) => s.id === supervisorId);
    return supervisor?.nombre || 'Sin asignar';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generateHTML = () => {
    const notesHTML = notes
      .map((note, index) => {
        const allImages: { url: string; label: string }[] = [];

        if (note.imagen) {
          allImages.push({ url: note.imagen, label: 'Imagen principal' });
        }

        if (note.imgs && Array.isArray(note.imgs)) {
          note.imgs.forEach((img, idx) => {
            allImages.push({
              url: img,
              label: `Imagen de seguimiento ${idx + 1}`,
            });
          });
        }

        if (note.images && Array.isArray(note.images)) {
          note.images.forEach((img, idx) => {
            const imgDate = img.created_at
              ? new Date(img.created_at).toLocaleString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';
            allImages.push({
              url: img.url,
              label: `Seguimiento ${idx + 1}${
                imgDate ? ` - ${imgDate}` : ''
              }`,
            });
          });
        }

        return `
        <div style="page-break-inside: avoid; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: white;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; border-bottom: 2px solid ${getStatusColor(
            note.estado
          )}; padding-bottom: 10px;">
            <div style="flex: 1;">
              <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 6px;">
                ${index + 1}. ${note.titulo}
              </div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 8px;">
                <div style="margin-bottom: 4px;">📅 <strong>Fecha:</strong> ${formatDate(
                  note.fecha
                )}</div>
                ${
                  note.cristal
                    ? '<div style="color: #0891b2; font-weight: 600; margin-top: 6px;">⭐ TAREA PRIORITARIA</div>'
                    : ''
                }
              </div>
            </div>
            <div style="text-align: right; min-width: 100px;">
              <span style="display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; color: white; background-color: ${getStatusColor(
                note.estado
              )};">
                ${getStatusText(note.estado)}
              </span>
            </div>
          </div>

          <div style="margin-top: 14px; background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <div style="font-weight: 700; color: #374151; margin-bottom: 10px; font-size: 14px;">
              📝 Actividades:
            </div>
            <div style="color: #111827; font-size: 16px; line-height: 1.8; white-space: pre-wrap; font-weight: 500;">
              ${note.actividades}
            </div>
          </div>

          ${
            note.comment
              ? `
            <div style="margin-top: 12px; padding: 10px; background: #f9fafb; border-left: 3px solid #3b82f6; border-radius: 4px;">
              <div style="font-weight: 600; color: #374151; margin-bottom: 4px; font-size: 13px;">
                💬 Comentarios:
              </div>
              <div style="color: #4b5563; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">
                ${note.comment}
              </div>
            </div>
          `
              : ''
          }

          ${
            allImages.length > 0
              ? `
            <div style="margin-top: 16px;">
              <div style="font-weight: 600; color: #374151; margin-bottom: 12px; font-size: 13px;">
                📸 Evidencias fotográficas (${allImages.length}):
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                ${allImages
                  .map(
                    (img) => `
                  <div style="page-break-inside: avoid;">
                    <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px; font-weight: 500;">
                      ${img.label}
                    </div>
                    <img
                      src="${img.url}"
                      alt="${img.label}"
                      style="width: 100%; height: auto; max-height: 350px; border-radius: 6px; border: 1px solid #e5e7eb; display: block; object-fit: contain; background: #f9fafb;"
                      onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                    />
                    <div style="display: none; padding: 20px; text-align: center; background: #fee; border: 1px solid #fcc; border-radius: 6px; color: #c33; font-size: 12px;">
                      ⚠️ Error al cargar imagen
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        </div>
      `;
      })
      .join('');

    const statesSummary = filters.states.join(', ');

    const supervisorStats: Record<
      number,
      {
        name: string;
        email: string;
        kind: string;
        tasks: number;
        pending: number;
        inProgress: number;
        completed: number;
      }
    > = {};

    notes.forEach((note) => {
      if (!supervisorStats[note.supervisor_id]) {
        const supervisor = supervisors.find((s) => s.id === note.supervisor_id);
        supervisorStats[note.supervisor_id] = {
          name:
            note.supervisor_nombre ||
            supervisor?.nombre ||
            getSupervisorName(note.supervisor_id),
          email: note.supervisor_correo || supervisor?.correo || '',
          kind: supervisor?.kind || 'SUPERVISOR',
          tasks: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
        };
      }
      supervisorStats[note.supervisor_id].tasks++;
      if (note.estado === 0) supervisorStats[note.supervisor_id].pending++;
      if (note.estado === 1)
        supervisorStats[note.supervisor_id].inProgress++;
      if (note.estado === 2)
        supervisorStats[note.supervisor_id].completed++;
    });

    const supervisorStatsHTML = Object.values(supervisorStats)
      .map(
        (stat) => `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 8px; font-size: 15px;">
          ${stat.kind === 'PROYECTO' ? '📁' : '👤'} ${stat.name}
          ${
            stat.email
              ? `<span style="font-weight: 400; color: #6b7280; font-size: 13px; margin-left: 8px;">(${stat.email})</span>`
              : ''
          }
        </div>
        <div style="display: flex; gap: 16px; font-size: 13px; color: #6b7280;">
          <span><strong>${stat.tasks}</strong> tareas</span>
          <span style="color: #dc2626;"><strong>${stat.pending}</strong> pendientes</span>
          <span style="color: #ea580c;"><strong>${stat.inProgress}</strong> en progreso</span>
          <span style="color: #16a34a;"><strong>${stat.completed}</strong> completadas</span>
        </div>
      </div>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte de Notas - ${new Date().toLocaleDateString('es-MX')}</title>

        <!-- Librerías para PDF directo SOLO dentro de esta ventana -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: #1f2937;
            background: #f9fafb;
            padding: 20px;
          }

          .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
          }

          .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 3px solid #3b82f6;
          }

          .header h1 {
            font-size: 28px;
            color: #111827;
            margin-bottom: 12px;
            font-weight: 800;
          }

          .header-info {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.8;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
            padding: 20px;
            background: #f3f4f6;
            border-radius: 8px;
          }

          .summary-item {
            text-align: center;
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }

          .summary-value {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            display: block;
          }

          .summary-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
            display: block;
          }

          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }

          .print-button,
          .pdf-button {
            position: fixed;
            right: 20px;
            padding: 10px 20px;
            border: none;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            z-index: 1000;
            transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s;
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.18);
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .print-button {
            top: 20px;
            background: #3b82f6;
            color: white;
          }

          .pdf-button {
            top: 70px;
            background: #10b981;
            color: white;
          }

          .print-button:hover {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.25);
          }

          .pdf-button:hover {
            background: #059669;
            transform: translateY(-1px);
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.25);
          }

          @media print {
            body {
              background: white;
              padding: 0;
            }

            .container {
              box-shadow: none;
              padding: 20px;
            }

            .print-button,
            .pdf-button {
              display: none;
            }

            .header {
              border-bottom: 2px solid #000;
            }

            .summary {
              background: white;
              border: 1px solid #000;
            }

            .summary-item {
              border: 1px solid #666;
            }

            img {
              max-height: 300px !important;
              page-break-inside: avoid;
            }
          }

          @page {
            margin: 1.5cm;
            size: letter;
          }
        </style>
      </head>
      <body>
        <button class="print-button" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>

        <button class="pdf-button" onclick="downloadContinuousPDF()">
          ⬇️ PDF hoja continua
        </button>

        <div class="container">
          <div class="header">
            <h1>📋 Reporte de Actividades</h1>
            ${
              Object.keys(supervisorStats).length === 1
                ? (() => {
                    const stat = Object.values(supervisorStats)[0];
                    return `
                <div style="margin: 16px 0; padding: 16px; background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px;">
                  <div style="font-size: 18px; font-weight: 700; color: #1e40af; margin-bottom: 8px;">
                    ${
                      stat.kind === 'PROYECTO'
                        ? '📁 Proyecto'
                        : '👤 Supervisor'
                    }
                  </div>
                  <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px;">
                    ${stat.name}
                  </div>
                  ${
                    stat.email
                      ? `
                    <div style="font-size: 14px; color: #6b7280;">
                      📧 ${stat.email}
                    </div>
                  `
                      : ''
                  }
                </div>
              `;
                  })()
                : ''
            }
            <div class="header-info">
              <div><strong>Período:</strong> ${filters.dateRange}</div>
              <div><strong>Estados incluidos:</strong> ${statesSummary}</div>
              <div><strong>Fecha de generación:</strong> ${new Date().toLocaleString(
                'es-MX',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}</div>
            </div>
          </div>

          <div class="summary">
            <div class="summary-item">
              <span class="summary-value">${notes.length}</span>
              <span class="summary-label">Total de Tareas</span>
            </div>
            <div class="summary-item">
              <span class="summary-value" style="color: #dc2626;">${notes.filter(
                (n) => n.estado === 0
              ).length}</span>
              <span class="summary-label">Pendientes</span>
            </div>
            <div class="summary-item">
              <span class="summary-value" style="color: #ea580c;">${notes.filter(
                (n) => n.estado === 1
              ).length}</span>
              <span class="summary-label">En Progreso</span>
            </div>
            <div class="summary-item">
              <span class="summary-value" style="color: #16a34a;">${notes.filter(
                (n) => n.estado === 2
              ).length}</span>
              <span class="summary-label">Completadas</span>
            </div>
            <div class="summary-item">
              <span class="summary-value" style="color: #0891b2;">${notes.filter(
                (n) => n.cristal
              ).length}</span>
              <span class="summary-label">Prioritarias</span>
            </div>
          </div>

          ${
            Object.keys(supervisorStats).length > 1
              ? `
            <div style="margin-bottom: 32px;">
              <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 16px;">
                📊 Resumen por Supervisor/Proyecto
              </h2>
              ${supervisorStatsHTML}
            </div>
          `
              : ''
          }

          <div>
            <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 16px;">
              📝 Detalle de Tareas
            </h2>
            ${notesHTML}
          </div>

          <div class="footer">
            <p>Reporte generado automáticamente por el Sistema de Gestión de Tareas</p>
            <p>© ${new Date().getFullYear()} - Todos los derechos reservados</p>
          </div>
        </div>

        <script>
          async function downloadContinuousPDF() {
            try {
              const container = document.querySelector('.container');
              if (!container) return;

              // Aseguramos estar arriba antes de capturar
              window.scrollTo(0, 0);

              const jsPDFConstructor =
                window.jsPDF ||
                (window.jspdf && window.jspdf.jsPDF);

              if (!jsPDFConstructor) {
                console.error('jsPDF no está disponible en window');
                alert('No se pudo cargar la librería jsPDF. Revisa conexión a internet o bloqueo de scripts externos.');
                return;
              }

              const rect = container.getBoundingClientRect();
              const width = Math.ceil(rect.width);
              const height = Math.ceil(container.scrollHeight);

              const pdf = new jsPDFConstructor('p', 'px', [width, height]);

              await pdf.html(container, {
                x: 0,
                y: 0,
                html2canvas: {
                  scale: 2,
                  useCORS: true,
                  scrollY: -window.scrollY
                },
                callback: function (doc) {
                  doc.save('reporte_hoja_continua.pdf');
                }
              });
            } catch (err) {
              console.error('Error generando PDF continuo:', err);
              alert('Ocurrió un error al generar el PDF continuo. Intenta nuevamente.');
            }
          }
        </script>
      </body>
      </html>
    `;

    return html;
  };

  const html = generateHTML();
  const newWindow = window.open('', '_blank');

  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  } else {
    alert('Por favor, permite las ventanas emergentes para ver el reporte.');
  }
}
