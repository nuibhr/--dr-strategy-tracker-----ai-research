const CORE_DR_UNIVERSE = [
  // Current high-liquidity DR80 names
  "AAPL80", "NVDA80", "TSLA80", "META80", "GOOG80", "AMZN80", "MSFT80",
  "AMD80", "NFLX80", "BABA80", "JD80", "CRM80", "AVGO80", "MA80",
  "COIN80", "CRWD80", "BIDU80",

  // US mega-cap / AI / software / semiconductor candidates
  "ADBE80", "AMAT80", "ASML80", "ASTS03", "BA80", "BRK80", "COST80",
  "DIS80", "GE80", "INTC80", "JPM80", "LLY80", "MCD80", "MU80",
  "ORCL80", "PANW80", "PLTR80", "QCOM80", "SHOP80", "SMCI80", "SNOW80",
  "SOFI80", "TMO80", "UBER80", "UNH80", "V80", "WMT80",

  // China / Hong Kong equity DR candidates
  "9988HK80", "0700HK80", "3690HK80", "1810HK80", "9618HK80", "1024HK80",
  "1211HK80", "2318HK80", "1299HK80", "2269HK80", "2331HK80", "9999HK80",
  "BILI80", "FUTU80", "LI80", "NIO80", "PDD80", "TME80", "XPEV80",
  "YUMC80",

  // Japan / Asia equity DR candidates
  "7203JP80", "6758JP80", "6861JP80", "8035JP80", "9984JP80", "6098JP80",
  "4519JP80", "6501JP80", "8316JP80", "9432JP80", "005930KS80",
  "000660KS80", "035420KS80", "005380KS80", "2330TW80", "2317TW80",

  // ETF / index exposure candidates often requested by users
  "QQQ80", "SPY80", "DIA80", "IWM80", "XLK80", "XLF80", "XLE80",
  "SMH80", "SOXX80", "ARKK80", "BOTZ80", "CIBR80", "HACK80", "ICLN80",
  "KWEB80", "MCHI80", "FXI80", "ASHR80", "CQQQ80", "EWT80", "EWJ80",
  "EWY80", "EWH80", "INDA80", "VNM80",
];

const BROAD_BASE_TICKERS = [
  "AAPL", "ABBV", "ABNB", "ADBE", "AMD", "AMGN", "AMZN", "ARM", "ASML",
  "ASTS", "AVGO", "AXP", "BA", "BABA", "BAC", "BIDU", "BILI", "BKNG",
  "BRK", "CAT", "C", "CMCSA", "COIN", "COST", "CRM", "CRWD", "CVX",
  "DE", "DIS", "F", "FUTU", "GE", "GILD", "GM", "GOOG", "GS", "HD",
  "IBM", "INTC", "ISRG", "JD", "JNJ", "JPM", "KO", "LI", "LLY", "MA",
  "MCD", "MELI", "META", "MRK", "MRVL", "MS", "MSFT", "MU", "NFLX",
  "NIO", "NKE", "NOW", "NVDA", "ORCL", "PANW", "PDD", "PEP", "PFE",
  "PLTR", "PYPL", "QCOM", "SBUX", "SHOP", "SMCI", "SNOW", "SOFI",
  "T", "TEAM", "TME", "TMO", "TSLA", "TSM", "UBER", "UNH", "V",
  "WFC", "WMT", "XPEV", "YUMC",
  "ARKK", "ASHR", "BOTZ", "CIBR", "CQQQ", "DIA", "EWH", "EWJ", "EWY",
  "EWT", "FXI", "HACK", "ICLN", "INDA", "IWM", "KWEB", "MCHI", "QQQ",
  "SMH", "SOXX", "SPY", "VNM", "XLE", "XLF", "XLK",
];

const COMMON_DR_SUFFIXES = ["80", "03", "01"];

const GENERATED_DR_CANDIDATES = BROAD_BASE_TICKERS.flatMap(ticker =>
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
    : [...CORE_DR_UNIVERSE, ...GENERATED_DR_CANDIDATES];
  return Array.from(new Set([...source, ...extra])).sort();
}

export const DR80_UNIVERSE = getDRUniverse();
