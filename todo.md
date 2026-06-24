# DR Strategy Tracker - Project TODO

## Phase 1: Planning and Database Schema
- [x] Define Database Schema (`dr_picks`, `dr_price_snapshots`, `dr_pick_events`)
- [x] Propose file structure and modifications
- [x] Propose API endpoints
- [x] Propose web page structure

## Phase 2: Environment Variables
- [x] Request `BROKER_APP_ID` via `webdev_request_secrets`
- [x] Request `BROKER_API_SECRET` via `webdev_request_secrets`
- [x] Request `MARKET_DATA_PROVIDER` (set to `mock`) via `webdev_request_secrets`
- [x] `BROKER_API_KEY` (intentionally empty for mock mode)
- [x] `BROKER_BASE_URL` (intentionally empty for mock mode)

## Phase 3: Database Implementation
- [x] Implement `dr_picks` table in `drizzle/schema.ts`
- [x] Implement `dr_price_snapshots` table in `drizzle/schema.ts`
- [x] Implement `dr_pick_events` table in `drizzle/schema.ts`
- [x] Generate Drizzle migrations
- [x] Apply Drizzle migrations via `webdev_execute_sql`
- [x] Add seed/sample data for testing (AAPL80, NVDA80, TSLA80, META80, GOOG80)

## Phase 4: Backend Services
- [x] Create `server/services/marketDataService.ts` (with mock API fallback)
- [x] Create `server/services/brokerApiService.ts` (with mock API fallback)
- [x] Implement auto calculation logic in backend
- [x] Fix Near SL calculation bug in `calculationService.ts`

## Phase 5: API Endpoints (tRPC Routers)
- [x] Create tRPC router for `drPicks.list`
- [x] Create tRPC router for `drPicks.getById` (with proper TRPCError for NOT_FOUND)
- [x] Create tRPC router for `drPicks.create`
- [x] Create tRPC router for `drPicks.update` (with proper TRPCError for NOT_FOUND and status validation)
- [x] Create tRPC router for `drPicks.delete` (with proper TRPCError for NOT_FOUND)
- [x] Create tRPC router for `drPicks.getAlerts`
- [x] Create tRPC router for `drPicks.refreshPrices`
- [x] Create tRPC router for `drPicks.getPerformance`

## Phase 6: Frontend UI
- [x] Design and implement Dashboard page (dark theme, sidebar, stats cards, DR pick cards, market summary, alert center, all picks table)
- [x] Design and implement DR / Stock Infographic Cards (symbol, name, entry price, current price, TP1, TP2, SL, progress bar, return %)
- [x] Design and implement Alert Center (Hit TP, Near TP, Near SL alerts)
- [x] Design and implement Admin Page (CRUD for DR picks)
- [x] Design and implement Detail Page for each DR
- [x] Create placeholder pages (DR Picks, Watchlist, Alerts, Performance, History, Settings)
- [x] Fix loading state (show content without requiring auth check to complete)
- [x] Fix price merging in list procedure (merge current price from snapshots)
- [x] Fix average return calculation (include all active picks)
- [x] Fix field name mismatch (averageReturn vs avgReturn)

## Phase 7: Testing and Deployment
- [x] Test all API endpoints (tRPC procedures verified via TypeScript check)
- [x] Test UI functionality (Dashboard renders with correct data, prices, returns)
- [x] Test auto calculations (calculateReturnPercent, calculateRiskRewardRatio, determineStatus)
- [x] Test Market/Broker API integration (mock mode working)
- [x] Fix test files to not require optional env vars (ALGO_EQ, Google Sheets, Telegram)
- [x] All 10 tests pass (4 test files)
- [ ] Deploy to production (user action required - click Publish in Management UI)

## Phase 8: Refresh Prices Button (Mock Data Testing)
- [x] Add Refresh Prices button on Dashboard header (next to clock)
- [x] Wire button to `drPicks.refreshPrices` tRPC mutation
- [x] Show loading spinner while refreshing
- [x] After refresh, invalidate `drPicks.list`, `drPicks.getAlerts`, `drPicks.getPerformance` queries
- [x] Show toast notification with refresh result (how many prices updated, with alert symbols)
- [x] Ensure mock data generates slightly randomized prices each refresh to test alerts
- [x] Align mock base prices to realistic current prices near TP/SL zones for alert testing (AAPL80=4.34 near TP1=4.45, NVDA80=6.55 at TP1=6.50, TSLA80=3.70 near SL=3.60, META80=5.52 near TP1=5.60, GOOG80=4.36 above entry=4.28)
