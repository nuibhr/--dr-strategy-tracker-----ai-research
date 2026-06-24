# DR Strategy Tracker - Project TODO

## Phase 1: Planning and Database Schema
- [ ] Define Database Schema (`dr_picks`, `dr_price_snapshots`, `dr_pick_events`)
- [ ] Propose file structure and modifications
- [ ] Propose API endpoints
- [ ] Propose web page structure

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
- [ ] Add seed/sample data for testing (AAPL80, NVDA80, TSLA80, META80, GOOG80)

## Phase 4: Backend Services
- [x] Create `server/services/marketDataService.ts` (with mock API fallback)
- [x] Create `server/services/brokerApiService.ts` (with mock API fallback)
- [x] Implement auto calculation logic in backend

## Phase 5: API Endpoints (tRPC Routers)
- [x] Create tRPC router for `drPicks.list`
- [x] Create tRPC router for `drPicks.getById`
- [x] Create tRPC router for `drPicks.create`
- [x] Create tRPC router for `drPicks.update`
- [x] Create tRPC router for `drPicks.delete`
- [x] Create tRPC router for `drPicks.getAlerts`
- [x] Create tRPC router for `drPicks.refreshPrices`
- [x] Create tRPC router for `drPicks.getPerformance`

## Phase 6: Frontend UI
- [ ] Design and implement Dashboard page
- [ ] Design and implement DR / Stock Infographic Cards
- [ ] Design and implement Alert Center
- [ ] Design and implement Admin Page
- [ ] Design and implement Detail Page for each DR
- [ ] Ensure mobile-first and responsive design

## Phase 7: Testing and Deployment
- [ ] Test all API endpoints
- [ ] Test UI functionality
- [ ] Test auto calculations
- [ ] Test Market/Broker API integration (mock and real)
- [ ] Prepare for deployment
