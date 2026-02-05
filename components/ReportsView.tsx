import React, { useEffect, useState } from 'react';
import { FileText, Download, Trash2, Eye, Calendar, Zap, FolderKanban, X, LayoutGrid, Copy, AlertTriangle, ShieldCheck, Flame, Edit2 } from 'lucide-react';
import { AnyReport, DistributionProject, Port } from '../types';
import { DataService } from '../services/supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from './Toast';
import { ExportService } from '../services/ExportService';
import { isCompatible } from '../services/utils';

export const ReportsView: React.FC<{ onEditDistribution?: (project: DistributionProject) => void }> = ({ onEditDistribution }) => {
   const [reports, setReports] = useState<AnyReport[]>([]);
   const [viewingReport, setViewingReport] = useState<AnyReport | null>(null);

   const { success, error } = useToast();

   useEffect(() => {
      loadData();
   }, []);

   const loadData = async () => {
      const data = await DataService.getReports();
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(data);
   };

   const handleDelete = async (id: string, e?: React.MouseEvent) => {
      if (e) {
         e.preventDefault();
         e.stopPropagation();
      }
      if (confirm('Deseja excluir este relatório permanentemente?')) {
         try {
            setReports(prev => prev.filter(r => r.id !== id));
            await DataService.deleteCalculation(id);
            success('Relatório excluído com sucesso.');
         } catch (err) {
            error('Erro ao excluir relatório.');
            loadData(); // Revert
         }
      }
   };

   const handleDuplicate = async (id: string, e?: React.MouseEvent) => {
      if (e) {
         e.stopPropagation();
      }
      try {
         await DataService.duplicateReport(id);
         await loadData();
         success('Relatório duplicado com sucesso!');
      } catch (err) {
         error('Erro ao duplicar relatório.');
      }
   };

   // Helper para converter HEX para RGB (para o jsPDF)
   const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
         parseInt(result[1], 16),
         parseInt(result[2], 16),
         parseInt(result[3], 16)
      ] : [60, 60, 60];
   };

   // --- PDF GENERATION LOGIC ---
   const handleDownloadPDF = (report: AnyReport) => {
      try {
         const doc = new jsPDF();

         // --- Cálculo Prévio de Totais Globais Precisos ---
         let grandTotalWatts = 0;
         let grandTotalVA = 0;

         if (report.type === 'distribution') {
            (report as DistributionProject).ports.forEach(p => {
               p.items.forEach(i => {
                  const w = i.equipment.watts * i.quantity;
                  const pf = i.equipment.powerFactor || 1;
                  grandTotalWatts += w;
                  grandTotalVA += w / pf;
               });
            });
         } else {
            report.items.forEach(i => {
               const w = i.equipment.watts * i.quantity;
               const pf = i.equipment.powerFactor || 1;
               grandTotalWatts += w;
               grandTotalVA += w / pf;
            });
         }

         const totalSystemKVA = grandTotalVA / 1000;
         // Margem de segurança de 30% para o gerador
         const generatorRecommendation = Math.ceil(totalSystemKVA * 1.3);

         // --- Header Visual ---
         doc.setFillColor(11, 17, 33); // Brand Dark Blue
         doc.rect(0, 0, 210, 40, 'F');

         // Logo / Title
         doc.setFontSize(24);
         doc.setTextColor(255, 255, 255);
         doc.text("LightLoad Pro", 14, 20);

         doc.setFontSize(10);
         doc.setTextColor(148, 163, 184); // Slate 400
         doc.text("Relatório Técnico de Planejamento de Carga", 14, 28);

         // --- Project Info ---
         doc.setTextColor(0, 0, 0);
         doc.setFontSize(18);
         doc.text(report.name, 14, 55);

         doc.setFontSize(10);
         doc.setTextColor(80, 80, 80);
         const dateStr = new Date(report.createdAt).toLocaleDateString('pt-BR');

         // Coluna da Esquerda (Dados)
         doc.text(`Data do Relatório: ${dateStr}`, 14, 63);
         doc.text(`Tensão de Operação: ${report.voltageSystem}V`, 14, 68);
         if (report.technicalResponsible) {
            doc.text(`Responsável Técnico: ${report.technicalResponsible}`, 14, 73);
         }
         if (report.description) {
            const splitDesc = doc.splitTextToSize(`Descrição: ${report.description}`, 100);
            doc.text(splitDesc, 14, 78);
         }

         // --- QUADRO DE CARGA & GERADOR (Destaque) ---
         // Box Background
         doc.setDrawColor(200, 200, 200);
         doc.setFillColor(240, 249, 255); // Light Blue Bg
         doc.roundedRect(120, 50, 76, 45, 2, 2, 'FD');

         // Title
         doc.setFontSize(11);
         doc.setTextColor(30, 64, 175); // Dark Blue
         doc.text("RESUMO DO SISTEMA", 125, 58);

         // Metrics
         doc.setFontSize(9);
         doc.setTextColor(100, 100, 100);

         doc.text("Potência Ativa Total:", 125, 66);
         doc.setFontSize(12);
         doc.setTextColor(0, 0, 0);
         doc.text(`${(grandTotalWatts / 1000).toFixed(2)} kW`, 185, 66, { align: 'right' });

         doc.setFontSize(9);
         doc.setTextColor(100, 100, 100);
         doc.text("Potência Aparente Total:", 125, 73);
         doc.setFontSize(12);
         doc.setTextColor(0, 0, 0);
         doc.text(`${totalSystemKVA.toFixed(2)} kVA`, 185, 73, { align: 'right' });

         // Generator Rec
         doc.setFillColor(37, 99, 235); // Blue 600
         doc.rect(120, 80, 76, 15, 'F');
         doc.setFontSize(8);
         doc.setTextColor(255, 255, 255);
         doc.text("GERADOR RECOMENDADO (+30%)", 158, 85, { align: 'center' });
         doc.setFontSize(14);
         doc.setFont("helvetica", "bold");
         doc.text(`${generatorRecommendation} kVA`, 158, 92, { align: 'center' });
         doc.setFont("helvetica", "normal");

         let startY = 110;

         // --- ALERT SUMMARY SECTION ---
         const pdfAlerts: Array<{ type: 'critical' | 'warning', text: string, color: [number, number, number] }> = [];

         // Detect alerts for distribution projects
         if (report.type === 'distribution') {
            const dist = report as DistributionProject;

            // Missing breakers
            const portsWithoutBreaker = dist.ports.filter(p => !p.breakerAmps || p.breakerAmps <= 0);
            if (portsWithoutBreaker.length > 0) {
               pdfAlerts.push({
                  type: 'warning',
                  text: `⚠ ${portsWithoutBreaker.length} circuito(s) sem disjuntor definido: ${portsWithoutBreaker.map(p => p.name).join(', ')}`,
                  color: [234, 179, 8] // Yellow
               });
            }

            // Voltage incompatibility
            const hasVoltageIssue = dist.ports.some(p => p.items.some(i => !isCompatible(report.voltageSystem, i.equipment.voltage)));
            if (hasVoltageIssue) {
               pdfAlerts.push({
                  type: 'critical',
                  text: '⚠ Equipamentos com tensão incompatível ao sistema detectados',
                  color: [239, 68, 68] // Red
               });
            }

            // Overload detection
            const overloadedPorts = dist.ports.filter(p => {
               const portWatts = p.items.reduce((sum, i) => sum + (i.equipment.watts * i.quantity), 0);
               const portPF = 0.8; // Approximate
               const portVA = portWatts / portPF;
               const portAmps = portVA / report.voltageSystem;
               return p.breakerAmps > 0 && portAmps > p.breakerAmps;
            });

            if (overloadedPorts.length > 0) {
               pdfAlerts.push({
                  type: 'critical',
                  text: `🔥 ${overloadedPorts.length} circuito(s) sobrecarregado(s): ${overloadedPorts.map(p => p.name).join(', ')}`,
                  color: [239, 68, 68] // Red
               });
            }
         }

         // Display alerts if any
         if (pdfAlerts.length > 0) {
            doc.setFillColor(254, 243, 199); // Amber 100
            doc.rect(14, startY, 182, 8 + (pdfAlerts.length * 5), 'F');

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(146, 64, 14); // Amber 900
            doc.text("⚠ ALERTAS DO SISTEMA", 17, startY + 5);
            doc.setFont("helvetica", "normal");

            let alertY = startY + 10;
            pdfAlerts.forEach(alert => {
               doc.setFontSize(8);
               doc.setTextColor(alert.color[0], alert.color[1], alert.color[2]);
               doc.text(alert.text, 17, alertY);
               alertY += 5;
            });

            startY += 12 + (pdfAlerts.length * 5);
         }

         // --- TABELAS DE CIRCUITOS ---
         if (report.type === 'distribution') {
            const dist = report as DistributionProject;

            dist.ports.forEach((port) => {
               let portWatts = 0;
               let portVA = 0;

               const bodyData = port.items.map(item => {
                  const w = item.equipment.watts * item.quantity;
                  const pf = item.equipment.powerFactor || 1;
                  const va = w / pf;
                  const amps = va / dist.voltageSystem;

                  portWatts += w;
                  portVA += va;

                  return [
                     item.equipment.name,
                     item.quantity,
                     `${item.equipment.watts}W`,
                     pf.toFixed(2),
                     `${(w / 1000).toFixed(2)} kW`,
                     `${(va / 1000).toFixed(2)} kVA`,
                     `${amps.toFixed(1)} A`
                  ];
               });

               const portAmps = portVA / dist.voltageSystem;
               const portKVA = portVA / 1000;
               const percentage = port.breakerAmps > 0 ? (portAmps / port.breakerAmps) * 100 : 0;

               // Cores de Status com detecção de disjuntor faltando
               let statusText = "SEGURO";
               let statusColorHex = "#10b981"; // Emerald

               if (!port.breakerAmps || port.breakerAmps <= 0) {
                  statusText = "⚠ SEM DISJUNTOR";
                  statusColorHex = "#eab308"; // Yellow
               } else if (percentage > 100) {
                  statusText = "🔥 SOBRECARGA";
                  statusColorHex = "#ef4444"; // Red
               } else if (percentage > 80) {
                  statusText = "ATENÇÃO";
                  statusColorHex = "#f97316"; // Orange
               }

               const statusRGB = hexToRgb(statusColorHex);
               const headerRGB = hexToRgb(port.color);

               // Verificar quebra de página
               if (startY > 250) { doc.addPage(); startY = 20; }

               // Header do Circuito (Faixa Colorida)
               doc.setFillColor(headerRGB[0], headerRGB[1], headerRGB[2]);
               doc.rect(14, startY, 182, 9, 'F');

               // Texto Header
               doc.setFontSize(11);
               doc.setTextColor(255, 255, 255);
               doc.setFont("helvetica", "bold");
               doc.text(`${port.name} (${port.abbreviation})`, 17, startY + 6);

               // Info Disjuntor no Header
               doc.setFontSize(10);
               doc.setFont("helvetica", "normal");
               const breakerText = port.breakerAmps > 0 ? `Disjuntor: ${port.breakerAmps}A` : 'Disjuntor: NÃO DEFINIDO';
               doc.text(breakerText, 190, startY + 6, { align: 'right' });

               // Barra de Status (Abaixo do header) - com destaque se houver problema
               doc.setFontSize(9);
               doc.setFont("helvetica", "bold");
               doc.setTextColor(statusRGB[0], statusRGB[1], statusRGB[2]);
               const statusDisplay = port.breakerAmps > 0
                  ? `Status: ${statusText} (${percentage.toFixed(0)}% de carga)`
                  : `Status: ${statusText}`;
               doc.text(statusDisplay, 14, startY + 14);
               doc.setFont("helvetica", "normal");

               // Tabela
               autoTable(doc, {
                  startY: startY + 16,
                  head: [['Equipamento', 'Qtd', 'Unit (W)', 'FP', 'Total kW', 'Total kVA', 'Amperes']],
                  body: bodyData,
                  theme: 'grid',
                  headStyles: {
                     fillColor: headerRGB,
                     textColor: 255,
                     fontStyle: 'bold'
                  },
                  styles: { fontSize: 8, cellPadding: 1.5 },
                  columnStyles: {
                     0: { cellWidth: 'auto' }, // Nome
                     4: { fontStyle: 'bold' }, // kW
                     6: { fontStyle: 'bold', halign: 'right' } // Amps
                  },
                  // Footer com totais do circuito
                  foot: [['TOTAIS DO CIRCUITO', '', '', '', `${(portWatts / 1000).toFixed(2)} kW`, `${portKVA.toFixed(2)} kVA`, `${portAmps.toFixed(1)} A`]],
                  footStyles: {
                     fillColor: [240, 240, 240],
                     textColor: [0, 0, 0],
                     fontStyle: 'bold',
                     halign: 'right'
                  },
                  didParseCell: (data) => {
                     // Alinha colunas numéricas à direita no footer, exceto a primeira
                     if (data.section === 'foot' && data.column.index === 0) {
                        data.cell.styles.halign = 'left';
                     }
                  }
               });

               // @ts-ignore
               startY = doc.lastAutoTable.finalY + 15;
            });

         } else {
            // --- RELATÓRIO SIMPLES (CALCULADORA) ---
            const bodyData = report.items.map(item => {
               const w = item.equipment.watts * item.quantity;
               const pf = item.equipment.powerFactor || 1;
               const va = w / pf;
               const amps = va / report.voltageSystem;
               return [
                  item.equipment.name,
                  item.quantity,
                  `${item.equipment.watts}W`,
                  pf.toFixed(2),
                  `${(w / 1000).toFixed(2)} kW`,
                  `${(va / 1000).toFixed(2)} kVA`,
                  `${amps.toFixed(1)} A`
               ];
            });

            autoTable(doc, {
               startY: startY,
               head: [['Equipamento', 'Qtd', 'Unit (W)', 'FP', 'Total kW', 'Total kVA', 'Amperes']],
               body: bodyData,
               theme: 'striped',
               headStyles: { fillColor: [59, 130, 246] },
               styles: { fontSize: 9 },
               foot: [['TOTAIS GERAIS', '', '', '', `${(grandTotalWatts / 1000).toFixed(2)} kW`, `${totalSystemKVA.toFixed(2)} kVA`, `${report.totalAmperes.toFixed(1)} A`]],
               footStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' }
            });
         }

         // --- Footer de Página ---
         const pageCount = doc.getNumberOfPages();

         // CHECK VOLTAGE COMPATIBILITY
         let hasVoltageIssue = false;
         if (report.type === 'distribution') {
            (report as DistributionProject).ports.forEach(p => {
               if (p.items.some(i => !isCompatible(report.voltageSystem, i.equipment.voltage))) hasVoltageIssue = true;
            });
         } else {
            if (report.items.some(i => !isCompatible(report.voltageSystem, i.equipment.voltage))) hasVoltageIssue = true;
         }

         if (hasVoltageIssue) {
            doc.setFillColor(254, 202, 202); // Red 200
            doc.rect(14, 98, 182, 10, 'F');
            doc.setFontSize(10);
            doc.setTextColor(185, 28, 28); // Red 700
            doc.text("ATENÇÃO: Existem equipamentos incompatíveis com a tensão do sistema neste relatório.", 105, 104, { align: 'center' });
         } else {
            // Safe - optional message
         }

         for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Gerado por LightLoad Pro - Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
         }

         doc.save(`Relatorio_${report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
         success('PDF gerado com sucesso!');
      } catch (err) {
         console.error(err);
         error('Erro ao gerar PDF.');
      }
   };

   // --- HELPER: CALCULATE PORT TOTALS (FOR VIEWER) ---
   const getPortMetrics = (port: Port, voltage: number) => {
      let w = 0;
      let va = 0;
      (port.items || []).forEach(i => {
         const watts = Number(i.equipment.watts) || 0;
         const qty = Number(i.quantity) || 0;
         const pf = Number(i.equipment.powerFactor) || 1;

         w += watts * qty;
         va += (watts * qty) / pf;
      });
      const safeVoltage = Number(voltage) || 220;
      const amps = safeVoltage > 0 ? va / safeVoltage : 0;
      return { w, va, amps };
   };

   return (
      <div className="animate-fade-in pb-20">
         <div className="mb-8 flex justify-between items-start">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-900/20">
                     <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Relatórios</h1>
               </div>
               <p className="text-slate-400 text-sm">Histórico de cálculos salvos e projetos de distribuição</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.length === 0 ? (
               <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-surface/30">
                  <div className="bg-slate-800/50 p-4 rounded-full mx-auto w-fit mb-3">
                     <FileText className="w-8 h-8 opacity-50" />
                  </div>
                  <p>Nenhum relatório salvo ainda.</p>
               </div>
            ) : reports.map((report) => {
               // ALERT DETECTION
               const alerts: Array<{ type: 'critical' | 'warning' | 'info', icon: any, text: string, color: string }> = [];

               // 1. Missing Breakers (Distribution only)
               if (report.type === 'distribution') {
                  const dist = report as DistributionProject;
                  const portsWithoutBreaker = dist.ports.filter(p => !p.breakerAmps || p.breakerAmps <= 0);
                  if (portsWithoutBreaker.length > 0) {
                     alerts.push({
                        type: 'warning',
                        icon: AlertTriangle,
                        text: `${portsWithoutBreaker.length} circuito(s) sem disjuntor`,
                        color: 'yellow'
                     });
                  }
               }

               // 2. Voltage Check
               const hasVoltageError = report.type === 'distribution'
                  ? (report as DistributionProject).ports.some(p => p.items.some(i => !isCompatible(report.voltageSystem, i.equipment.voltage)))
                  : report.items.some(i => !isCompatible(report.voltageSystem, i.equipment.voltage));

               if (hasVoltageError) {
                  alerts.push({
                     type: 'critical',
                     icon: AlertTriangle,
                     text: 'Tensão incompatível',
                     color: 'red'
                  });
               }

               // 3. Overload Check (Distribution only)
               if (report.type === 'distribution') {
                  const dist = report as DistributionProject;
                  const loads = (dist.ports || []).map(p => {
                     const metrics = getPortMetrics(p, Number(report.voltageSystem) || 220);
                     const breaker = Number(p.breakerAmps);

                     if (!breaker || breaker <= 0) {
                        return metrics.amps > 0.1 ? 999 : 0;
                     }

                     return (metrics.amps / breaker) * 100;
                  });

                  const maxLoad = Math.max(0, ...loads);

                  if (maxLoad > 100) {
                     alerts.push({
                        type: 'critical',
                        icon: Flame,
                        text: 'Sobrecarga detectada',
                        color: 'red'
                     });
                  } else if (maxLoad > 80) {
                     alerts.push({
                        type: 'warning',
                        icon: AlertTriangle,
                        text: `Carga em ${maxLoad.toFixed(0)}%`,
                        color: 'orange'
                     });
                  }
               }

               // 4. Simple report-specific alerts
               else {
                  // High current warning (common breaker limits)
                  const totalAmps = report.totalAmperes;
                  console.log(`📊 Simple Report "${report.name}" - Current: ${totalAmps.toFixed(1)}A`);

                  if (totalAmps > 20) {
                     alerts.push({
                        type: 'critical',
                        icon: Flame,
                        text: `Sobrecarga! ${totalAmps.toFixed(1)}A (>20A)`,
                        color: 'red'
                     });
                  } else if (totalAmps > 16) {
                     alerts.push({
                        type: 'warning',
                        icon: AlertTriangle,
                        text: `Atenção: ${totalAmps.toFixed(1)}A (80%)`,
                        color: 'orange'
                     });
                  } else if (totalAmps > 12) {
                     alerts.push({
                        type: 'info',
                        icon: AlertTriangle,
                        text: `Carga moderada: ${totalAmps.toFixed(1)}A`,
                        color: 'yellow'
                     });
                  }
               }

               return (
                  <div key={report.id} className={`
             bg-surface border rounded-xl p-6 transition-all group relative overflow-hidden flex flex-col hover:shadow-xl
             ${report.type === 'distribution' ? 'border-purple-500/30 hover:border-purple-500/60' : 'border-slate-700 hover:border-blue-500/50'}
           `}>
                     {/* Decorative header */}
                     <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r opacity-80
                 ${report.type === 'distribution' ? 'from-purple-600 to-pink-500' : 'from-blue-600 to-cyan-500'}
              `}></div>

                     <div className="flex justify-between items-start mb-4">
                        <div className="overflow-hidden">
                           <div className="flex items-center gap-2 mb-1">
                              {report.type === 'distribution' ? (
                                 <span className="text-[10px] bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-bold uppercase tracking-wider">Distribuição</span>
                              ) : (
                                 <span className="text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold uppercase tracking-wider">Simples</span>
                              )}
                           </div>
                           <h3 className="text-lg font-bold text-white truncate pr-2" title={report.name}>{report.name}</h3>
                           <p className="text-sm text-slate-400 line-clamp-1 h-5">{report.description || 'Sem descrição'}</p>
                        </div>
                     </div>

                     <div className="space-y-3 mb-6 flex-1">
                        <div className="flex justify-between text-sm py-1 border-b border-slate-800/50">
                           <span className="text-slate-500">Potência Total:</span>
                           <span className="text-white font-medium">{(report.totalWatts / 1000).toFixed(2)} kW</span>
                        </div>
                        <div className="flex justify-between text-sm py-1 border-b border-slate-800/50">
                           <span className="text-slate-500">Corrente Total:</span>
                           <span className={`${report.type === 'distribution' ? 'text-purple-400' : 'text-blue-400'} font-bold`}>{report.totalAmperes.toFixed(2)} A</span>
                        </div>
                        {report.technicalResponsible && (
                           <div className="flex justify-between text-sm py-1">
                              <span className="text-slate-500">Resp. Técnico:</span>
                              <span className="text-slate-300 truncate max-w-[120px]">{report.technicalResponsible}</span>
                           </div>
                        )}
                     </div>

                     {/* Alert Badges */}
                     {alerts.length > 0 && (
                        <div className="mb-6 space-y-2">
                           {alerts.map((alert, idx) => (
                              <div key={idx} className={`
                                 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold
                                 ${alert.color === 'red' ? 'bg-red-500/10 border-red-500/30 text-red-300 animate-pulse' :
                                    alert.color === 'orange' ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' :
                                       'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'}
                              `}>
                                 <alert.icon className="w-4 h-4 shrink-0" />
                                 <span className="flex-1">{alert.text}</span>
                              </div>
                           ))}
                        </div>
                     )}

                     <div className="flex gap-2 mt-auto">
                        <button
                           onClick={() => setViewingReport(report)}
                           className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors border border-slate-700 hover:border-slate-600"
                           title="Visualizar no App"
                        >
                           <Eye className="w-4 h-4" />
                        </button>
                        {report.type === 'distribution' && (
                           <button
                              onClick={() => onEditDistribution && onEditDistribution(report as DistributionProject)}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded-lg transition-colors border border-slate-700 hover:border-slate-600"
                              title="Editar Projeto"
                           >
                              <Edit2 className="w-4 h-4" />
                           </button>
                        )}
                        <button
                           onClick={() => handleDownloadPDF(report)}
                           className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm py-2 rounded-lg transition-colors border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-2 font-medium"
                           title="Baixar PDF"
                        >
                           <Download className="w-4 h-4" /> Baixar PDF
                        </button>
                        <button
                           onClick={(e) => handleDuplicate(report.id, e)}
                           className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-400 rounded-lg border border-slate-700 hover:border-purple-500/30 transition-colors"
                           title="Duplicar Relatório"
                        >
                           <Copy className="w-4 h-4" />
                        </button>
                        <button
                           onClick={(e) => handleDelete(report.id, e)}
                           className="px-3 py-2 bg-slate-800 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg border border-slate-700 hover:border-red-500/30 transition-colors"
                           title="Excluir Relatório"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               );
            })}
         </div>

         {/* VIEW REPORT MODAL */}
         {viewingReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
               <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] my-auto">
                  {/* Header */}
                  <div className="p-5 border-b border-slate-700 bg-slate-900 rounded-t-xl flex justify-between items-center shrink-0">
                     <div>
                        <h3 className="font-bold text-white text-xl">{viewingReport.name}</h3>
                        <p className="text-slate-400 text-xs">Visualização rápida do sistema</p>
                     </div>
                     <button onClick={() => setViewingReport(null)} className="p-1 rounded hover:bg-slate-800"><X className="w-6 h-6 text-slate-400 hover:text-white" /></button>
                  </div>

                  {/* Content Scrollable */}
                  <div className="overflow-y-auto p-6 flex-1 bg-slate-900/40">

                     {/* Summary Stats */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                           <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Potência Ativa</span>
                           <span className="text-xl font-bold text-white">{(viewingReport.totalWatts / 1000).toFixed(2)} kW</span>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                           <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Corrente Total</span>
                           <span className="text-xl font-bold text-blue-400">{viewingReport.totalAmperes.toFixed(1)} A</span>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                           <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tensão</span>
                           <span className="text-xl font-bold text-white">{viewingReport.voltageSystem} V</span>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                           <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Responsável</span>
                           <span className="text-sm font-bold text-purple-300 truncate block mt-1">{viewingReport.technicalResponsible || 'N/A'}</span>
                        </div>
                     </div>

                     {/* Alert Summary (Modal) */}
                     {(() => {
                        const modalAlerts: Array<{ icon: any, text: string, color: string }> = [];

                        if (viewingReport.type === 'distribution') {
                           const dist = viewingReport as DistributionProject;

                           // Missing breakers
                           const portsWithoutBreaker = dist.ports.filter(p => !p.breakerAmps || p.breakerAmps <= 0);
                           if (portsWithoutBreaker.length > 0) {
                              modalAlerts.push({
                                 icon: AlertTriangle,
                                 text: `${portsWithoutBreaker.length} circuito(s) sem disjuntor definido`,
                                 color: 'yellow'
                              });
                           }

                           // Voltage issues
                           const hasVoltageIssue = dist.ports.some(p => p.items.some(i => !isCompatible(viewingReport.voltageSystem, i.equipment.voltage)));
                           if (hasVoltageIssue) {
                              modalAlerts.push({
                                 icon: AlertTriangle,
                                 text: 'Equipamentos com tensão incompatível detectados',
                                 color: 'red'
                              });
                           }

                           // Overload
                           const overloadedPorts = dist.ports.filter(p => {
                              const metrics = getPortMetrics(p, viewingReport.voltageSystem);
                              return p.breakerAmps > 0 && metrics.amps > p.breakerAmps;
                           });

                           if (overloadedPorts.length > 0) {
                              modalAlerts.push({
                                 icon: Flame,
                                 text: `${overloadedPorts.length} circuito(s) sobrecarregado(s)`,
                                 color: 'red'
                              });
                           }
                        }

                        return modalAlerts.length > 0 ? (
                           <div className="mb-6 space-y-2">
                              <h4 className="text-sm font-bold text-slate-300 mb-3">⚠️ Alertas do Sistema</h4>
                              {modalAlerts.map((alert, idx) => (
                                 <div key={idx} className={`
                                  flex items-center gap-3 p-3 rounded-lg border
                                  ${alert.color === 'red' ? 'bg-red-500/10 border-red-500/30 text-red-300 animate-pulse' :
                                       alert.color === 'orange' ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' :
                                          'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'}
                               `}>
                                    <alert.icon className="w-5 h-5 shrink-0" />
                                    <span className="font-bold text-sm">{alert.text}</span>
                                 </div>
                              ))}
                           </div>
                        ) : null;
                     })()}

                     {/* Distribution Logic Visualization */}
                     {viewingReport.type === 'distribution' ? (
                        <div className="space-y-6">
                           <h4 className="font-bold text-slate-300 border-b border-slate-700 pb-2 flex items-center gap-2">
                              <FolderKanban className="w-4 h-4" /> Detalhamento de Circuitos
                           </h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(viewingReport as DistributionProject).ports.map(port => {
                                 const metrics = getPortMetrics(port, viewingReport.voltageSystem);
                                 const breaker = Number(port.breakerAmps);

                                 let loadPercent = 0;
                                 if (breaker > 0) {
                                    loadPercent = (metrics.amps / breaker) * 100;
                                 } else if (metrics.amps > 0.1) {
                                    // No breaker but has load => Danger
                                    loadPercent = 999;
                                 }

                                 const isDanger = loadPercent > 100;
                                 const isWarning = loadPercent > 80 && !isDanger;
                                 const missingBreaker = !breaker || breaker <= 0;
                                 const hasVoltageIssue = port.items.some(i => !isCompatible(viewingReport.voltageSystem, i.equipment.voltage));

                                 return (
                                    <div key={port.id} className={`
                                       bg-surface rounded-xl border overflow-hidden shadow-sm
                                       ${isDanger || missingBreaker ? 'border-red-500/50' :
                                          isWarning ? 'border-orange-500/50' :
                                             'border-slate-700'}
                                    `}>
                                       <div className="h-1.5" style={{ backgroundColor: port.color }}></div>
                                       <div className="p-4">
                                          <div className="flex justify-between items-start mb-3">
                                             <div>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold text-slate-900 mb-1 inline-block shadow-sm" style={{ backgroundColor: port.color }}>
                                                   {port.abbreviation}
                                                </span>
                                                <div className="font-bold text-white text-lg">{port.name}</div>

                                                {/* Alert badges for this circuit */}
                                                {(missingBreaker || hasVoltageIssue) && (
                                                   <div className="mt-2 flex flex-col gap-1">
                                                      {missingBreaker && (
                                                         <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold">
                                                            <AlertTriangle className="w-3 h-3" /> Sem disjuntor
                                                         </div>
                                                      )}
                                                      {hasVoltageIssue && (
                                                         <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold">
                                                            <AlertTriangle className="w-3 h-3" /> Tensão incompatível
                                                         </div>
                                                      )}
                                                   </div>
                                                )}
                                             </div>
                                             <div className="text-right">
                                                <div className="text-xl font-mono font-bold text-white">{metrics.amps.toFixed(1)} A</div>
                                                <div className="text-[10px] text-slate-500 bg-slate-800 px-1.5 rounded">
                                                   {breaker > 0 ? `de ${breaker}A máx` : 'Sem disjuntor'}
                                                </div>
                                             </div>
                                          </div>

                                          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4 overflow-hidden">
                                             <div
                                                className={`h-full rounded-full transition-all ${isDanger ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(loadPercent, 100)}%` }}
                                             ></div>
                                          </div>

                                          <div className="space-y-1 bg-slate-800/30 rounded-lg p-2 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                                             {(port.items || []).map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs py-1.5 border-b border-slate-700/50 text-slate-400 last:border-0 hover:bg-slate-700/30 px-1 rounded">
                                                   <span className="font-medium text-slate-300">{item.quantity}x {item.equipment.name}</span>
                                                   <div className="flex gap-2">
                                                      <span>{((item.equipment.watts * item.quantity) / 1000).toFixed(2)} kW</span>
                                                   </div>
                                                </div>
                                             ))}
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     ) : (
                        <div>
                           <h4 className="font-bold text-slate-300 border-b border-slate-700 pb-2 mb-4 flex items-center gap-2">
                              <LayoutGrid className="w-4 h-4" /> Lista de Equipamentos
                           </h4>
                           <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden">
                              <table className="w-full text-sm text-left">
                                 <thead className="text-xs text-slate-500 uppercase bg-slate-800">
                                    <tr>
                                       <th className="px-4 py-3">Item</th>
                                       <th className="px-4 py-3 text-center">Qtd</th>
                                       <th className="px-4 py-3 text-right">Potência</th>
                                       <th className="px-4 py-3 text-right">Corrente</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-800">
                                    {viewingReport.items.map((item, idx) => {
                                       const itemAmps = (item.equipment.watts * item.quantity) / (viewingReport.voltageSystem * (item.equipment.powerFactor || 1));
                                       return (
                                          <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                             <td className="px-4 py-3 font-medium text-white">{item.equipment.name}</td>
                                             <td className="px-4 py-3 text-center text-slate-300">{item.quantity}</td>
                                             <td className="px-4 py-3 text-right text-slate-300">{((item.equipment.watts * item.quantity) / 1000).toFixed(2)} kW</td>
                                             <td className="px-4 py-3 text-right text-blue-400 font-mono font-bold">{itemAmps.toFixed(1)} A</td>
                                          </tr>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}

                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-slate-700 bg-slate-900 rounded-b-xl flex justify-end gap-3 shrink-0">
                     <button onClick={() => setViewingReport(null)} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium">Fechar</button>
                     <button onClick={() => handleDownloadPDF(viewingReport)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                        <Download className="w-4 h-4" /> Baixar PDF
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
