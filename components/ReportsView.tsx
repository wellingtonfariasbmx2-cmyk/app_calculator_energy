import React, { useEffect, useState } from 'react';
import { FileText, Download, Trash2, Eye, Calendar, Zap, FolderKanban, X, LayoutGrid, Copy, AlertTriangle, ShieldCheck, Flame, Edit2, Cable, Plug } from 'lucide-react';
import { AnyReport, DistributionProject, Port } from '../types';
import { DataService } from '../services/supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from './Toast';
import { ExportService } from '../services/ExportService';
import { isCompatible } from '../services/utils';
import { useConfirm } from './ConfirmModal';
import { getCableSpecs, getCableColorClass } from '../utils/cableCalculations';

export const ReportsView: React.FC<{ onEditDistribution?: (project: DistributionProject) => void }> = ({ onEditDistribution }) => {
    const [reports, setReports] = useState<AnyReport[]>([]);
    const [viewingReport, setViewingReport] = useState<AnyReport | null>(null);

    const { success, error } = useToast();
    const { confirm, ConfirmModalComponent } = useConfirm();

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
        const confirmed = await confirm({
            title: 'Excluir Relatório',
            message: 'Deseja excluir este relatório permanentemente? Esta ação não pode ser desfeita.',
            variant: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (confirmed) {
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
        ] : [59, 130, 246];
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
                // Safe check for simple reports
                if ('items' in report) {
                    (report as any).items.forEach((i: any) => {
                        const w = i.equipment.watts * i.quantity;
                        const pf = i.equipment.powerFactor || 1;
                        grandTotalWatts += w;
                        grandTotalVA += w / pf;
                    });
                }
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

            const voltage = 'voltageSystem' in report ? (report as any).voltageSystem : 220;
            doc.text(`Tensão de Operação: ${voltage}V`, 14, 68);

            if (report.technicalResponsible) {
                doc.text(`Responsável Técnico: ${report.technicalResponsible}`, 14, 73);
            }

            const description = 'description' in report ? (report as any).description : '';
            if (description) {
                const splitDesc = doc.splitTextToSize(`Descrição: ${description}`, 100);
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

            // --- SEÇÃO DE ALERTAS (se houver problemas) ---
            if (report.type === 'distribution') {
                const distReport = report as DistributionProject;
                const alerts: Array<{ type: string; count: number; icon: string; color: [number, number, number] }> = [];

                // Detectar circuitos sem disjuntor
                const portsWithoutBreaker = distReport.ports.filter(p => !p.breakerAmps || p.breakerAmps <= 0);
                if (portsWithoutBreaker.length > 0) {
                    alerts.push({ type: 'Sem Disjuntor', count: portsWithoutBreaker.length, icon: '!', color: [251, 146, 60] }); // Orange
                }

                // Detectar sobrecargas
                let overloadCount = 0;
                let warningCount = 0;
                distReport.ports.forEach(port => {
                    let portVA = 0;
                    port.items.forEach(i => {
                        const w = i.equipment.watts * i.quantity;
                        portVA += w / (i.equipment.powerFactor || 1);
                    });
                    const portAmps = portVA / (distReport.voltageSystem || 220);
                    const loadPercent = port.breakerAmps > 0 ? (portAmps / port.breakerAmps) * 100 : 0;

                    if (loadPercent > 100) overloadCount++;
                    else if (loadPercent > 80) warningCount++;
                });

                if (overloadCount > 0) {
                    alerts.push({ type: 'SOBRECARGA', count: overloadCount, icon: 'X', color: [239, 68, 68] }); // Red
                }
                if (warningCount > 0) {
                    alerts.push({ type: 'Atencao (>80%)', count: warningCount, icon: '!', color: [251, 146, 60] }); // Orange
                }

                // Incompatibilidades de tensão
                const voltageErrors = distReport.ports.filter(p =>
                    p.items.some(i => !isCompatible(distReport.voltageSystem, i.equipment.voltage))
                ).length;
                if (voltageErrors > 0) {
                    alerts.push({ type: 'Tensao Incompativel', count: voltageErrors, icon: '!', color: [239, 68, 68] }); // Red
                }

                // Renderizar alertas se existir algum
                if (alerts.length > 0) {
                    // Background do quadro de alertas
                    doc.setFillColor(254, 226, 226); // Red-50
                    doc.setDrawColor(239, 68, 68); // Red-500
                    doc.setLineWidth(0.5);
                    doc.roundedRect(14, startY, 182, 8 + (alerts.length * 7), 2, 2, 'FD');

                    // Título
                    doc.setFontSize(10);
                    doc.setTextColor(153, 27, 27); // Red-900
                    doc.setFont("helvetica", "bold");
                    doc.text("*** ALERTAS DO SISTEMA ***", 20, startY + 6);
                    doc.setFont("helvetica", "normal");

                    // Listar alertas
                    doc.setFontSize(9);
                    alerts.forEach((alert, idx) => {
                        const y = startY + 13 + (idx * 7);
                        doc.setTextColor(alert.color[0], alert.color[1], alert.color[2]);
                        doc.text(`[${alert.icon}] ${alert.type}: ${alert.count} circuito(s)`, 25, y);
                    });

                    startY += 15 + (alerts.length * 7);
                }
            }

            // --- TABELAS DE EQUIPAMENTOS ---
            if (report.type === 'distribution') {
                const distReport = report as DistributionProject;

                // Loop pelas portas (circuitos)
                distReport.ports.forEach((port, index) => {
                    // Check page break
                    if (startY > 250) {
                        doc.addPage();
                        startY = 20;
                    }

                    // Port Header
                    doc.setFontSize(11);
                    doc.setTextColor(0, 0, 0);
                    doc.setFont("helvetica", "bold");

                    // Calcular carga da porta
                    let portWatts = 0;
                    let portVA = 0;
                    port.items.forEach(i => {
                        const w = i.equipment.watts * i.quantity;
                        portWatts += w;
                        portVA += w / (i.equipment.powerFactor || 1);
                    });

                    const safeVoltage = distReport.voltageSystem || 220;
                    const portAmps = safeVoltage > 0 ? portVA / safeVoltage : 0;

                    // Cable specifications
                    const cableSpecs = getCableSpecs(portAmps);

                    // Determine status
                    const loadPercent = port.breakerAmps > 0 ? (portAmps / port.breakerAmps) * 100 : 0;
                    let statusText = '[OK] SEGURO';
                    let statusColor: [number, number, number] = [16, 185, 129]; // Green
                    if (loadPercent > 100) {
                        statusText = '[X] SOBRECARGA';
                        statusColor = [239, 68, 68]; // Red
                    } else if (loadPercent > 80) {
                        statusText = '[!] ATENCAO';
                        statusColor = [251, 146, 60]; // Orange
                    }

                    // Determine phase color
                    let phaseColor: [number, number, number] = [59, 130, 246]; // Default Blue
                    let phaseName = '';
                    let foundPhase = false;

                    if (distReport.mainpowerConfig?.enabled) {
                        const phase = distReport.mainpowerConfig.phases.find(ph => ph.ports.includes(port.id));
                        if (phase) {
                            phaseColor = hexToRgb(phase.color);
                            phaseName = ` • FASE ${phase.phaseId}`;
                            foundPhase = true;
                        }
                    }

                    // Fallback to Port Color if no phase assigned
                    if (!foundPhase && port.color) {
                        phaseColor = hexToRgb(port.color);
                    }

                    doc.setTextColor(phaseColor[0], phaseColor[1], phaseColor[2]);
                    doc.text(`Circuito ${index + 1}: ${port.name}${phaseName}`, 14, startY);

                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    doc.setFont("helvetica", "normal");

                    const breakerInfo = port.breakerAmps ? `Disjuntor: ${port.breakerAmps}A` : 'Sem disjuntor definido';
                    const cableInfo = `Cabo: ${cableSpecs.gauge}mm² • Conector: ${cableSpecs.connectorType}`;
                    doc.text(`${breakerInfo} • Carga: ${portAmps.toFixed(1)}A / ${(portWatts / 1000).toFixed(2)}kW`, 14, startY + 5);
                    doc.text(cableInfo, 14, startY + 10);

                    // Status badge
                    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
                    doc.setFont("helvetica", "bold");
                    doc.text(statusText, 160, startY + 10);
                    doc.setFont("helvetica", "normal");

                    startY += 17;

                    // Tabela de itens da porta com colunas extras
                    const bodyData = port.items.map(item => {
                        const w = item.equipment.watts * item.quantity;
                        const pf = item.equipment.powerFactor || 1;
                        const va = w / pf;
                        const amps = va / distReport.voltageSystem;
                        return [
                            item.equipment.name,
                            item.quantity,
                            `${item.equipment.watts}W`,
                            pf.toFixed(2),
                            `${(w / 1000).toFixed(2)} kW`,
                            `${amps.toFixed(1)} A`
                        ];
                    });

                    autoTable(doc, {
                        startY: startY,
                        head: [['Equipamento', 'Qtd', 'Unit (W)', 'FP', 'Total kW', 'Amperes']],
                        body: bodyData,
                        theme: 'grid', // Excel-like grid
                        headStyles: {
                            fillColor: phaseColor,
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            lineWidth: 0.1,
                            lineColor: [200, 200, 200]
                        },
                        styles: {
                            fontSize: 9,
                            lineWidth: 0.1,
                            lineColor: [200, 200, 200]
                        },
                        alternateRowStyles: {
                            fillColor: [245, 245, 245] // Light gray for alternating rows
                        },
                        margin: { left: 14, right: 14 }
                    });

                    startY = (doc as any).lastAutoTable.finalY + 10;
                });
            } else {
                // Report Simples
                if ('items' in report) {
                    const simpleReport = report as any;
                    const bodyData = simpleReport.items.map((item: any) => {
                        const w = item.equipment.watts * item.quantity;
                        const pf = item.equipment.powerFactor || 1;
                        const va = w / pf;
                        const amps = va / simpleReport.voltageSystem;
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
                        foot: [['TOTAIS GERAIS', '', '', '', `${(grandTotalWatts / 1000).toFixed(2)} kW`, `${totalSystemKVA.toFixed(2)} kVA`, `${simpleReport.totalAmperes.toFixed(1)} A`]],
                        footStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' }
                    });
                }
            }

            // --- Footer de Página ---
            const pageCount = doc.getNumberOfPages();
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
            <ConfirmModalComponent />
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
                        ? (report as DistributionProject).ports.some(p => p.items.some(i => !isCompatible((report as any).voltageSystem, i.equipment.voltage)))
                        : 'items' in report ? (report as any).items.some((i: any) => !isCompatible((report as any).voltageSystem, i.equipment.voltage)) : false;

                    if (hasVoltageError) {
                        alerts.push({
                            type: 'critical',
                            icon: AlertTriangle,
                            text: 'Tensão incompatível',
                            color: 'red'
                        });
                    }

                    return (
                        <div key={report.id} className={`group bg-slate-900 border border-slate-800/60 rounded-xl p-5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/10 flex flex-col h-full relative overflow-hidden ${viewingReport?.id === report.id ? 'ring-2 ring-blue-500' : ''}`}>
                            {/* Type Badge */}
                            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider ${report.type === 'distribution' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                {report.type === 'distribution' ? 'Projeto' : 'Cálculo'}
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="pr-12">
                                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-1" title={report.name}>
                                        {report.name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                                        <span>•</span>
                                        <span>{(report as any).voltageSystem}V</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 flex-grow">
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

                                {/* Alerts Badge Container */}
                                {alerts.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {alerts.map((alert, idx) => (
                                            <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded bg-${alert.color}-500/10 border border-${alert.color}-500/20 text-${alert.color}-400 text-[10px]`}>
                                                <alert.icon className="w-3 h-3" />
                                                <span>{alert.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-auto">
                                <button
                                    onClick={() => setViewingReport(report)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Eye className="w-3.5 h-3.5" /> Detalhes
                                </button>

                                <button
                                    onClick={() => handleDownloadPDF(report)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                                    title="Baixar PDF"
                                >
                                    <Download className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={(e) => handleDuplicate(report.id, e)}
                                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
                                    title="Duplicar"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={(e) => handleDelete(report.id, e)}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 p-2 rounded-lg transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* DETAIL MODAL */}
            {viewingReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    {viewingReport.type === 'distribution' ? <FolderKanban className="text-purple-400" /> : <Zap className="text-blue-400" />}
                                    {viewingReport.name}
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">Detalhes do relatório e equipamentos</p>
                            </div>
                            <button
                                onClick={() => setViewingReport(null)}
                                className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
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
                                    <span className="text-xl font-bold text-white">
                                        {'voltageSystem' in viewingReport ? (viewingReport as any).voltageSystem : 'N/A'} V
                                    </span>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Responsável</span>
                                    <span className="text-sm font-bold text-purple-300 truncate block mt-1">{viewingReport.technicalResponsible || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Content based on type */}
                            {viewingReport.type === 'distribution' ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <LayoutGrid className="w-5 h-5 text-purple-400" />
                                            Distribuição de Circuitos
                                        </h3>
                                        {onEditDistribution && (
                                            <button
                                                onClick={() => {
                                                    setViewingReport(null);
                                                    onEditDistribution(viewingReport as DistributionProject);
                                                }}
                                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                            >
                                                <Edit2 className="w-3 h-3" /> Editar Projeto
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(viewingReport as DistributionProject).ports.map((port, idx) => {
                                            // Calculate metrics for this port
                                            let pWatts = 0;
                                            let pVA = 0;
                                            port.items.forEach(i => {
                                                const w = i.equipment.watts * i.quantity;
                                                pWatts += w;
                                                pVA += w / (i.equipment.powerFactor || 1);
                                            });
                                            const pAmps = pVA / (viewingReport as any).voltageSystem;

                                            return (
                                                <div key={port.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                                    <div className="flex justify-between items-start mb-3 border-b border-slate-700/50 pb-2">
                                                        <div>
                                                            <span className="text-xs font-bold text-slate-500 uppercase">Circuito {idx + 1}</span>
                                                            <h4 className="font-bold text-white">{port.name}</h4>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`block text-lg font-bold ${pAmps > port.breakerAmps ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                {pAmps.toFixed(1)} A
                                                            </span>
                                                            <span className="text-xs text-slate-500">{port.breakerAmps}A Disjuntor</span>
                                                        </div>
                                                    </div>

                                                    {/* Cable Specs */}
                                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <Cable className="w-3 h-3 text-slate-500 shrink-0" />
                                                            <span className="text-slate-500 text-[10px]">Cabo:</span>
                                                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-xs ${getCableColorClass(getCableSpecs(pAmps).color)}`}>
                                                                {getCableSpecs(pAmps).gauge}mm²
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <Plug className="w-3 h-3 text-slate-500 shrink-0" />
                                                            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${getCableColorClass(getCableSpecs(pAmps).color)}`} title={getCableSpecs(pAmps).connectorType}>
                                                                {getCableSpecs(pAmps).connectorAmps}A
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        {port.items.map((item, iIdx) => (
                                                            <div key={iIdx} className="flex justify-between text-sm">
                                                                <span className="text-slate-300">
                                                                    <span className="text-blue-400 font-bold">{item.quantity}x</span> {item.equipment.name}
                                                                </span>
                                                                <span className="text-slate-500">{(item.equipment.watts * item.quantity).toFixed(0)} W</span>
                                                            </div>
                                                        ))}
                                                        {port.items.length === 0 && (
                                                            <p className="text-slate-600 text-sm italic text-center py-2">Vazio</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-yellow-400" />
                                        Equipamentos
                                    </h3>
                                    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-900/50 text-slate-400">
                                                <tr>
                                                    <th className="p-3 font-medium">Equipamento</th>
                                                    <th className="p-3 font-medium text-center">Qtd</th>
                                                    <th className="p-3 font-medium text-right">Potência</th>
                                                    <th className="p-3 font-medium text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {('items' in viewingReport) && (viewingReport as any).items.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                                        <td className="p-3 text-white">{item.equipment.name}</td>
                                                        <td className="p-3 text-center text-blue-400 font-bold">{item.quantity}</td>
                                                        <td className="p-3 text-right text-slate-400">{item.equipment.watts} W</td>
                                                        <td className="p-3 text-right text-white font-medium">{(item.equipment.watts * item.quantity).toFixed(0)} W</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                            <button
                                onClick={() => setViewingReport(null)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => handleDownloadPDF(viewingReport)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" /> Baixar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
