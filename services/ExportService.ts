import { getCableSpecs } from '../utils/cableCalculations';
import { getLEDLogistics } from '../utils/ledPanelCalc';

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
    exportEventPDF: async (event: any, companyParams?: { name?: string, logoUrl?: string }) => {
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
        const companyName = companyParams?.name || 'StageFlow PRO';

        doc.setFillColor(88, 28, 135); // purple-900
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATÓRIO DO EVENTO', margin, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, 28);
        doc.text(companyName, pageWidth - margin, 28, { align: 'right' });
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

                rowData.forEach((val, i) => {
                    doc.text(val, xPos + 2, y);
                    xPos += colWidths[i];
                });

                if (eq?.category === 'Painel de LED') {
                    y += 4.5;

                    const panelW = eq.panelWidth || eq.panel_width || 0.5;
                    const panelH = eq.panelHeight || eq.panel_height || 1.0;
                    const qty = alloc.quantityAllocated;
                    const panelsPerCase = Number(eq.panelsPerCase) || Number(eq.panels_per_case) || 6;
                    const led = getLEDLogistics(panelW, panelH, qty, panelsPerCase);

                    // Optional subtle background to separate the LED info inside the cell
                    doc.setFillColor(255, 248, 240); // very soft orange
                    doc.rect(margin + 1, y - 3, pageWidth - margin * 2 - 2, 4.5, 'F');

                    doc.setFontSize(7);
                    doc.setTextColor(150, 80, 0); // Orange-ish
                    doc.setFont('helvetica', 'bold');
                    doc.text(`> LOGÍSTICA LED: Tamanho ${led.sizeLabel} (${qty} placas em ${led.cases} case(s))`, margin + 2, y);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(40, 40, 40);
                    doc.setFontSize(9);
                }

                // Case numbering info
                const upc = Number(eq?.unitsPerCase) || Number(eq?.units_per_case) || 0;
                if (upc > 0) {
                    y += 4.5;
                    const prefix = eq?.casePrefix || eq?.case_prefix || 'C';
                    const allocCases: number[] = alloc.allocatedCases || alloc.allocated_cases || [];
                    let caseLabels: { name: string; range: string }[] = [];

                    if (allocCases.length > 0) {
                        for (const caseNum of allocCases) {
                            const start = String((caseNum - 1) * upc + 1).padStart(2, '0');
                            const end = String(Math.min(caseNum * upc, eq?.quantityOwned || caseNum * upc)).padStart(2, '0');
                            caseLabels.push({ name: `${prefix}-${caseNum}`, range: `${start}-${end}` });
                        }
                    } else {
                        const qty = alloc.quantityAllocated;
                        const totalCases = Math.ceil(qty / upc);
                        for (let c = 0; c < totalCases; c++) {
                            const start = String(c * upc + 1).padStart(2, '0');
                            const end = String(Math.min((c + 1) * upc, qty)).padStart(2, '0');
                            caseLabels.push({ name: `${prefix}-${c + 1}`, range: `${start}-${end}` });
                        }
                    }

                    // Draw "CASES:" label
                    doc.setFontSize(6.5);
                    doc.setTextColor(130, 100, 0);
                    doc.setFont('helvetica', 'bold');
                    doc.text('CASES:', margin + 2, y);

                    // Draw individual case badges
                    let badgeX = margin + 22;
                    const badgeH = 5;
                    const badgeGap = 2;
                    const maxX = pageWidth - margin;

                    for (const label of caseLabels) {
                        const text = `${label.name} (${label.range})`;
                        const textW = doc.getTextWidth(text) + 4;

                        // Wrap to next line if needed
                        if (badgeX + textW > maxX) {
                            y += badgeH + 1.5;
                            badgeX = margin + 22;
                        }

                        // Badge background
                        doc.setFillColor(255, 243, 205); // warm amber bg
                        doc.setDrawColor(210, 170, 60);   // amber border
                        doc.roundedRect(badgeX, y - 3.5, textW, badgeH, 1.2, 1.2, 'FD');

                        // Badge text
                        doc.setFontSize(6.5);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(120, 80, 0);
                        doc.text(text, badgeX + 2, y);

                        badgeX += textW + badgeGap;
                    }

                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(40, 40, 40);
                    doc.setFontSize(9);
                    doc.setDrawColor(230, 230, 230);
                }

                // Alternating row bg / Separator line under the ENTIRE equipment row
                doc.setDrawColor(230, 230, 230);
                doc.line(margin, y + 2.5, pageWidth - margin, y + 2.5);
                y += 7;
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
            doc.text(`${companyName} • Relatório do Evento`, margin, 291);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 291, { align: 'right' });
        }

        // Save
        doc.save(`Evento_${(event.name || 'relatorio').replace(/\s+/g, '_')}.pdf`);
    },

    /**
     * Gera um PDF com a lista de eventos para uma semana ou mês
     */
    exportAgendaPDF: async (events: any[], title: string, companyParams?: { name?: string, logoUrl?: string }) => {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = 15;

        const formatDatePT = (dateStr: string) => {
            if (!dateStr) return '—';
            const datePart = dateStr.split('T')[0].split(' ')[0];
            const d = new Date(datePart + 'T12:00:00');
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        const companyName = companyParams?.name || 'StageFlow PRO';

        // ===== HEADER =====
        doc.setFillColor(88, 28, 135);
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(title.toUpperCase(), margin, 24);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, 30);
        doc.text(companyName, pageWidth - margin, 30, { align: 'right' });

        y = 45;

        if (events.length === 0) {
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(12);
            doc.text('Nenhum evento encontrado para este período.', margin, y);
        } else {
            // Sort events by date ascending
            const sortedEvents = [...events].sort((a, b) => {
                const dateA = new Date(a.startDate + 'T12:00:00').getTime();
                const dateB = new Date(b.startDate + 'T12:00:00').getTime();
                return dateA - dateB;
            });

            sortedEvents.forEach((ev: any) => {
                if (y > 260) {
                    doc.addPage();
                    y = 20;
                }

                doc.setFillColor(245, 245, 245);
                doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
                doc.setTextColor(30, 30, 30);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`${formatDatePT(ev.startDate)} - ${ev.name}`, margin + 2, y);

                y += 7;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 60);

                let details = '';
                if (ev.clientName) details += `Cliente: ${ev.clientName} | `;
                if (ev.venue) details += `Local: ${ev.venue} | `;
                if (ev.setupTime) details += `Montagem: ${ev.setupTime} | `;
                if (ev.eventTime) details += `Evento: ${ev.eventTime} | `;

                // Trim trailing " | "
                if (details.endsWith(' | ')) details = details.slice(0, -3);

                if (details) {
                    const splitDetails = doc.splitTextToSize(details, pageWidth - margin * 2 - 4);
                    doc.text(splitDetails, margin + 4, y);
                    y += splitDetails.length * 4.5;
                }

                if (ev.equipmentAllocations && ev.equipmentAllocations.length > 0) {
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(100, 100, 100);

                    doc.text('Equipamentos:', margin + 4, y);
                    y += 4.5;

                    ev.equipmentAllocations.forEach((alloc: any) => {
                        const eq = alloc.equipment;
                        const eqName = eq?.name || 'Equipamento';
                        const qty = alloc.quantityAllocated;

                        let extraInfo = '';
                        if (eq && eq.category === 'Painel de LED') {
                            const panelW = eq.panelWidth || eq.panel_width || 0.5;
                            const panelH = eq.panelHeight || eq.panel_height || 1.0;
                            const panelsPerCase = Number(eq.panelsPerCase) || Number(eq.panels_per_case) || 6;
                            const led = getLEDLogistics(panelW, panelH, qty, panelsPerCase);
                            extraInfo = ` [Logística: ${led.sizeLabel} - ${led.cases} case(s)]`;
                        }

                        // Case numbering info - draw as badges
                        const upc = Number(eq?.unitsPerCase) || Number(eq?.units_per_case) || 0;
                        if (upc > 0) {
                            const prefix = eq?.casePrefix || eq?.case_prefix || 'C';
                            const allocCases: number[] = alloc.allocatedCases || alloc.allocated_cases || [];
                            let caseBadges: { name: string; range: string }[] = [];

                            if (allocCases.length > 0) {
                                for (const caseNum of allocCases) {
                                    const s = String((caseNum - 1) * upc + 1).padStart(2, '0');
                                    const e = String(Math.min(caseNum * upc, eq?.quantityOwned || caseNum * upc)).padStart(2, '0');
                                    caseBadges.push({ name: `${prefix}-${caseNum}`, range: `${s}-${e}` });
                                }
                            } else {
                                const totalCases = Math.ceil(qty / upc);
                                for (let c = 0; c < totalCases; c++) {
                                    const s = String(c * upc + 1).padStart(2, '0');
                                    const e = String(Math.min((c + 1) * upc, qty)).padStart(2, '0');
                                    caseBadges.push({ name: `${prefix}-${c + 1}`, range: `${s}-${e}` });
                                }
                            }

                            // Remove case text from extraInfo since we draw badges
                            // Draw equipment line without cases
                        }

                        const lineText = `• ${qty}x ${eqName}${extraInfo}`;
                        const splitLine = doc.splitTextToSize(lineText, pageWidth - margin * 2 - 8);
                        doc.text(splitLine, margin + 6, y);
                        y += splitLine.length * 4.0;

                        // Draw case badges below equipment line
                        if (upc > 0) {
                            const prefix = eq?.casePrefix || eq?.case_prefix || 'C';
                            const allocCases2: number[] = alloc.allocatedCases || alloc.allocated_cases || [];
                            let caseBadges: { name: string; range: string }[] = [];

                            if (allocCases2.length > 0) {
                                for (const caseNum of allocCases2) {
                                    const s = String((caseNum - 1) * upc + 1).padStart(2, '0');
                                    const e = String(Math.min(caseNum * upc, eq?.quantityOwned || caseNum * upc)).padStart(2, '0');
                                    caseBadges.push({ name: `${prefix}-${caseNum}`, range: `${s}-${e}` });
                                }
                            } else {
                                const totalCases = Math.ceil(qty / upc);
                                for (let c = 0; c < totalCases; c++) {
                                    const s = String(c * upc + 1).padStart(2, '0');
                                    const e = String(Math.min((c + 1) * upc, qty)).padStart(2, '0');
                                    caseBadges.push({ name: `${prefix}-${c + 1}`, range: `${s}-${e}` });
                                }
                            }

                            // Label
                            doc.setFontSize(6);
                            doc.setTextColor(130, 100, 0);
                            doc.setFont('helvetica', 'bold');
                            doc.text('CASES:', margin + 8, y + 1);

                            // Badges
                            let bx = margin + 24;
                            const bh = 4.5;
                            const bgap = 1.5;
                            const mxX = pageWidth - margin;

                            for (const badge of caseBadges) {
                                const txt = `${badge.name} (${badge.range})`;
                                const tw = doc.getTextWidth(txt) + 3.5;

                                if (bx + tw > mxX) {
                                    y += bh + 1;
                                    bx = margin + 24;
                                }

                                doc.setFillColor(255, 243, 205);
                                doc.setDrawColor(210, 170, 60);
                                doc.roundedRect(bx, y - 2.5, tw, bh, 1, 1, 'FD');

                                doc.setFontSize(6);
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(120, 80, 0);
                                doc.text(txt, bx + 1.8, y + 0.8);

                                bx += tw + bgap;
                            }

                            y += bh + 1;
                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(40, 40, 40);
                            doc.setFontSize(8);
                            doc.setDrawColor(230, 230, 230);
                        }
                    });
                }

                y += 2;
            });
        }

        // ===== FOOTER =====
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, 285, pageWidth - margin, 285);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`${companyName} • ${title}`, margin, 291);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 291, { align: 'right' });
        }

        doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    },

    /**
     * Gera um PDF com o descritivo do Sistema de Energia (Gerador, Mainpower e Fases)
     */
    exportPowerSystemPDF: async (project: any, generatorPhases: any[], total120VWatts: number, TRANSFORMER_120V_MAX_WATTS: number, companyParams?: { name?: string }) => {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = 15;

        const companyName = companyParams?.name || 'StageFlow PRO';

        // ===== HEADER =====
        doc.setFillColor(88, 28, 135); // purple-900
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('SISTEMA ELÉTRICO E DISTRIBUIÇÃO', margin, 18);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, 28);
        doc.text(companyName, pageWidth - margin, 28, { align: 'right' });

        y = 45;

        // ===== PROJECT NAME =====
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`Projeto: ${project.name || 'Sem nome'}`, margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Tensão Padrão do Sistema: ${project.voltageSystem}V`, margin, y);
        y += 10;

        // Linha divisória
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // ===== GERADOR =====
        if (project.generatorConfig?.enabled) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(88, 28, 135);
            doc.text('1. GERADOR DE ENERGIA', margin, y);
            y += 8;

            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            doc.setFont('helvetica', 'normal');
            
            const gen = project.generatorConfig;
            doc.text(`Potência Requerida do Gerador: `, margin, y);
            doc.setFont('helvetica', 'bold');
            doc.text(`${gen.powerKVA} kVA`, margin + 55, y);
            y += 6;

            doc.setFont('helvetica', 'normal');
            doc.text(`Tensão de Trabalho: `, margin, y);
            doc.setFont('helvetica', 'bold');
            doc.text(`${gen.voltage}V`, margin + 35, y);
            y += 6;

            doc.setFont('helvetica', 'normal');
            doc.text(`Tipo de Fechamento: `, margin, y);
            doc.setFont('helvetica', 'bold');
            doc.text(gen.isThreePhase ? 'Trifásico (Estrela/Triângulo)' : 'Monofásico/Bifásico', margin + 35, y);
            y += 8;

            // Fases do Gerador
            if (generatorPhases && generatorPhases.length > 0) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(200, 130, 0); // Laranja avermelhado
                doc.text('Distribuição Real nas Fases do Gerador:', margin + 5, y);
                y += 6;

                // Mini-tabela de fases do gerador
                doc.setFillColor(245, 245, 245);
                doc.rect(margin + 5, y, 120, 8, 'F');
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.text('Fase', margin + 10, y + 5);
                doc.text('Consumo (A)', margin + 35, y + 5);
                doc.text('Capacidade Máx (A)', margin + 70, y + 5);
                doc.text('Carga (%)', margin + 110, y + 5);
                y += 10;

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(40, 40, 40);
                generatorPhases.forEach((phase) => {
                    doc.text(`${phase.name}`, margin + 10, y + 1);
                    doc.text(`${phase.currentLoad.toFixed(1)}A`, margin + 35, y + 1);
                    doc.text(`${phase.maxAmps.toFixed(1)}A`, margin + 70, y + 1);
                    
                    let percentColor = [60, 60, 60]; // Normal
                    if (phase.percent > 75) percentColor = [200, 130, 0]; // Warning
                    if (phase.percent > 90) percentColor = [200, 0, 0]; // Danger
                    
                    doc.setTextColor(percentColor[0], percentColor[1], percentColor[2]);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${phase.percent.toFixed(1)}%`, margin + 110, y + 1);
                    
                    doc.setTextColor(40, 40, 40);
                    doc.setFont('helvetica', 'normal');
                    
                    doc.setDrawColor(230, 230, 230);
                    doc.line(margin + 5, y + 3, margin + 125, y + 3);
                    y += 6;
                });
            }

            y += 4;
        }

        // ===== MAINPOWER =====
        if (project.mainpowerConfig?.enabled) {
            
            if (y > 240) { doc.addPage(); y = 20; }
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(88, 28, 135);
            doc.text('2. MAINPOWER (DISTRIBUIÇÃO)', margin, y);
            y += 8;

            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            const mp = project.mainpowerConfig;

            doc.setFont('helvetica', 'normal');
            doc.text(`Disjuntor Geral Tripolar: `, margin, y);
            doc.setFont('helvetica', 'bold');
            doc.text(`${mp.mainBreakerAmps}A`, margin + 42, y);
            y += 6;

            const systemType = mp.systemType === 'single' ? 'Monofásico' : mp.systemType === 'two-phase' ? 'Bifásico' : 'Trifásico';
            doc.setFont('helvetica', 'normal');
            doc.text(`Tipo de Sistema Puxado:`, margin, y);
            doc.setFont('helvetica', 'bold');
            doc.text(systemType, margin + 42, y);
            y += 6;

            doc.setFont('helvetica', 'normal');
            doc.text(`Total de Portas de Saída:`, margin, y);
            doc.setFont('helvetica', 'bold');
            doc.text(`${mp.totalPorts}`, margin + 42, y);
            y += 6;

            y += 2;

            // Warning Transformador 120V
            if (total120VWatts > TRANSFORMER_120V_MAX_WATTS) {
                if (y > 270) { doc.addPage(); y = 20; }
                y += 2;
                doc.setFillColor(255, 240, 230); // Fundo Laranja Claro
                doc.setDrawColor(255, 120, 0); // Borda Laranja
                doc.rect(margin, y, Math.min(180, pageWidth - margin*2), 16, 'FD');
                
                doc.setTextColor(200, 90, 0);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('ATENÇÃO: SOBRECARGA NO TRANSFORMADOR DE 120V (ACT-05)', margin + 4, y + 6);
                
                doc.setFont('helvetica', 'normal');
                const warningText = doc.splitTextToSize(
                    `Seu painel possui equipamentos em área 120V puxando um total estimado de ${total120VWatts}W.\nO transformador suporta no máximo ${TRANSFORMER_120V_MAX_WATTS}W. Recomenda-se uso de transformador (RT-05) externo extra.`, 
                    170
                );
                doc.text(warningText, margin + 4, y + 11);
                y += 18;
            } else {
                y += 2;
            }

            // ===== DISTRIBUIÇÃO POR FASE (CIRCUITOS) =====
            if (mp.phases && mp.phases.length > 0) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(88, 28, 135);
                doc.text('3. MAPA DE CONEXÃO POR FASE (DISTRIBUIÇÃO FÍSICA)', margin, y);
                y += 8;

                mp.phases.forEach((phase: any) => {
                    if (y > 250) { doc.addPage(); y = 20; }

                    doc.setFillColor(240, 240, 250); // Fundo azulzinho claro
                    doc.setDrawColor(200, 200, 230);
                    doc.rect(margin, y, pageWidth - margin * 2, 8, 'FD');
                    
                    doc.setTextColor(40, 40, 100);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`FASE ${phase.phaseId}`, margin + 4, y + 5);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.text(`|  Carga Atual: ${phase.currentLoad.toFixed(1)}A  /  Disjuntor de Fase: ${phase.breakerAmps}A`, margin + 25, y + 5);
                    
                    y += 12; // Aumentado o espaçamento de y += 10 para y += 12 

                    if (phase.ports && phase.ports.length > 0) {
                        // Tabela das portas ligadas
                        doc.setTextColor(80, 80, 80);
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'bold');
                        const cw = [25, 60, 25, 25, 30]; // Column Widths
                        doc.text('CIRCUITO', margin + 2, y);
                        doc.text('EQUIPAMENTOS', margin + 2 + cw[0], y);
                        doc.text('DISJUNTOR', margin + 2 + cw[0] + cw[1], y);
                        doc.text('CORRENTE (A)', margin + 2 + cw[0] + cw[1] + cw[2], y);
                        doc.text('CABO INDICADO', margin + 2 + cw[0] + cw[1] + cw[2] + cw[3], y);
                        y += 4;
                        doc.setDrawColor(200, 200, 200);
                        doc.line(margin, y, pageWidth - margin, y);
                        y += 4;

                        doc.setTextColor(50, 50, 50);
                        doc.setFont('helvetica', 'normal');
                        
                        phase.ports.forEach((portId: string) => {
                            const port = project.ports.find((p: any) => p.id === portId);
                            if (port) {
                                if (y > 270) { doc.addPage(); y = 20; }
                                
                                let portAmps = 0;
                                let equipLines: string[] = [];
                                
                                port.items.forEach((item: any) => {
                                    const watts = item.quantity * item.equipment.watts;
                                    portAmps += watts / (project.voltageSystem * (item.equipment.powerFactor || 1));
                                    equipLines.push(`${item.quantity}x ${item.equipment.name}`);
                                });

                                const cableSpecs = getCableSpecs(portAmps);

                                // Se não tem itens, colocar texto vazio
                                if (equipLines.length === 0) equipLines = ['(Nenhum equipamento)'];

                                // Tratar multiplas linhas de equipamentos para caber na tabela
                                const equipTextArr = doc.splitTextToSize(equipLines.join(', '), cw[1] - 5);
                                const rowHeight = equipTextArr.length * 4.5;
                                
                                // Print row data
                                doc.setFont('helvetica', 'bold');
                                doc.text(port.name || port.id.substring(0,6), margin + 2, y + 1);
                                
                                doc.setFont('helvetica', 'normal');
                                doc.text(equipTextArr, margin + 2 + cw[0], y + 1);
                                doc.text(`${port.breakerAmps}A`, margin + 2 + cw[0] + cw[1], y + 1);
                                doc.text(`${portAmps.toFixed(2)}A`, margin + 2 + cw[0] + cw[1] + cw[2], y + 1);
                                doc.text(`${cableSpecs.gauge}mm² (${cableSpecs.connectorType})`, margin + 2 + cw[0] + cw[1] + cw[2] + cw[3], y + 1);
                                
                                y += rowHeight + 2;
                                doc.setDrawColor(240, 240, 240);
                                doc.line(margin, y, pageWidth - margin, y);
                                y += 3;
                            }
                        });
                    } else {
                        doc.setFont('helvetica', 'italic');
                        doc.setTextColor(150, 150, 150);
                        doc.setFontSize(9);
                        doc.text('Nenhum circuito inserido nesta fase.', margin + 4, y);
                        y += 6;
                    }
                    y += 4;
                });
            }
        }

        // ===== FOOTER =====
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, 285, pageWidth - margin, 285);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`${companyName} • Sistema Elétrico`, margin, 291);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 291, { align: 'right' });
        }

        doc.save(`Projeto_Eletrica_${(project.name || 'sistema').replace(/\s+/g, '_')}.pdf`);
    }
};
