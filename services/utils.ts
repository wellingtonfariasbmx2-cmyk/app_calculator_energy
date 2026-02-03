export const getVoltageBucket = (v: number | string) => {
    const val = String(v).toLowerCase();
    if (val.includes('bi') || val.includes('auto') || val.includes('uni')) return 0; // Universal
    const num = parseInt(val.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return 0; // Indeterminado

    if (num >= 90 && num <= 140) return 1; // 110V/127V
    if (num >= 200 && num <= 250) return 2; // 220V/240V
    if (num >= 340 && num <= 480) return 3; // 380V/440V
    return -1; // Outro
};

export const isCompatible = (sys: number, eq: number | string) => {
    const sysBucket = getVoltageBucket(sys);
    const eqBucket = getVoltageBucket(eq);
    return eqBucket === 0 || sysBucket === eqBucket;
};
