import { Port, PhaseConfig, MainpowerConfig } from '../types';

/**
 * Calcula a carga total de um circuito em amperes
 */
export const calculatePortLoad = (port: Port, voltage: number): number => {
    let totalAmps = 0;

    port.items.forEach(item => {
        const watts = item.equipment.watts * item.quantity;
        const pf = item.equipment.powerFactor || 1; // Usar PF individual ou 1 se não definido
        totalAmps += watts / (voltage * pf);
    });

    return totalAmps;
};

/**
 * Distribui circuitos entre as fases de forma balanceada
 * Algoritmo: First Fit Decreasing (FFD) - ordena por carga e aloca na fase com menor carga
 */
export const balancePhases = (
    ports: Port[],
    voltage: number,
    currentConfig: MainpowerConfig
): MainpowerConfig => {
    // Calcular carga de cada circuito
    const portsWithLoad = ports.map(port => ({
        port,
        load: calculatePortLoad(port, voltage)
    }));

    // Ordenar por carga (maior primeiro)
    portsWithLoad.sort((a, b) => b.load - a.load);

    // Inicializar fases preservando maxAmps e cores existentes
    const phases: PhaseConfig[] = currentConfig.phases.map(phase => ({
        ...phase,
        currentLoad: 0,
        ports: []
    }));

    // Alocar cada circuito na fase com menor carga atual
    portsWithLoad.forEach(({ port, load }) => {
        // Encontrar fase com menor carga
        const leastLoadedPhase = phases.reduce((min, phase) =>
            phase.currentLoad < min.currentLoad ? phase : min
        );

        // Adicionar circuito à fase
        leastLoadedPhase.ports.push(port.id);
        leastLoadedPhase.currentLoad += load;
    });

    return {
        ...currentConfig,
        phases,
        autoBalance: true
    };
};

/**
 * Atualiza as cargas das fases com base nos circuitos atuais
 */
export const updatePhaseLoads = (
    mainpowerConfig: MainpowerConfig,
    ports: Port[],
    voltage: number
): MainpowerConfig => {
    const updatedPhases = mainpowerConfig.phases.map(phase => {
        // Calcular carga total dos circuitos desta fase
        const phaseLoad = phase.ports.reduce((total, portId) => {
            const port = ports.find(p => p.id === portId);
            if (!port) return total;
            return total + calculatePortLoad(port, voltage);
        }, 0);

        return {
            ...phase,
            currentLoad: phaseLoad
        };
    });

    return {
        ...mainpowerConfig,
        phases: updatedPhases
    };
};

/**
 * Verifica se alguma fase está sobrecarregada
 */
export const checkPhaseOverload = (mainpowerConfig: MainpowerConfig): {
    hasOverload: boolean;
    overloadedPhases: string[];
} => {
    const overloadedPhases: string[] = [];

    mainpowerConfig.phases.forEach(phase => {
        if (phase.currentLoad > phase.maxAmps) {
            overloadedPhases.push(phase.phaseId);
        }
    });

    return {
        hasOverload: overloadedPhases.length > 0,
        overloadedPhases
    };
};

/**
 * Calcula a diferença percentual entre a fase mais carregada e menos carregada
 */
export const calculateBalanceQuality = (mainpowerConfig: MainpowerConfig): number => {
    const loadPercentages = mainpowerConfig.phases.map(phase =>
        (phase.currentLoad / phase.maxAmps) * 100
    );

    const max = Math.max(...loadPercentages);
    const min = Math.min(...loadPercentages);

    return max - min; // Quanto menor, melhor o balanceamento
};
