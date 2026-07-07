const CORE_DR_UNIVERSE = [
  // User-provided DR80 universe from KTB/SET reference list.
  "AAPL80", "ABBV80", "AMD80", "AMZN80", "ANET80", "AVGO80", "BABA80",
  "BIDU80", "BKNG80", "BOEING80", "BRKB80", "BYDCOM80", "CAMBRI80",
  "CATL80", "CNRE80", "COIN80", "CRM80", "CRWD80", "CYPC80", "ESTEE80",
  "FERRARI80", "GEELY80", "GEV80", "GOLDUS80", "GOOG80", "GRAB80",
  "HERMES80", "HOOD80", "IFLYTEK80", "JD80", "JLMAG80", "KO80",
  "KUAISH80", "LLY80", "LOREAL80", "MA80", "MAOGEP80", "MEITUAN80",
  "META80", "MICRON80", "MIDEA80", "MIXUE80", "MNSO80", "MONTAGE80",
  "MOUTAI80", "MP80", "MRVL80", "MSFT80", "NAURA80", "NEE80",
  "NETEASE80", "NFLX80", "NIKE80", "NIKKEI80", "NONGFU80", "NOVOB80",
  "NVDA80", "PANW80", "PEP80", "PETROCN80", "PINGAN80", "POPMART80",
  "RKLB80", "SANOFI80", "SANRIO80", "SBUX80", "SINGTEL80", "SNDK80",
  "SOFTBANK80", "SONY80", "SP500US80", "SPBOND80", "SPCOM80",
  "SPENGY80", "SPFIN80", "SPHLTH80", "SPTECH80", "SUNNY80", "TEL80",
  "TENCENT80", "TOYOTA80", "TRIPCOM80", "TSLA80", "UNIQLO80", "VISA80",
  "WUXIAT80", "XIAOMI80", "ZIJIN80", "ZJINNO80",

  // User-provided DR23 universe from InnovestX reference list.
  "NVDA23", "TSLA23", "MSFT23", "GOOG23", "AMZN23", "META23", "AMD23",
  "AVGO23", "MRVL23", "MICRON23", "AMAT23", "KLAC23", "SYNP23", "TER23",
  "COHR23", "LITE23", "NBIS23", "NVTS23", "ON23", "INTEL23", "LRCX23",
  "SNDK23", "SEAGATE23", "PLTR23", "SNOW23", "ANET23", "CEG23", "GEV23",
  "CCJ23", "VRT23", "COIN23", "SOFI23", "MELI23", "RKLB23", "LLY23",
  "MP23", "FCX23", "NEM23", "BRKB23", "CDNS23", "OKLO23", "ETN23",
  "MPWR23", "TSEMI23", "CRDO23", "FABRINET23", "SYM23", "IONQ23",
  "SMIC23", "HUAHONG23", "SENSE23", "GIGA23", "NAURA23", "BIREN23",
  "GDS23", "ZAI23", "AIA23", "CMBANK23", "CHMOBILE23", "HKEX23",
  "BABA23", "KUAISH23", "TME23", "TRIPCOM23", "KINGSOFT23", "BIDU23",
  "TENCENT23", "MEITUAN23", "POPMART23", "XIAOMI23", "ANTA23", "CATL23",
  "ZIJIN23", "GANFENG23", "UBTECH23", "HORIZON23", "ADVANT23", "TEL23",
  "KIOXIA23", "SOFTBANK23", "MUFG23", "NINTENDO23", "SANRIO23", "ASICS23",
  "SUSHI23", "FANUC23", "KEYENCE23", "HSHD23", "CNSEMI23", "CNROBOAI23",
  "ASEMI23",
];

const DEFAULT_DR_SUFFIXES = ["23", "80"];
const DEFAULT_GENERATED_BASE_TICKERS: string[] = [];

function parseSuffixList(value: string | undefined) {
  const suffixes = value
    ? value.split(/[\s,;|]+/).map(suffix => suffix.trim()).filter(Boolean)
    : DEFAULT_DR_SUFFIXES;
  return suffixes.filter(suffix => /^[0-9]+$/.test(suffix));
}

const COMMON_DR_SUFFIXES = parseSuffixList(process.env.DR_ALLOWED_SUFFIXES);
const INCLUDE_GENERATED_VARIANTS = process.env.DR_INCLUDE_GENERATED_VARIANTS === "true";

const GENERATED_DR_CANDIDATES = DEFAULT_GENERATED_BASE_TICKERS.flatMap(ticker =>
  COMMON_DR_SUFFIXES.map(suffix => `${ticker}${suffix}`)
);

function parseSymbolList(value: string | undefined) {
  if (!value) return [];
  return value
    .split(/[\s,;|]+/)
    .map(symbol => symbol.trim().toUpperCase())
    .filter(symbol => /^[A-Z0-9]+$/.test(symbol));
}

export function getDRUniverse() {
  const replacement = parseSymbolList(process.env.DR_UNIVERSE);
  const extra = parseSymbolList(process.env.DR_UNIVERSE_EXTRA);
  const source = replacement.length > 0
    ? replacement
    : [
        ...CORE_DR_UNIVERSE,
        ...(INCLUDE_GENERATED_VARIANTS ? GENERATED_DR_CANDIDATES : []),
      ];

  return Array.from(new Set([...source, ...extra]))
    .filter(symbol => COMMON_DR_SUFFIXES.some(suffix => symbol.endsWith(suffix)))
    .sort();
}

export const DR80_UNIVERSE = getDRUniverse();
