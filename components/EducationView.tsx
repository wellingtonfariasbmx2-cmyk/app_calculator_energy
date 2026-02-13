import React, { useState } from 'react';
import { BookOpen, Zap, Calculator, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Lightbulb, Droplets, Wind, Battery } from 'lucide-react';

export function EducationView() {
    const [expandedSection, setExpandedSection] = useState<string | null>('intro');
    const [calculatorValues, setCalculatorValues] = useState({
        voltage: 220,
        power: 1000,
        powerFactor: 0.92,
        systemType: 'single' as 'single' | 'three-phase'
    });

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    // Cálculo em tempo real
    const calculatedCurrent = calculatorValues.systemType === 'single'
        ? calculatorValues.power / (calculatorValues.voltage * calculatorValues.powerFactor)
        : calculatorValues.power / (Math.sqrt(3) * calculatorValues.voltage * calculatorValues.powerFactor);

    const recommendedBreaker = Math.ceil(calculatedCurrent * 1.25 / 10) * 10;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header Amigável */}
            <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-8 text-white shadow-2xl">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Lightbulb className="w-10 h-10 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Eletricidade Descomplicada! ⚡</h1>
                        <p className="text-blue-100 mt-1">Aprenda de forma simples como funciona a energia elétrica</p>
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <p className="leading-relaxed">
                        💡 <strong>Não sabe nada de elétrica?</strong> Tudo bem! Vamos te explicar do ZERO usando comparações do dia a dia.
                        Você vai entender como o app calcula tudo de forma segura e profissional!
                    </p>
                </div>
            </div>

            {/* Seção 0: Analogia da Água */}
            <EducationCard
                title="💧 Eletricidade é como Água em Canos!"
                icon={Droplets}
                isExpanded={expandedSection === 'intro'}
                onToggle={() => toggleSection('intro')}
                highlight
            >
                <div className="space-y-5">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-5">
                        <p className="text-slate-200 leading-relaxed mb-4">
                            <strong className="text-blue-400">Imagine a eletricidade como água fluindo em canos.</strong> Essa comparação vai te ajudar a entender tudo facilmente:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Voltagem */}
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-blue-400/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wind className="w-6 h-6 text-blue-400" />
                                    <h4 className="font-bold text-blue-400">Voltagem (V)</h4>
                                </div>
                                <div className="text-2xl font-bold text-white mb-2">= Pressão da Água</div>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Quanto mais pressão, mais <strong>força</strong> a água (energia) tem para circular nos canos (fios).
                                </p>
                                <div className="mt-3 text-xs bg-slate-900/50 rounded p-2 text-slate-400">
                                    💡 110V = pressão baixa | 220V = pressão alta
                                </div>
                            </div>

                            {/* Corrente */}
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-400/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <Droplets className="w-6 h-6 text-emerald-400" />
                                    <h4 className="font-bold text-emerald-400">Corrente (A)</h4>
                                </div>
                                <div className="text-2xl font-bold text-white mb-2">= Vazão da Água</div>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Quanto mais água (eletricidade) passa pelo cano por segundo, maior a <strong>corrente</strong>.
                                </p>
                                <div className="mt-3 text-xs bg-slate-900/50 rounded p-2 text-slate-400">
                                    💡 Medida em Amperes (A) - tipo "litros por segundo"
                                </div>
                            </div>

                            {/* Potência */}
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-400/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <Battery className="w-6 h-6 text-yellow-400" />
                                    <h4 className="font-bold text-yellow-400">Potência (W)</h4>
                                </div>
                                <div className="text-2xl font-bold text-white mb-2">= Força Total</div>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    É a <strong>capacidade de fazer trabalho</strong>. Mais Watts = equipamento mais forte (consome mais).
                                </p>
                                <div className="mt-3 text-xs bg-slate-900/50 rounded p-2 text-slate-400">
                                    💡 Watts = Volts × Amperes (Pressão × Vazão)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exemplo Visual */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-5 border border-slate-600">
                        <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-400" />
                            Exemplo do Dia a Dia
                        </h4>
                        <div className="space-y-3 text-sm text-slate-300">
                            <p className="leading-relaxed">
                                🚿 <strong>Chuveiro elétrico 5500W em 220V:</strong>
                            </p>
                            <div className="bg-slate-900/50 rounded p-3 border border-slate-600">
                                <div className="font-mono text-emerald-400">Corrente = 5500W ÷ 220V = 25 Amperes</div>
                            </div>
                            <p className="leading-relaxed">
                                Isso significa que <strong>muita água (eletricidade)</strong> está passando pelos fios ao mesmo tempo!
                                Por isso o chuveiro precisa de um <strong>fio grosso</strong> (como um cano largo) e um <strong>disjuntor de 30A ou 40A</strong> para aguentar.
                            </p>
                        </div>
                    </div>
                </div>
            </EducationCard>

            {/* Seção 1: O Básico */}
            <EducationCard
                title="⚡ Os 3 Conceitos Essenciais"
                icon={Zap}
                isExpanded={expandedSection === 'fundamentals'}
                onToggle={() => toggleSection('fundamentals')}
            >
                <div className="space-y-5">
                    {/* Voltagem Simplificada */}
                    <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
                        <h4 className="text-lg font-semibold text-blue-400 mb-3">1️⃣ Voltagem (V) - A "Força" da Energia</h4>
                        <p className="text-slate-300 leading-relaxed mb-4">
                            No Brasil, existem basicamente duas <strong>"pressões"</strong> de energia nas tomadas:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
                                <div className="text-2xl font-bold text-blue-400 mb-1">110V</div>
                                <div className="text-sm text-slate-400">Voltagem mais baixa, mais comum em cidades antigas</div>
                            </div>
                            <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
                                <div className="text-2xl font-bold text-blue-400 mb-1">220V</div>
                                <div className="text-sm text-slate-400">Voltagem mais alta, padrão nacional atual</div>
                            </div>
                        </div>
                        <div className="mt-4 bg-slate-900/50 rounded p-3 text-sm text-slate-400">
                            💡 <strong>Dica:</strong> É como a diferença entre uma torneira com pouca pressão (110V) e uma com muita pressão (220V).
                        </div>
                    </div>

                    {/* Corrente Simplificada */}
                    <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
                        <h4 className="text-lg font-semibold text-emerald-400 mb-3">2️⃣ Corrente (A) - Quanto "Flui"</h4>
                        <p className="text-slate-300 leading-relaxed mb-4">
                            A <strong>corrente</strong> (medida em Amperes - A) indica <strong>quanta eletricidade está passando</strong> pelo fio.
                        </p>
                        <div className="bg-gradient-to-r from-emerald-900/20 to-emerald-800/20 rounded-lg p-4 border border-emerald-500/30">
                            <div className="text-center mb-3">
                                <div className="text-4xl font-bold text-emerald-400 mb-2">Quanto maior a corrente...</div>
                                <div className="text-xl text-white">...mais grosso precisa ser o FIO!</div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-sm">
                                <div className="bg-slate-900/50 rounded p-2 text-center">
                                    <div className="font-bold text-emerald-400">até 21A</div>
                                    <div className="text-slate-400">Fio 2,5mm²</div>
                                    <div className="text-xs text-slate-500 mt-1">Tomadas gerais</div>
                                </div>
                                <div className="bg-slate-900/50 rounded p-2 text-center">
                                    <div className="font-bold text-emerald-400">até 28A</div>
                                    <div className="text-slate-400">Fio 4mm²</div>
                                    <div className="text-xs text-slate-500 mt-1">Equipamentos médios</div>
                                </div>
                                <div className="bg-slate-900/50 rounded p-2 text-center">
                                    <div className="font-bold text-emerald-400">até 50A</div>
                                    <div className="text-slate-400">Fio 10mm²</div>
                                    <div className="text-xs text-slate-500 mt-1">Chuveiro/Ar-cond</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 bg-yellow-900/20 rounded p-3 text-sm text-yellow-200 border border-yellow-500/30">
                            ⚠️ <strong>Importante:</strong> Se o fio for muito fino para a corrente, ele ESQUENTA e pode causar INCÊNDIO!
                        </div>
                    </div>

                    {/* Potência Simplificada */}
                    <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
                        <h4 className="text-lg font-semibold text-yellow-400 mb-3">3️⃣ Potência (W) - O "Tamanho" do Equipamento</h4>
                        <p className="text-slate-300 leading-relaxed mb-4">
                            A <strong>potência</strong> (medida em Watts - W) diz <strong>quanto de energia o equipamento consome</strong>.
                        </p>
                        <div className="space-y-3">
                            <div className="bg-slate-900/50 rounded p-3 flex items-center justify-between">
                                <span className="text-slate-300">💡 Lâmpada LED</span>
                                <span className="font-bold text-yellow-400">10W - 20W</span>
                            </div>
                            <div className="bg-slate-900/50 rounded p-3 flex items-center justify-between">
                                <span className="text-slate-300">🎸 Caixa de Som</span>
                                <span className="font-bold text-yellow-400">300W - 500W</span>
                            </div>
                            <div className="bg-slate-900/50 rounded p-3 flex items-center justify-between">
                                <span className="text-slate-300">🔦 Moving Head</span>
                                <span className="font-bold text-yellow-400">200W - 400W</span>
                            </div>
                            <div className="bg-slate-900/50 rounded p-3 flex items-center justify-between">
                                <span className="text-slate-300">🚿 Chuveiro Elétrico</span>
                                <span className="font-bold text-yellow-400">5500W - 7500W</span>
                            </div>
                        </div>
                    </div>

                    {/* Fórmula Simples */}
                    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-lg p-5 border border-purple-500/30">
                        <h4 className="text-lg font-bold text-white mb-3">🧮 A Fórmula MÁGICA que calcula tudo:</h4>
                        <div className="bg-slate-900/50 rounded-lg p-5 text-center border border-purple-500/30">
                            <div className="text-3xl font-bold text-emerald-400 mb-3">
                                Corrente (A) = Potência (W) ÷ Voltagem (V)
                            </div>
                            <div className="text-lg text-slate-300">ou simplificando...</div>
                            <div className="text-2xl font-bold text-white mt-2">
                                A = W ÷ V
                            </div>
                        </div>
                        <div className="mt-4 bg-slate-900/30 rounded p-4">
                            <div className="font-bold text-white mb-2">📝 Exemplo Prático:</div>
                            <div className="text-slate-300 text-sm space-y-2">
                                <div>Tenho um Moving Head de <strong className="text-yellow-400">300W</strong> que vou ligar em <strong className="text-blue-400">220V</strong>.</div>
                                <div className="bg-slate-800/50 rounded p-2 font-mono">
                                    Corrente = 300 ÷ 220 = <strong className="text-emerald-400">1,36 Amperes</strong>
                                </div>
                                <div className="text-slate-400">✅ Essa luz vai "puxar" apenas 1,36A da tomada. Tranquilo!</div>
                            </div>
                        </div>
                    </div>
                </div>
            </EducationCard>

            {/* Seção 2: Como o App Calcula (Simplificado) */}
            <EducationCard
                title="🤖 Como o App Faz os Cálculos Automaticamente"
                icon={Calculator}
                isExpanded={expandedSection === 'app-calculations'}
                onToggle={() => toggleSection('app-calculations')}
            >
                <div className="space-y-5">
                    <p className="text-slate-200 leading-relaxed text-lg">
                        O LightLoad Pro faz todo o <strong className="text-blue-400">trabalho pesado</strong> pra você! Veja o que acontece nos bastidores:
                    </p>

                    <div className="space-y-4">
                        <SimpleStepCard number={1} emoji="📝" title="Você cadastra os equipamentos">
                            Você informa: "<em>Tenho 10 Moving Heads de 300W cada um</em>"
                        </SimpleStepCard>

                        <SimpleStepCard number={2} emoji="🧮" title="O app calcula a corrente de cada um">
                            Para cada Moving Head de 300W em 220V:
                            <div className="mt-2 bg-slate-900/50 rounded p-3 border border-emerald-500/30">
                                <div className="font-mono text-emerald-400 text-center">300W ÷ 220V = 1,36A</div>
                            </div>
                        </SimpleStepCard>

                        <SimpleStepCard number={3} emoji="➕" title="Soma tudo que está no mesmo disjuntor">
                            Se você colocou os 10 Moving Heads no mesmo circuito:
                            <div className="mt-2 bg-slate-900/50 rounded p-3 border border-emerald-500/30">
                                <div className="font-mono text-emerald-400 text-center">1,36A × 10 = 13,6A no total</div>
                            </div>
                        </SimpleStepCard>

                        <SimpleStepCard number={4} emoji="🛡️" title="Adiciona margem de segurança (+25%)">
                            Seguindo a norma NBR 5410, o app adiciona 25% a mais por segurança:
                            <div className="mt-2 bg-slate-900/50 rounded p-3 border border-yellow-500/30">
                                <div className="font-mono text-yellow-400 text-center">13,6A × 1,25 = 17A necessários</div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">
                                ⚡ Essa margem evita que o disjuntor fique trabalhando no limite e desligue sozinho!
                            </div>
                        </SimpleStepCard>

                        <SimpleStepCard number={5} emoji="✅" title="Recomenda o disjuntor ideal">
                            O app sugere: <strong className="text-blue-400">"Use um disjuntor de 20A"</strong>
                            <div className="mt-2 text-sm text-slate-400">
                                (Arredonda para o valor comercial mais próximo: 10A, 16A, 20A, 25A, 32A, etc)
                            </div>
                        </SimpleStepCard>

                        <SimpleStepCard number={6} emoji="🚨" title="Alerta se tiver perigo!">
                            Se você tentar colocar equipamentos demais em um disjuntor pequeno, o app mostra um <strong className="text-red-400">ALERTA VERMELHO</strong>:
                            <div className="mt-2 bg-red-900/20 rounded p-3 border border-red-500/50 text-red-300 text-sm">
                                ⚠️ SOBRECARGA! Você está tentando passar 30A em um disjuntor de 20A. PERIGO!
                            </div>
                        </SimpleStepCard>
                    </div>
                </div>
            </EducationCard>

            {/* Seção 3: Disjuntores Explicados */}
            <EducationCard
                title="🔌 O que é um Disjuntor? (Protetor da sua instalação)"
                icon={AlertTriangle}
                isExpanded={expandedSection === 'breakers'}
                onToggle={() => toggleSection('breakers')}
            >
                <div className="space-y-5">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
                        <p className="text-slate-200 leading-relaxed text-lg mb-4">
                            O <strong className="text-blue-400">disjuntor</strong> é tipo um <strong>"guarda de segurança"</strong> da energia elétrica.
                            Quando passa MUITA corrente (Amperes), ele <strong>desliga automaticamente</strong> para proteger os fios de esquentarem e pegarem fogo!
                        </p>

                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                            <div className="font-bold text-white mb-2 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                Como funciona:
                            </div>
                            <div className="space-y-2 text-sm text-slate-300">
                                <div className="flex items-start gap-2">
                                    <span className="text-emerald-400">✓</span>
                                    <span>Se a corrente está <strong>abaixo do limite</strong> (ex: 15A em um disjuntor de 20A) → Tudo OK!</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-red-400">✗</span>
                                    <span>Se a corrente <strong>ultrapassa o limite</strong> (ex: 25A em um disjuntor de 20A) → <strong className="text-red-400">CLACK!</strong> Desliga!</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-5 border border-slate-600">
                        <h4 className="font-bold text-white mb-3">📏 Tamanhos Comuns de Disjuntores:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[10, 16, 20, 25, 32, 40, 50, 63].map(amp => (
                                <div key={amp} className="bg-slate-900/50 rounded p-3 text-center border border-slate-700">
                                    <div className="text-2xl font-bold text-blue-400">{amp}A</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {amp <= 16 ? 'Luzes' : amp <= 25 ? 'Tomadas' : amp <= 40 ? 'Ar/Chuveiro' : 'Industrial'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </EducationCard>

            {/* Calculadora Interativa Simplificada */}
            <EducationCard
                title="🧪 Teste Você Mesmo! (Calculadora Interativa)"
                icon={Calculator}
                isExpanded={expandedSection === 'calculator'}
                onToggle={() => toggleSection('calculator')}
                highlight
            >
                <div className="space-y-5">
                    <p className="text-slate-200 leading-relaxed text-lg">
                        Agora é sua vez! Mexe nos valores abaixo e veja a <strong className="text-blue-400">mágica</strong> acontecer:
                    </p>

                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">⚡ Potência do Equipamento (Watts)</label>
                                <input
                                    type="number"
                                    value={calculatorValues.power}
                                    onChange={(e) => setCalculatorValues({ ...calculatorValues, power: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min="0"
                                />
                                <div className="text-xs text-slate-400 mt-1">Exemplo: Moving Head = 300W</div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">🔌 Voltagem da Tomada</label>
                                <select
                                    value={calculatorValues.voltage}
                                    onChange={(e) => setCalculatorValues({ ...calculatorValues, voltage: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value={110}>110V (Bivolt Baixo)</option>
                                    <option value={220}>220V (Padrão Brasil)</option>
                                    <option value={380}>380V (Trifásico Industrial)</option>
                                </select>
                            </div>
                        </div>

                        {/* Resultados Grandes e Claros */}
                        <div className="bg-gradient-to-br from-blue-600/20 to-violet-600/20 rounded-xl p-6 border border-blue-500/30 mt-6">
                            <h4 className="text-xl font-bold text-white mb-5 text-center">📊 Resultado do Cálculo:</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="bg-slate-900/50 rounded-xl p-6 border border-emerald-500/40 text-center">
                                    <div className="text-sm text-slate-400 mb-2">💧 Corrente que vai circular:</div>
                                    <div className="text-5xl font-bold text-emerald-400 mb-2">
                                        {calculatedCurrent.toFixed(1)} A
                                    </div>
                                    <div className="text-xs text-slate-500 mt-3 bg-slate-800/50 rounded p-2">
                                        {calculatorValues.power}W ÷ {calculatorValues.voltage}V = {calculatedCurrent.toFixed(1)}A
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 rounded-xl p-6 border border-blue-500/40 text-center">
                                    <div className="text-sm text-slate-400 mb-2">🛡️ Disjuntor recomendado:</div>
                                    <div className="text-5xl font-bold text-blue-400 mb-2">
                                        {recommendedBreaker} A
                                    </div>
                                    <div className="text-xs text-slate-500 mt-3">
                                        <div className="bg-slate-800/50 rounded p-2 mb-1">
                                            Corrente + 25% de segurança
                                        </div>
                                        <div className="text-yellow-400">
                                            ✓ Protegido conforme NBR 5410
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </EducationCard>

            {/* Exemplos Práticos Simplificados */}
            <EducationCard
                title="💡 Exemplos Reais de Eventos"
                icon={Lightbulb}
                isExpanded={expandedSection === 'examples'}
                onToggle={() => toggleSection('examples')}
            >
                <div className="space-y-4">
                    <p className="text-slate-200 leading-relaxed">
                        Veja como o cálculo funciona em <strong className="text-blue-400">eventos reais</strong>:
                    </p>

                    <ExampleCardSimple
                        title="🎉 Evento Pequeno - Festa de 15 Anos"
                        equipment={[
                            { name: '8 Moving Heads (200W cada)', watts: 1600 },
                            { name: '4 Refletores LED (100W cada)', watts: 400 },
                            { name: '1 Mesa de Som', watts: 300 },
                        ]}
                        totalWatts={2300}
                        voltage={220}
                        current={10.43}
                        breaker={20}
                    />

                    <ExampleCardSimple
                        title="🎸 Evento Médio - Show de Banda"
                        equipment={[
                            { name: '20 Moving Heads (300W cada)', watts: 6000 },
                            { name: '12 Refletores (200W cada)', watts: 2400 },
                            { name: '8 Blinders (650W cada)', watts: 5200 },
                            { name: '2 Consoles de Luz', watts: 1000 },
                        ]}
                        totalWatts={14600}
                        voltage={220}
                        current={66.4}
                        breaker={100}
                    />

                    <ExampleCardSimple
                        title="🎪 Evento Grande - Festival"
                        equipment={[
                            { name: '50 Moving Heads (400W cada)', watts: 20000 },
                            { name: '30 Refletores (300W cada)', watts: 9000 },
                            { name: '16 Strobos (1000W cada)', watts: 16000 },
                            { name: 'Sistema de Som completo', watts: 8000 },
                        ]}
                        totalWatts={53000}
                        voltage={380}
                        current={91.5}
                        breaker={120}
                        isThreePhase
                    />
                </div>
            </EducationCard>

            {/* Normas (Simplificado) */}
            <EducationCard
                title="📋 Por que Confiar no App?"
                icon={CheckCircle}
                isExpanded={expandedSection === 'standards'}
                onToggle={() => toggleSection('standards')}
            >
                <div className="space-y-4">
                    <p className="text-slate-200 leading-relaxed text-lg">
                        O LightLoad Pro segue as <strong className="text-blue-400">normas oficiais brasileiras</strong>. Isso garante que seus cálculos são <strong>seguros e profissionais</strong>!
                    </p>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-7 h-7 text-blue-400 flex-shrink-0" />
                            <div>
                                <h4 className="font-bold text-blue-400 mb-2 text-lg">NBR 5410 - A Norma Brasileira de Segurança</h4>
                                <p className="text-slate-300 leading-relaxed mb-3">
                                    É a "lei" que diz como fazer instalações elétricas seguras no Brasil. O app segue ela à risca!
                                </p>
                                <div className="bg-slate-900/50 rounded p-3 text-sm text-slate-400">
                                    ✓ Margem de segurança de 25% nos disjuntores<br />
                                    ✓ Dimensionamento correto de fios<br />
                                    ✓ Balanceamento de fases em sistemas trifásicos
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-7 h-7 text-yellow-400 flex-shrink-0" />
                            <div>
                                <h4 className="font-bold text-yellow-400 mb-2 text-lg">NR-10 - Segurança no Trabalho</h4>
                                <p className="text-slate-300 leading-relaxed">
                                    Norma do Ministério do Trabalho que protege quem trabalha com eletricidade. <strong className="text-yellow-400">Sempre contrate profissionais qualificados!</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </EducationCard>

            {/* Footer com Aviso Importante */}
            <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 rounded-xl p-6 border border-orange-500/30">
                <div className="flex items-start gap-4">
                    <AlertTriangle className="w-10 h-10 text-orange-400 flex-shrink-0" />
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">⚠️ Aviso Importante de Segurança</h3>
                        <p className="text-slate-200 leading-relaxed">
                            Este app é uma <strong>ferramenta de planejamento</strong> profissional. Mesmo que você tenha entendido tudo aqui,
                            <strong className="text-orange-400"> NUNCA faça instalações elétricas sem um eletricista qualificado</strong>!
                            Energia elétrica é perigosa e pode causar choques fatais e incêndios.
                        </p>
                        <div className="mt-3 bg-slate-900/50 rounded p-3 text-sm text-slate-300">
                            💡 Use o app para planejar, calcular e entender. Mas deixe a instalação com os profissionais certificados!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Componente Card Reutilizável
interface EducationCardProps {
    title: string;
    icon: React.ElementType;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    highlight?: boolean;
}

function EducationCard({ title, icon: Icon, isExpanded, onToggle, children, highlight }: EducationCardProps) {
    return (
        <div className={`rounded-xl border transition-all ${highlight
            ? 'bg-gradient-to-br from-blue-600/10 to-violet-600/10 border-blue-500/30 shadow-lg shadow-blue-500/10'
            : 'bg-surface border-slate-700'
            }`}>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-800/50 transition-colors rounded-xl"
            >
                <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>
            {isExpanded && (
                <div className="px-5 pb-5 pt-2 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
}

// Componente Step
function StepCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {number}
            </div>
            <div className="flex-1">
                <h5 className="font-semibold text-white mb-1">{title}</h5>
                <div className="text-sm text-slate-400 leading-relaxed">{children}</div>
            </div>
        </div>
    );
}

// Componente Example
interface ExampleCardProps {
    title: string;
    equipment: { name: string; watts: number }[];
    voltage: number;
    powerFactor: number;
    totalWatts: number;
    isThreePhase?: boolean;
}

function ExampleCard({ title, equipment, voltage, powerFactor, totalWatts, isThreePhase }: ExampleCardProps) {
    const calculatedCurrent = isThreePhase
        ? totalWatts / (Math.sqrt(3) * voltage * powerFactor)
        : totalWatts / (voltage * powerFactor);
    const recommendedBreaker = Math.ceil(calculatedCurrent * 1.25 / 10) * 10;

    return (
        <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="font-bold text-white mb-3">{title}</h4>
            <div className="space-y-2 mb-4">
                {equipment.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-400">{item.name}</span>
                        <span className="text-slate-300 font-mono">{item.watts}W</span>
                    </div>
                ))}
                <div className="border-t border-slate-700 pt-2 flex justify-between font-semibold">
                    <span className="text-white">Total:</span>
                    <span className="text-emerald-400 font-mono">{totalWatts}W</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-900/50 rounded p-3">
                    <div className="text-slate-500 text-xs">Sistema</div>
                    <div className="text-white font-semibold">{isThreePhase ? 'Trifásico' : 'Monofásico'} {voltage}V</div>
                </div>
                <div className="bg-slate-900/50 rounded p-3">
                    <div className="text-slate-500 text-xs">Fator de Potência</div>
                    <div className="text-white font-semibold">{powerFactor}</div>
                </div>
                <div className="bg-emerald-900/20 rounded p-3 border border-emerald-500/30">
                    <div className="text-emerald-400 text-xs">Corrente Total</div>
                    <div className="text-emerald-400 font-bold">{calculatedCurrent.toFixed(2)} A</div>
                </div>
                <div className="bg-blue-900/20 rounded p-3 border border-blue-500/30">
                    <div className="text-blue-400 text-xs">Disjuntor</div>
                    <div className="text-blue-400 font-bold">{recommendedBreaker} A</div>
                </div>
            </div>
        </div>
    );
}

// Componente SimpleStepCard
function SimpleStepCard({ number, emoji, title, children }: { number: number; emoji: string; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {number}
                </div>
                <div className="flex-1">
                    <h5 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <span>{emoji}</span>
                        <span>{title}</span>
                    </h5>
                    <div className="text-sm text-slate-300 leading-relaxed">{children}</div>
                </div>
            </div>
        </div>
    );
}

// Componente ExampleCardSimple
interface ExampleCardSimpleProps {
    title: string;
    equipment: { name: string; watts: number }[];
    totalWatts: number;
    voltage: number;
    current: number;
    breaker: number;
    isThreePhase?: boolean;
}

function ExampleCardSimple({ title, equipment, totalWatts, voltage, current, breaker, isThreePhase }: ExampleCardSimpleProps) {
    return (
        <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="font-bold text-white mb-3 text-lg">{title}</h4>
            <div className="space-y-2 mb-4">
                {equipment.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-400">{item.name}</span>
                        <span className="text-slate-300 font-mono">{item.watts}W</span>
                    </div>
                ))}
                <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between font-semibold">
                    <span className="text-white">Total:</span>
                    <span className="text-emerald-400 font-mono text-lg">{totalWatts}W</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 rounded p-3 text-center">
                    <div className="text-slate-500 text-xs mb-1">Sistema</div>
                    <div className="text-white font-semibold">{isThreePhase ? `Trifásico ${voltage}V` : `${voltage}V`}</div>
                </div>
                <div className="bg-emerald-900/20 rounded p-3 border border-emerald-500/30 text-center">
                    <div className="text-emerald-400 text-xs mb-1">Corrente</div>
                    <div className="text-emerald-400 font-bold text-xl">{current.toFixed(1)} A</div>
                </div>
                <div className="col-span-2 bg-blue-900/20 rounded p-3 border border-blue-500/30 text-center">
                    <div className="text-blue-400 text-xs mb-1">✅ Disjuntor Recomendado</div>
                    <div className="text-blue-400 font-bold text-2xl">{breaker} A</div>
                </div>
            </div>
        </div>
    );
}
