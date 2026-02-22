import { getCableSpecs } from '../utils/cableCalculations';

export const ExportService = {
    /**
     * Converts an array of objects to a CSV string and triggers a download.
     * @param data Array of objects to export
     * @param filename Name of the file (without extension)
     */
    exportToCSV: <T extends Record<string, any>>(data: T[], filename: string) => {
        if (!data || data.length === 0) {
            alert("Não há dados para exportar.");
            return;
        }

        // Get headers from first object
        const headers = Object.keys(data[0]);

        // Create CSV content
        // We add a BOM (Byte Order Mark) \uFEFF so Excel opens it with UTF-8 correctly
        const csvContent = [
            headers.join(';'), // in Brazil/Europe ; is often safer for Excel standard, but , is standard CSV. 
            // Let's use ; as it's often safer for localization, or stick to , if we quote strings.
            // I will use ; for better Excel compat in PT-BR locale usually,
            // but standard is ,. Let's stick to standard , but quote fields.
            ...data.map(row => headers.map(fieldName => {
                const val = row[fieldName];
                // Handle strings with commas or quotes
                if (typeof val === 'string') {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(';')) // Using ; separator for better Excel compatibility in many regions
        ].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    /**
     * Exports a specific Distribution Project to CSV (flattened structure)
     */
    exportDistributionProject: (project: any) => {
        // Flatten the structure: Port Name | Breaker | Item | Qty | Watts | Amps
        const rows: any[] = [];

        // Adicionar informações do sistema de energia no início
        if (project.generatorConfig?.enabled) {
            rows.push({
                Secao: 'GERADOR',
                Info: `${project.generatorConfig.powerKVA} kVA`,
                Detalhe: `${project.generatorConfig.isThreePhase ? 'Trifásico' : 'Monofásico'} - ${project.generatorConfig.voltage}V`,
                Circuito: '',
                Disjuntor: '',
                Cabo_mm2: '',
                Conector: '',
                Equipamento: '',
                Qtd: '',
                Watts_Unit: '',
                Total_Watts: '',
                Corrente: ''
            });
        }

        if (project.mainpowerConfig?.enabled) {
            const systemType = project.mainpowerConfig.systemType === 'single' ? 'Monofásico' :
                project.mainpowerConfig.systemType === 'two-phase' ? 'Bifásico' : 'Trifásico';

            rows.push({
                Secao: 'MAINPOWER',
                Info: systemType,
                Detalhe: `${project.mainpowerConfig.totalPorts} portas - ${project.mainpowerConfig.phases.length} fase(s)`,
                Circuito: '',
                Disjuntor: '',
                Cabo_mm2: '',
                Conector: '',
                Equipamento: '',
                Qtd: '',
                Watts_Unit: '',
                Total_Watts: '',
                Corrente: ''
            });

            // Adicionar informações de cada fase
            project.mainpowerConfig.phases.forEach((phase: any) => {
                rows.push({
                    Secao: `FASE ${phase.phaseId}`,
                    Info: `${phase.currentLoad.toFixed(1)}A / ${phase.maxAmps.toFixed(1)}A`,
                    Detalhe: `${phase.ports.length} circuito(s)`,
                    Circuito: '',
                    Disjuntor: '',
                    Cabo_mm2: '',
                    Conector: '',
                    Equipamento: '',
                    Qtd: '',
                    Watts_Unit: '',
                    Total_Watts: '',
                    Corrente: ''
                });
            });

            // Linha em branco
            rows.push({
                Secao: '',
                Info: '',
                Detalhe: '',
                Circuito: '',
                Disjuntor: '',
                Cabo_mm2: '',
                Conector: '',
                Equipamento: '',
                Qtd: '',
                Watts_Unit: '',
                Total_Watts: '',
                Corrente: ''
            });
        }

        // Adicionar circuitos
        project.ports.forEach((port: any) => {
            // Calculate port amperage for cable specs
            let portAmps = 0;
            port.items.forEach((item: any) => {
                const totalWatts = item.quantity * item.equipment.watts;
                portAmps += totalWatts / (project.voltageSystem * (item.equipment.powerFactor || 1));
            });

            const cableSpecs = getCableSpecs(portAmps);

            if (port.items.length === 0) {
                rows.push({
                    Secao: 'CIRCUITO',
                    Info: '',
                    Detalhe: '',
                    Circuito: port.name,
                    Disjuntor: `${port.breakerAmps}A`,
                    Cabo_mm2: `${cableSpecs.gauge}mm²`,
                    Conector: cableSpecs.connectorType,
                    Equipamento: '(Vazio)',
                    Qtd: 0,
                    Watts_Unit: 0,
                    Total_Watts: 0,
                    Corrente: 0
                });
            } else {
                port.items.forEach((item: any, index: number) => {
                    const totalWatts = item.quantity * item.equipment.watts;
                    // Estimate amps (simplified)
                    const amps = totalWatts / (project.voltageSystem * (item.equipment.powerFactor || 1));

                    rows.push({
                        Secao: 'CIRCUITO',
                        Info: '',
                        Detalhe: '',
                        Circuito: port.name,
                        Disjuntor: `${port.breakerAmps}A`,
                        Cabo_mm2: index === 0 ? `${cableSpecs.gauge}mm²` : '', // Only show on first item
                        Conector: index === 0 ? cableSpecs.connectorType : '', // Only show on first item
                        Equipamento: item.equipment.name,
                        Qtd: item.quantity,
                        Watts_Unit: item.equipment.watts,
                        Total_Watts: totalWatts,
                        Corrente: amps.toFixed(2).replace('.', ',') // PT-BR format
                    });
                });
            }
        });

        ExportService.exportToCSV(rows, `Projeto_${project.name.replace(/\s+/g, '_')}`);
    },

    exportCalculation: (items: any[], voltage: number, filename: string) => {
        const rows = items.map((item: any) => ({
            Equipamento: item.equipment.name,
            Quantidade: item.quantity,
            Watts_Unit: item.equipment.watts,
            Total_Watts: item.quantity * item.equipment.watts,
            Voltagem: `${item.equipment.voltage}V`
        }));
        ExportService.exportToCSV(rows, filename);
    },

    /**
     * Gera um PDF profissional com relatório completo do evento
     */
    exportEventPDF: async (event: any) => {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = 15;

        const formatDatePT = (dateStr: string) => {
            if (!dateStr) return '—';
            // Garantir que pegamos apenas a parte da data YYYY-MM-DD
            const datePart = dateStr.split('T')[0].split(' ')[0];
            const d = new Date(datePart + 'T12:00:00');
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        };

        const statusLabels: Record<string, string> = {
            planned: 'Planejado', in_progress: 'Em Andamento',
            completed: 'Concluído', cancelled: 'Cancelado'
        };

        // ===== HEADER =====
        doc.setFillColor(88, 28, 135); // purple-900
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATÓRIO DO EVENTO', margin, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, 28);
        doc.text('LightLoad PRO', pageWidth - margin, 28, { align: 'right' });
        y = 45;

        // ===== EVENT NAME & STATUS =====
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(event.name || 'Sem nome', margin, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Status: ${statusLabels[event.status] || event.status}`, margin, y);
        y += 10;

        // ===== EVENT INFO =====
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(88, 28, 135);
        doc.text('INFORMAÇÕES DO EVENTO', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'normal');

        const infoFields = [
            { label: 'Cliente', value: event.clientName },
            { label: 'Local', value: event.venue },
            { label: 'Endereço', value: event.address },
            { label: 'Data Início', value: formatDatePT(event.startDate) },
            { label: 'Data Término', value: formatDatePT(event.endDate) },
            { label: 'Horário Montagem', value: event.setupTime },
            { label: 'Horário Evento', value: event.eventTime },
            { label: 'Responsável Técnico', value: event.technicalResponsible },
            { label: 'Observações', value: event.notes },
        ];

        infoFields.forEach(field => {
            if (field.value) {
                doc.setFont('helvetica', 'bold');
                doc.text(`${field.label}:`, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.text(String(field.value), margin + 45, y);
                y += 6;
            }
        });
        y += 5;

        // ===== EQUIPMENT TABLE =====
        const allocations = event.equipmentAllocations || [];
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(88, 28, 135);
        doc.text(`EQUIPAMENTOS ALOCADOS (${allocations.length})`, margin, y);
        y += 8;

        if (allocations.length > 0) {
            // Table Header
            const colWidths = [90, 30, 30, 30];
            const headers = ['Equipamento', 'Marca/Modelo', 'Qtd', 'Status'];
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            let xPos = margin;
            headers.forEach((h, i) => {
                doc.text(h, xPos + 2, y);
                xPos += colWidths[i];
            });
            y += 7;

            // Table Rows
            let totalItems = 0;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(40, 40, 40);

            allocations.forEach((alloc: any) => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }

                const eq = alloc.equipment;
                totalItems += alloc.quantityAllocated;

                xPos = margin;
                const rowData = [
                    eq?.name || '—',
                    eq ? `${eq.brand || ''} ${eq.model || ''}`.trim() || '—' : '—',
                    `${alloc.quantityAllocated}`,
                    alloc.status === 'allocated' ? 'Alocado' : 'Devolvido'
                ];

                // Alternating row bg
                doc.setDrawColor(230, 230, 230);
                doc.line(margin, y + 2, pageWidth - margin, y + 2);

                rowData.forEach((val, i) => {
                    doc.text(val, xPos + 2, y);
                    xPos += colWidths[i];
                });

                if (eq?.category === 'Painel de LED') {
                    y += 3.5;
                    const panelsPerCase = Number(eq.panelsPerCase) || Number(eq.panels_per_case) || 6;
                    const cases = Math.ceil(alloc.quantityAllocated / panelsPerCase);
                    doc.setFontSize(7);
                    doc.setTextColor(150, 80, 0); // Orange-ish
                    doc.setFont('helvetica', 'bold');
                    doc.text(`> LOGÍSTICA LED: ${alloc.quantityAllocated} placas em ${cases} case(s) de transporte`, margin + 2, y);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(40, 40, 40);
                    doc.setFontSize(9);
                    y += 3.5;
                } else {
                    y += 7;
                }
            });

            // Totals
            y += 3;
            doc.setFillColor(88, 28, 135);
            doc.rect(margin, y - 4, pageWidth - margin * 2, 10, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('TOTAL:', margin + 2, y + 1);
            doc.text(`${totalItems} unidade(s)`, margin + 92, y + 1);

        } else {
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text('Nenhum equipamento alocado neste evento.', margin, y);
        }

        // ===== FOOTER =====
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, 285, pageWidth - margin, 285);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`LightLoad PRO • Relatório do Evento`, margin, 291);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 291, { align: 'right' });
        }

        // Save
        doc.save(`Evento_${(event.name || 'relatorio').replace(/\s+/g, '_')}.pdf`);
    }
};
