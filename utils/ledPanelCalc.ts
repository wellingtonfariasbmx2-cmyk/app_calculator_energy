/**
 * Utilitário para cálculos de logística de painéis de LED.
 * Centraliza a lógica usada em ExportService, EventDetailView e EventsView.
 */

export type LEDDisplayMode = 'dimensions' | 'area';

export interface LEDLogisticsInfo {
    /** Resultado da largura total em metros */
    totalWidth: number;
    /** Resultado da altura total em metros */
    totalHeight: number;
    /** Área total em m² */
    totalArea: number;
    /** String formatada do tamanho em dimensões: "Xm x Ym" */
    dimensionsLabel: string;
    /** String formatada do tamanho em área: "X.Xm²" */
    areaLabel: string;
    /** Label baseada no modo selecionado */
    sizeLabel: string;
    /** Quantidade de cases necessários */
    cases: number;
    /** Painéis na horizontal */
    panelsWide: number;
    /** Painéis na vertical */
    panelsTall: number;
}

/**
 * Formata um valor de medida de forma inteligente:
 * - Se é um número inteiro (1, 2, 3), mostra sem decimal: "1m", "2m", "3m"
 * - Se tem decimal (0.5, 1.5, 2.25), mostra com precisão adequada: "0.5m", "1.5m"
 */
function formatMeasure(value: number): string {
    if (value === Math.floor(value)) {
        return `${value}m`;
    }
    const formatted = value.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}m`;
}

/**
 * Obtém o modo de exibição de LED salvo pelo usuário.
 * Default: 'dimensions' (largura x altura)
 */
export function getLEDDisplayMode(): LEDDisplayMode {
    try {
        const mode = localStorage.getItem('led_display_mode');
        if (mode === 'area' || mode === 'dimensions') return mode;
    } catch {}
    return 'dimensions';
}

/**
 * Salva o modo de exibição de LED escolhido pelo usuário.
 */
export function setLEDDisplayMode(mode: LEDDisplayMode): void {
    try {
        localStorage.setItem('led_display_mode', mode);
    } catch {}
}

/**
 * Calcula informações de logística para painéis de LED.
 *
 * @param panelWidth - Largura de um painel individual (em metros)
 * @param panelHeight - Altura de um painel individual (em metros)
 * @param quantity - Quantidade total de painéis
 * @param panelsPerCase - Quantos painéis cabem em um case (default: 6)
 * @param displayMode - Modo de exibição: 'dimensions' ou 'area' (default: carrega do localStorage)
 * @returns Informações de logística calculadas
 */
export function getLEDLogistics(
    panelWidth: number,
    panelHeight: number,
    quantity: number,
    panelsPerCase: number = 6,
    displayMode?: LEDDisplayMode
): LEDLogisticsInfo {
    const w = panelWidth || 0.5;
    const h = panelHeight || 1.0;
    const mode = displayMode || getLEDDisplayMode();

    // Encontrar o melhor layout (próximo de 16:9)
    let bestW = 1;
    let bestH = quantity;
    let bestRatioDiff = Infinity;
    const targetRatio = 16 / 9;

    for (let tryW = 1; tryW <= quantity; tryW++) {
        if (quantity % tryW === 0) {
            const tryH = quantity / tryW;
            const currentRatio = (tryW * w) / (tryH * h);
            const ratioDiff = Math.abs(currentRatio - targetRatio);
            if (ratioDiff < bestRatioDiff) {
                bestRatioDiff = ratioDiff;
                bestW = tryW;
                bestH = tryH;
            }
        }
    }

    const totalWidth = bestW * w;
    const totalHeight = bestH * h;
    const totalArea = totalWidth * totalHeight;
    const cases = Math.ceil(quantity / panelsPerCase);

    // Criar labels do tamanho
    const dimensionsLabel = `${formatMeasure(totalWidth)} x ${formatMeasure(totalHeight)}`;
    const areaFormatted = totalArea === Math.floor(totalArea)
        ? `${totalArea}m²`
        : `${totalArea.toFixed(2).replace(/\.?0+$/, '')}m²`;
    const areaLabel = areaFormatted;

    // Label baseada no modo
    const sizeLabel = mode === 'area' ? areaLabel : dimensionsLabel;

    return {
        totalWidth,
        totalHeight,
        totalArea,
        dimensionsLabel,
        areaLabel,
        sizeLabel,
        cases,
        panelsWide: bestW,
        panelsTall: bestH,
    };
}
