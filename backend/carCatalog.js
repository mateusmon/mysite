const DEFAULT_MONTHLY_KM = 1200;
const DEFAULT_FUEL_PRICE = 5.79;
const REFERENCE_YEARS = [2021, 2022, 2023, 2024, 2025];
const TARGET_CATALOG_SIZE = 1000;

const segmentProfiles = {
  hatch: {
    uso_indicado: ["urbano"],
    perfil_indicado: ["solteiro", "familia"],
    manutencao_base: 180,
    seguro_fator: 0.0025,
    revisoes: [
      { item: "Revisão 10.000 km", custo: 480 },
      { item: "Revisão 20.000 km", custo: 720 },
      { item: "Revisão 40.000 km", custo: 1120 }
    ],
    pecas: [
      { item: "Pastilha de freio", custo: 280 },
      { item: "Pneu", custo: 480 },
      { item: "Bateria", custo: 520 }
    ],
    problemas: ["Desgaste de embreagem em uso severo", "Ruído interno em piso irregular"]
  },
  sedan: {
    uso_indicado: ["urbano", "estrada"],
    perfil_indicado: ["solteiro", "familia"],
    manutencao_base: 240,
    seguro_fator: 0.0027,
    revisoes: [
      { item: "Revisão 10.000 km", custo: 620 },
      { item: "Revisão 20.000 km", custo: 910 },
      { item: "Revisão 40.000 km", custo: 1380 }
    ],
    pecas: [
      { item: "Jogo de velas", custo: 340 },
      { item: "Pneu", custo: 620 },
      { item: "Disco de freio", custo: 520 }
    ],
    problemas: ["Custo de seguro acima da média", "Sensor de estacionamento com falhas pontuais"]
  },
  suv: {
    uso_indicado: ["urbano", "estrada"],
    perfil_indicado: ["familia", "solteiro"],
    manutencao_base: 310,
    seguro_fator: 0.003,
    revisoes: [
      { item: "Revisão 10.000 km", custo: 760 },
      { item: "Revisão 20.000 km", custo: 1120 },
      { item: "Revisão 40.000 km", custo: 1720 }
    ],
    pecas: [
      { item: "Pneu", custo: 820 },
      { item: "Pastilha de freio", custo: 430 },
      { item: "Amortecedor", custo: 650 }
    ],
    problemas: ["Consumo mais alto no trânsito intenso", "Desgaste de buchas em ruas irregulares"]
  },
  pickup: {
    uso_indicado: ["estrada", "urbano"],
    perfil_indicado: ["familia", "solteiro"],
    manutencao_base: 330,
    seguro_fator: 0.0032,
    revisoes: [
      { item: "Revisão 10.000 km", custo: 810 },
      { item: "Revisão 20.000 km", custo: 1210 },
      { item: "Revisão 40.000 km", custo: 1890 }
    ],
    pecas: [
      { item: "Pneu", custo: 930 },
      { item: "Pastilha de freio", custo: 470 },
      { item: "Kit suspensão", custo: 740 }
    ],
    problemas: ["Custo elevado de pneus", "Consumo urbano elevado"]
  },
  eletrico: {
    uso_indicado: ["urbano", "estrada"],
    perfil_indicado: ["solteiro", "familia"],
    manutencao_base: 150,
    seguro_fator: 0.0031,
    revisoes: [
      { item: "Inspeção elétrica 10.000 km", custo: 420 },
      { item: "Inspeção bateria 20.000 km", custo: 680 },
      { item: "Sistema de freio regenerativo 40.000 km", custo: 980 }
    ],
    pecas: [
      { item: "Pneu de baixa resistência", custo: 860 },
      { item: "Filtro de cabine", custo: 160 },
      { item: "Bateria auxiliar", custo: 620 }
    ],
    problemas: ["Autonomia reduzida em clima extremo", "Rede de recarga limitada em algumas regiões"]
  }
};

const popularBaseModels = [
  { modelo: "Fiat Strada", segmento: "pickup", preco_base: 124000, consumo_base: 11.8, potencia_base: 107, confiabilidade: 4, popularidade: 99 },
  { modelo: "Volkswagen Polo", segmento: "hatch", preco_base: 108000, consumo_base: 13.7, potencia_base: 116, confiabilidade: 4, popularidade: 98 },
  { modelo: "Chevrolet Onix", segmento: "hatch", preco_base: 106000, consumo_base: 13.6, potencia_base: 116, confiabilidade: 4, popularidade: 97 },
  { modelo: "Hyundai HB20", segmento: "hatch", preco_base: 101000, consumo_base: 13.4, potencia_base: 120, confiabilidade: 4, popularidade: 96 },
  { modelo: "Fiat Argo", segmento: "hatch", preco_base: 95000, consumo_base: 13.3, potencia_base: 107, confiabilidade: 4, popularidade: 94 },
  { modelo: "Volkswagen T-Cross", segmento: "suv", preco_base: 156000, consumo_base: 11.5, potencia_base: 128, confiabilidade: 4, popularidade: 93 },
  { modelo: "Chevrolet Tracker", segmento: "suv", preco_base: 149000, consumo_base: 11.8, potencia_base: 133, confiabilidade: 4, popularidade: 92 },
  { modelo: "Fiat Mobi", segmento: "hatch", preco_base: 78000, consumo_base: 14.2, potencia_base: 74, confiabilidade: 4, popularidade: 91 },
  { modelo: "Jeep Compass", segmento: "suv", preco_base: 189000, consumo_base: 9.8, potencia_base: 185, confiabilidade: 4, popularidade: 90 },
  { modelo: "Nissan Kicks", segmento: "suv", preco_base: 146000, consumo_base: 11.6, potencia_base: 113, confiabilidade: 4, popularidade: 89 },
  { modelo: "Toyota Corolla", segmento: "sedan", preco_base: 163000, consumo_base: 12.2, potencia_base: 177, confiabilidade: 5, popularidade: 88 },
  { modelo: "Renault Kwid", segmento: "hatch", preco_base: 79000, consumo_base: 14.4, potencia_base: 71, confiabilidade: 3, popularidade: 87 },
  { modelo: "Fiat Toro", segmento: "pickup", preco_base: 176000, consumo_base: 10.8, potencia_base: 176, confiabilidade: 4, popularidade: 86 },
  { modelo: "Volkswagen Nivus", segmento: "suv", preco_base: 146000, consumo_base: 12.1, potencia_base: 128, confiabilidade: 4, popularidade: 85 },
  { modelo: "Jeep Renegade", segmento: "suv", preco_base: 154000, consumo_base: 10.7, potencia_base: 176, confiabilidade: 4, popularidade: 84 },
  { modelo: "Toyota Hilux", segmento: "pickup", preco_base: 262000, consumo_base: 9.5, potencia_base: 204, confiabilidade: 5, popularidade: 83 },
  { modelo: "Renault Duster", segmento: "suv", preco_base: 141000, consumo_base: 11.2, potencia_base: 162, confiabilidade: 4, popularidade: 82 },
  { modelo: "Honda HR-V", segmento: "suv", preco_base: 167000, consumo_base: 11.1, potencia_base: 177, confiabilidade: 5, popularidade: 81 },
  { modelo: "Toyota Corolla Cross", segmento: "suv", preco_base: 196000, consumo_base: 11.9, potencia_base: 177, confiabilidade: 5, popularidade: 80 },
  { modelo: "Chevrolet Onix Plus", segmento: "sedan", preco_base: 118000, consumo_base: 13.5, potencia_base: 116, confiabilidade: 4, popularidade: 79 },
  { modelo: "Volkswagen Saveiro", segmento: "pickup", preco_base: 118000, consumo_base: 11.4, potencia_base: 116, confiabilidade: 4, popularidade: 78 },
  { modelo: "Chevrolet S10", segmento: "pickup", preco_base: 251000, consumo_base: 9.2, potencia_base: 207, confiabilidade: 4, popularidade: 77 },
  { modelo: "Hyundai Creta", segmento: "suv", preco_base: 168000, consumo_base: 10.9, potencia_base: 167, confiabilidade: 4, popularidade: 76 },
  { modelo: "Fiat Pulse", segmento: "suv", preco_base: 132000, consumo_base: 12.4, potencia_base: 130, confiabilidade: 4, popularidade: 75 },
  { modelo: "Fiat Fastback", segmento: "suv", preco_base: 146000, consumo_base: 12.0, potencia_base: 130, confiabilidade: 4, popularidade: 74 },
  { modelo: "Volkswagen Virtus", segmento: "sedan", preco_base: 128000, consumo_base: 13.2, potencia_base: 128, confiabilidade: 4, popularidade: 73 },
  { modelo: "Nissan Versa", segmento: "sedan", preco_base: 124000, consumo_base: 13.1, potencia_base: 114, confiabilidade: 4, popularidade: 72 },
  { modelo: "Honda City", segmento: "sedan", preco_base: 134000, consumo_base: 13.0, potencia_base: 126, confiabilidade: 5, popularidade: 71 },
  { modelo: "Honda City Hatch", segmento: "hatch", preco_base: 129000, consumo_base: 13.1, potencia_base: 126, confiabilidade: 5, popularidade: 70 },
  { modelo: "Peugeot 208", segmento: "hatch", preco_base: 108000, consumo_base: 13.7, potencia_base: 130, confiabilidade: 4, popularidade: 69 },
  { modelo: "Citroen C3", segmento: "hatch", preco_base: 98000, consumo_base: 13.2, potencia_base: 120, confiabilidade: 3, popularidade: 68 },
  { modelo: "Caoa Chery Tiggo 5X", segmento: "suv", preco_base: 152000, consumo_base: 10.8, potencia_base: 150, confiabilidade: 4, popularidade: 67 },
  { modelo: "BYD Dolphin Mini", segmento: "eletrico", preco_base: 118000, consumo_base: 15.8, potencia_base: 75, confiabilidade: 4, popularidade: 66 },
  { modelo: "BYD Dolphin", segmento: "eletrico", preco_base: 156000, consumo_base: 16.4, potencia_base: 204, confiabilidade: 4, popularidade: 65 },
  { modelo: "GWM Haval H6", segmento: "suv", preco_base: 226000, consumo_base: 12.7, potencia_base: 243, confiabilidade: 4, popularidade: 64 },
  { modelo: "Ford Ranger", segmento: "pickup", preco_base: 274000, consumo_base: 9.0, potencia_base: 250, confiabilidade: 4, popularidade: 63 },
  { modelo: "Mitsubishi L200 Triton", segmento: "pickup", preco_base: 281000, consumo_base: 8.9, potencia_base: 190, confiabilidade: 4, popularidade: 62 },
  { modelo: "Ram Rampage", segmento: "pickup", preco_base: 249000, consumo_base: 9.4, potencia_base: 272, confiabilidade: 4, popularidade: 61 },
  { modelo: "Jeep Commander", segmento: "suv", preco_base: 244000, consumo_base: 9.6, potencia_base: 185, confiabilidade: 4, popularidade: 60 },
  { modelo: "Chevrolet Montana", segmento: "pickup", preco_base: 142000, consumo_base: 11.2, potencia_base: 133, confiabilidade: 4, popularidade: 59 }
];

const premiumLowPopularityModels = [
  { modelo: "Audi A3 Sedan", segmento: "sedan", preco_base: 308000, consumo_base: 11.4, potencia_base: 204, confiabilidade: 4, popularidade: 44 },
  { modelo: "Audi Q3", segmento: "suv", preco_base: 348000, consumo_base: 10.5, potencia_base: 231, confiabilidade: 4, popularidade: 42 },
  { modelo: "BMW 320i", segmento: "sedan", preco_base: 372000, consumo_base: 11.2, potencia_base: 184, confiabilidade: 4, popularidade: 41 },
  { modelo: "BMW X1", segmento: "suv", preco_base: 346000, consumo_base: 10.7, potencia_base: 204, confiabilidade: 4, popularidade: 40 },
  { modelo: "BMW X3", segmento: "suv", preco_base: 442000, consumo_base: 10.0, potencia_base: 258, confiabilidade: 4, popularidade: 38 },
  { modelo: "Mercedes C200", segmento: "sedan", preco_base: 404000, consumo_base: 10.9, potencia_base: 204, confiabilidade: 4, popularidade: 37 },
  { modelo: "Mercedes GLA 200", segmento: "suv", preco_base: 366000, consumo_base: 10.4, potencia_base: 163, confiabilidade: 4, popularidade: 36 },
  { modelo: "Volvo XC60", segmento: "suv", preco_base: 458000, consumo_base: 9.8, potencia_base: 250, confiabilidade: 5, popularidade: 35 },
  { modelo: "Volvo C40", segmento: "eletrico", preco_base: 412000, consumo_base: 14.5, potencia_base: 408, confiabilidade: 4, popularidade: 34 },
  { modelo: "Land Rover Discovery Sport", segmento: "suv", preco_base: 488000, consumo_base: 9.4, potencia_base: 249, confiabilidade: 4, popularidade: 33 },
  { modelo: "Porsche Macan", segmento: "suv", preco_base: 620000, consumo_base: 8.6, potencia_base: 265, confiabilidade: 4, popularidade: 31 },
  { modelo: "MINI Cooper S", segmento: "hatch", preco_base: 282000, consumo_base: 12.2, potencia_base: 192, confiabilidade: 4, popularidade: 30 },
  { modelo: "Subaru Forester", segmento: "suv", preco_base: 252000, consumo_base: 10.6, potencia_base: 184, confiabilidade: 4, popularidade: 29 },
  { modelo: "Lexus NX 350h", segmento: "suv", preco_base: 452000, consumo_base: 13.1, potencia_base: 244, confiabilidade: 5, popularidade: 28 },
  { modelo: "Lexus UX 250h", segmento: "suv", preco_base: 322000, consumo_base: 14.0, potencia_base: 184, confiabilidade: 5, popularidade: 27 },
  { modelo: "BYD Seal", segmento: "eletrico", preco_base: 302000, consumo_base: 16.2, potencia_base: 313, confiabilidade: 4, popularidade: 26 },
  { modelo: "Kia Sportage", segmento: "suv", preco_base: 288000, consumo_base: 10.3, potencia_base: 180, confiabilidade: 4, popularidade: 25 },
  { modelo: "Peugeot 3008", segmento: "suv", preco_base: 294000, consumo_base: 10.1, potencia_base: 165, confiabilidade: 4, popularidade: 24 }
];

const additionalBaseModels = [
  { modelo: "Volkswagen Taos", segmento: "suv", preco_base: 195000, consumo_base: 10.7, potencia_base: 150, confiabilidade: 4, popularidade: 58 },
  { modelo: "Toyota Yaris Sedan", segmento: "sedan", preco_base: 113000, consumo_base: 13.1, potencia_base: 110, confiabilidade: 5, popularidade: 57 },
  { modelo: "Hyundai Tucson", segmento: "suv", preco_base: 219000, consumo_base: 10.2, potencia_base: 177, confiabilidade: 4, popularidade: 56 },
  { modelo: "Mitsubishi Eclipse Cross", segmento: "suv", preco_base: 214000, consumo_base: 10.0, potencia_base: 165, confiabilidade: 4, popularidade: 55 },
  { modelo: "Renault Oroch", segmento: "pickup", preco_base: 138000, consumo_base: 11.0, potencia_base: 120, confiabilidade: 4, popularidade: 54 },
  { modelo: "Peugeot 2008", segmento: "suv", preco_base: 142000, consumo_base: 12.2, potencia_base: 130, confiabilidade: 4, popularidade: 53 },
  { modelo: "Citroen C4 Cactus", segmento: "suv", preco_base: 138000, consumo_base: 12.0, potencia_base: 130, confiabilidade: 3, popularidade: 52 },
  { modelo: "Fiat Cronos", segmento: "sedan", preco_base: 108000, consumo_base: 13.0, potencia_base: 107, confiabilidade: 4, popularidade: 51 },
  { modelo: "Nissan Sentra", segmento: "sedan", preco_base: 169000, consumo_base: 12.4, potencia_base: 151, confiabilidade: 4, popularidade: 50 },
  { modelo: "Toyota SW4", segmento: "suv", preco_base: 392000, consumo_base: 8.7, potencia_base: 204, confiabilidade: 5, popularidade: 49 },
  { modelo: "Ram 1500", segmento: "pickup", preco_base: 568000, consumo_base: 7.2, potencia_base: 400, confiabilidade: 4, popularidade: 48 },
  { modelo: "Audi Q5", segmento: "suv", preco_base: 436000, consumo_base: 9.7, potencia_base: 249, confiabilidade: 4, popularidade: 47 },
  { modelo: "BMW iX1", segmento: "eletrico", preco_base: 432000, consumo_base: 14.8, potencia_base: 313, confiabilidade: 4, popularidade: 46 },
  { modelo: "Mercedes GLB 200", segmento: "suv", preco_base: 384000, consumo_base: 10.1, potencia_base: 163, confiabilidade: 4, popularidade: 45 },
  { modelo: "Volvo EX30", segmento: "eletrico", preco_base: 298000, consumo_base: 16.1, potencia_base: 272, confiabilidade: 4, popularidade: 43 },
  { modelo: "Kia Niro", segmento: "eletrico", preco_base: 248000, consumo_base: 15.4, potencia_base: 204, confiabilidade: 4, popularidade: 41 },
  { modelo: "Renault Megane E-Tech", segmento: "eletrico", preco_base: 289000, consumo_base: 15.2, potencia_base: 220, confiabilidade: 4, popularidade: 39 },
  { modelo: "Chevrolet Equinox", segmento: "suv", preco_base: 248000, consumo_base: 9.4, potencia_base: 172, confiabilidade: 4, popularidade: 38 },
  { modelo: "Honda Civic", segmento: "sedan", preco_base: 245000, consumo_base: 13.4, potencia_base: 184, confiabilidade: 5, popularidade: 37 },
  { modelo: "Ford Maverick", segmento: "pickup", preco_base: 239000, consumo_base: 10.3, potencia_base: 253, confiabilidade: 4, popularidade: 36 },
  { modelo: "JAC E-JS1", segmento: "eletrico", preco_base: 129000, consumo_base: 14.9, potencia_base: 62, confiabilidade: 3, popularidade: 35 },
  { modelo: "Peugeot e-208", segmento: "eletrico", preco_base: 219000, consumo_base: 15.1, potencia_base: 136, confiabilidade: 4, popularidade: 34 }
];

const segmentVersions = {
  hatch: ["Sense", "Comfort", "Highline", "Turbo", "Sport"],
  sedan: ["Active", "Plus", "Highline", "Turbo", "Signature"],
  suv: ["Comfortline", "Highline", "Turbo", "Ultimate", "Premier"],
  pickup: ["Endurance", "Freedom", "Volcano", "Turbo Diesel", "Limited"],
  eletrico: ["Pro", "Plus", "Performance", "Long Range", "GT"]
};

const baseModels = [...popularBaseModels, ...premiumLowPopularityModels, ...additionalBaseModels];

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizePrice(value) {
  return Math.round(value / 100) * 100;
}

function buildMaintenance(base, year, price, segment) {
  const profile = segmentProfiles[segment];
  const factor = price / 120000;
  const age = 2025 - year;

  const revisoes_comuns = profile.revisoes.map((entry) => ({
    item: entry.item,
    custo_medio: Math.round(entry.custo * factor * (1 + age * 0.03))
  }));

  const pecas_mais_trocadas = profile.pecas.map((entry) => ({
    item: entry.item,
    custo_medio: Math.round(entry.custo * factor * (1 + age * 0.04))
  }));

  const problemas_conhecidos = [...profile.problemas, `Desvalorização esperada para modelo ${year}`];

  return { revisoes_comuns, pecas_mais_trocadas, problemas_conhecidos };
}

function buildModel(base, year, index) {
  const age = 2025 - year;
  const profile = segmentProfiles[base.segmento];
  const version = base.versao || "Standard";

  const ajusteIndex = (index % 7) * 280;
  const priceByYear = base.preco_base * (1 - age * 0.062);
  const preco = normalizePrice(priceByYear + ajusteIndex);

  const consumoVar = ((index % 3) - 1) * 0.1;
  const consumo_km_l = Number(Math.max(6.8, base.consumo_base - age * 0.12 + consumoVar).toFixed(1));

  const seguro_mensal = Math.round(
    preco * profile.seguro_fator + (100 - base.popularidade) * 1.5 + age * 6
  );

  const manutencao_mensal = Math.round(profile.manutencao_base + age * 9 + (index % 5) * 7);
  const potencia_cv = Math.max(70, Math.round(base.potencia_base + (year - 2021) + ((index % 4) - 1)));
  const confiabilidade = Math.min(5, Math.max(3, base.confiabilidade));

  return {
    id: `${slugify(base.modelo)}-${slugify(version)}-${year}`,
    modelo: `${base.modelo} ${version} ${year}`,
    preco,
    consumo_km_l,
    seguro_mensal,
    manutencao_mensal,
    potencia_cv,
    uso_indicado: profile.uso_indicado,
    perfil_indicado: profile.perfil_indicado,
    confiabilidade,
    manutencao: buildMaintenance(base, year, preco, base.segmento)
  };
}

function buildCatalog(targetSize = TARGET_CATALOG_SIZE) {
  const trims = ["", "Tech", "Premium", "Black", "Connect"];
  const catalogItems = [];
  const fullCycle = baseModels.length * REFERENCE_YEARS.length;
  let sequence = 0;

  while (catalogItems.length < targetSize) {
    const base = baseModels[sequence % baseModels.length];
    const year = REFERENCE_YEARS[Math.floor(sequence / baseModels.length) % REFERENCE_YEARS.length];
    const versionList = segmentVersions[base.segmento] || ["Standard"];
    const versionSlot = Math.floor(sequence / fullCycle);
    const versionBase = versionList[versionSlot % versionList.length];
    const trim = trims[Math.floor(versionSlot / versionList.length) % trims.length];
    const versionLabel = trim ? `${versionBase} ${trim}` : versionBase;

    catalogItems.push(
      buildModel(
        {
          ...base,
          versao: versionLabel
        },
        year,
        sequence
      )
    );

    sequence += 1;
  }

  return catalogItems;
}

const catalog = buildCatalog();

const carsById = new Map(catalog.map((car) => [car.id, car]));

function getMonthlyFuelCost(car, kmMensal, precoCombustivel) {
  return (kmMensal / car.consumo_km_l) * precoCombustivel;
}

function getMonthlyCost(car, kmMensal, precoCombustivel) {
  return getMonthlyFuelCost(car, kmMensal, precoCombustivel) + car.seguro_mensal + car.manutencao_mensal;
}

function getPublicCar(car) {
  return {
    id: car.id,
    modelo: car.modelo,
    preco: car.preco,
    consumo_km_l: car.consumo_km_l,
    seguro_mensal: car.seguro_mensal,
    manutencao_mensal: car.manutencao_mensal,
    potencia_cv: car.potencia_cv
  };
}

export function getCarById(id) {
  const car = carsById.get(id);
  return car ? getPublicCar(car) : null;
}

export function getCarsByIds(ids = []) {
  return ids
    .map((id) => carsById.get(id))
    .filter(Boolean)
    .map((car) => getPublicCar(car));
}

export function getCarsForList() {
  return catalog.map((car) => ({
    ...getPublicCar(car),
    gasto_mensal_estimado: Number(getMonthlyCost(car, DEFAULT_MONTHLY_KM, DEFAULT_FUEL_PRICE).toFixed(2))
  }));
}

export function compareCars(payload = {}) {
  const modelIds = Array.isArray(payload.modelIds) ? payload.modelIds : [];
  const kmMensal = toNumber(payload.kmMensal, DEFAULT_MONTHLY_KM);
  const precoCombustivel = toNumber(payload.precoCombustivel, DEFAULT_FUEL_PRICE);

  const selectedCars = catalog.filter((car) => modelIds.includes(car.id));

  const resultados = selectedCars
    .map((car) => {
      const combustivelMensal = getMonthlyFuelCost(car, kmMensal, precoCombustivel);
      const gastoMensal = getMonthlyCost(car, kmMensal, precoCombustivel);

      return {
        ...getPublicCar(car),
        combustivel_mensal: Number(combustivelMensal.toFixed(2)),
        gasto_mensal: Number(gastoMensal.toFixed(2))
      };
    })
    .sort((a, b) => a.gasto_mensal - b.gasto_mensal);

  return {
    km_mensal: kmMensal,
    preco_combustivel: precoCombustivel,
    resultados
  };
}

export function suggestCars(payload = {}) {
  const orcamento = toNumber(payload.orcamento, 120000);
  const rendaMensal = toNumber(payload.rendaMensal, 8000);
  const uso = payload.uso === "estrada" ? "estrada" : "urbano";
  const perfil = payload.perfil === "familia" ? "familia" : "solteiro";
  const prioridade = payload.prioridade === "desempenho" ? "desempenho" : "economia";

  const monthlyCosts = catalog.map((car) => getMonthlyCost(car, DEFAULT_MONTHLY_KM, DEFAULT_FUEL_PRICE));
  const minMonthlyCost = Math.min(...monthlyCosts);
  const maxMonthlyCost = Math.max(...monthlyCosts);
  const minPower = Math.min(...catalog.map((car) => car.potencia_cv));
  const maxPower = Math.max(...catalog.map((car) => car.potencia_cv));

  const suggestions = catalog
    .map((car) => {
      let score = 0;
      const motivos = [];
      const monthlyCost = getMonthlyCost(car, DEFAULT_MONTHLY_KM, DEFAULT_FUEL_PRICE);
      const comprometimentoRenda = monthlyCost / rendaMensal;

      if (car.preco <= orcamento) {
        score += 40;
        motivos.push("Dentro do orçamento");
      } else {
        const diferencaPercentual = (car.preco - orcamento) / orcamento;
        const budgetScore = Math.max(0, 40 - diferencaPercentual * 80);
        score += budgetScore;
        motivos.push("Acima do orçamento, mas ainda viável");
      }

      if (car.uso_indicado.includes(uso)) {
        score += 20;
        motivos.push("Combina com seu tipo de uso");
      }

      if (car.perfil_indicado.includes(perfil)) {
        score += 15;
        motivos.push("Alinhado ao seu perfil");
      }

      if (comprometimentoRenda <= 0.2) {
        score += 20;
        motivos.push("Compromete até 20% da renda mensal");
      } else if (comprometimentoRenda <= 0.35) {
        score += 12;
        motivos.push("Comprometimento equilibrado para sua renda");
      } else if (comprometimentoRenda <= 0.5) {
        score += 6;
        motivos.push("Compromete boa parte da renda mensal");
      } else {
        motivos.push("Comprometimento alto para a renda informada");
      }

      if (prioridade === "economia") {
        const economyScore =
          maxMonthlyCost === minMonthlyCost
            ? 25
            : ((maxMonthlyCost - monthlyCost) / (maxMonthlyCost - minMonthlyCost)) * 25;
        score += economyScore;
        motivos.push("Boa previsão de custo mensal");
      } else {
        const performanceScore =
          maxPower === minPower ? 25 : ((car.potencia_cv - minPower) / (maxPower - minPower)) * 25;
        score += performanceScore;
        motivos.push("Bom nível de desempenho");
      }

      score += car.confiabilidade * 2;

      return {
        ...getPublicCar(car),
        gasto_mensal_estimado: Number(monthlyCost.toFixed(2)),
        score: Math.round(score),
        motivos: motivos.slice(0, 3)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    perfil_busca: { orcamento, renda_mensal: rendaMensal, uso, perfil, prioridade },
    sugestoes: suggestions
  };
}

export function getMaintenanceCatalog() {
  return catalog.map((car) => ({
    id: car.id,
    modelo: car.modelo,
    custo_medio_mensal: car.manutencao_mensal
  }));
}

export function getMaintenanceByModel(modelId) {
  const car = catalog.find((item) => item.id === modelId);
  if (!car) {
    return null;
  }

  const revisoesComCusto = car.manutencao.revisoes_comuns.map((item) => item.custo_medio);
  const pecasComCusto = car.manutencao.pecas_mais_trocadas.map((item) => item.custo_medio);
  const mediaRevisoes = revisoesComCusto.reduce((acc, val) => acc + val, 0) / revisoesComCusto.length;
  const mediaPecas = pecasComCusto.reduce((acc, val) => acc + val, 0) / pecasComCusto.length;

  return {
    id: car.id,
    modelo: car.modelo,
    revisoes_comuns: car.manutencao.revisoes_comuns,
    pecas_mais_trocadas: car.manutencao.pecas_mais_trocadas,
    custo_medio_mensal: car.manutencao_mensal,
    custo_medio_revisoes: Number(mediaRevisoes.toFixed(2)),
    custo_medio_pecas: Number(mediaPecas.toFixed(2)),
    problemas_conhecidos: car.manutencao.problemas_conhecidos
  };
}

