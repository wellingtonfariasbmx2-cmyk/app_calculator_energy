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
    }
};
