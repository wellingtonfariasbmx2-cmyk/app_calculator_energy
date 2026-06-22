/**
 * Calcula especificações de cabo e conector baseado na corrente
 * Segue NBR 5410 para dimensionamento de condutores
 */

export interface CableSpecs {
    gauge: number; // Bitola em mm²
    connectorType: string; // Tipo de conector recomendado
    connectorAmps: number; // Amperagem do conector
    color: string; // Cor para exibição visual
}

/**
 * Retorna as especificações de cabo e conector baseado na corrente do circuito
 * @param current Corrente em Amperes
 * @returns Especificações de cabo e conector
 */
export function getCableSpecs(current: number): CableSpecs {
    // Arredonda para cima para margem de segurança
    const roundedCurrent = Math.ceil(current);

    if (roundedCurrent <= 10) {
        return {
            gauge: 1.5,
            connectorType: 'Tomada 10A',
            connectorAmps: 10,
            color: 'emerald' // Verde
        };
    } else if (roundedCurrent <= 16) {
        return {
            gauge: 2.5,
            connectorType: 'Tomada 16A',
            connectorAmps: 16,
            color: 'blue' // Azul
        };
    } else if (roundedCurrent <= 21) {
        return {
            gauge: 2.5,
            connectorType: 'Tomada 20A/Powercon',
            connectorAmps: 20,
            color: 'cyan' // Ciano
        };
    } else if (roundedCurrent <= 28) {
        return {
            gauge: 4,
            connectorType: 'Powercon 32A',
            connectorAmps: 32,
            color: 'yellow' // Amarelo
        };
    } else if (roundedCurrent <= 36) {
        return {
            gauge: 6,
            connectorType: 'Powercon 32A',
            connectorAmps: 32,
            color: 'orange' // Laranja
        };
    } else if (roundedCurrent <= 50) {
        return {
            gauge: 10,
            connectorType: 'Powercon 63A',
            connectorAmps: 63,
            color: 'red' // Vermelho
        };
    } else if (roundedCurrent <= 68) {
        return {
            gauge: 16,
            connectorType: 'Industrial 63A',
            connectorAmps: 63,
            color: 'purple' // Roxo
        };
    } else if (roundedCurrent <= 89) {
        return {
            gauge: 25,
            connectorType: 'Industrial 100A',
            connectorAmps: 100,
            color: 'fuchsia' // Magenta
        };
    } else {
        return {
            gauge: 35,
            connectorType: 'Industrial 125A+',
            connectorAmps: 125,
            color: 'rose' // Rosa escuro
        };
    }
}

/**
 * Retorna classe CSS para a cor do badge baseado na cor definida
 */
export function getCableColorClass(color: string): string {
    const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-600 text-emerald-100',
        blue: 'bg-blue-600 text-blue-100',
        cyan: 'bg-cyan-600 text-cyan-100',
        yellow: 'bg-yellow-600 text-yellow-100',
        orange: 'bg-orange-600 text-orange-100',
        red: 'bg-red-600 text-red-100',
        purple: 'bg-purple-600 text-purple-100',
        fuchsia: 'bg-fuchsia-600 text-fuchsia-100',
        rose: 'bg-rose-600 text-rose-100'
    };

    return colorMap[color] || 'bg-slate-600 text-slate-100';
}
