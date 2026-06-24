# DR Strategy Tracker - Project TODO

## Phase 1: Database Schema Update
- [x] Add `dailyPicks` table (id, ticker, drName, entryPrice, sl, tp, news, outlook, createdAt, archivedAt)
- [x] Add `priceHistory` table for tracking price changes (positionId, price, timestamp)
- [x] Add archive fields to positions table

## Phase 2: Daily DR Picks UI
- [x] Create "Daily DR Picks" page (replaces Portfolio as main page)
- [x] Display today's recommended stocks
- [x] "Add to Portfolio" button for each stock
- [ ] Show pick history (last 7 days)

## Phase 3: Scheduled Tasks (Heartbeat)
- [x] Set up 09:00 task - Generate AI daily picks
- [x] Set up 10:50 task - Check prices & send alerts
- [x] Set up 14:30 task - Check prices & send alerts
- [x] Set up daily archive task - Archive picks older than 7 days

## Phase 4: Automated Price Checks & Alerts
- [x] Create scheduled price check procedure
- [ ] Integrate ALGO_EQ API for batch price fetching
- [ ] Implement automatic TP/SL detection
- [ ] Send Telegram alerts when TP/SL hit

## Phase 5: History & Archival
- [x] Implement 7-day history retention
- [x] Create archive cleanup procedure
- [ ] Add history view UI

## Phase 6: Testing & Deployment
- [ ] Test scheduled tasks (09:00, 10:50, 14:30)
- [ ] Test Telegram alert delivery
- [ ] Test price persistence
- [ ] Deploy to production (pending user action)

## Completed Features
- [x] Core infrastructure (web-db-user)
- [x] Portfolio management
- [x] Position tracking with P&L
- [x] Google Sheets integration
- [x] Telegram bot setup
- [x] Real-time price refresh (manual)
- [x] Alert system (manual)

## Known Issues
- Server console error: "Cannot find package 'dotenv'" - needs investigation

## Remaining Implementation Gaps (Post-Deploy)
- [ ] Wire "Add to Portfolio" button to create portfolio entries
- [ ] Implement AI analysis in 09:00 scheduled handler
- [ ] Implement price fetching in 10:50 & 14:30 handlers
- [ ] Implement Telegram alert dispatch in price check handlers
- [ ] Implement archival logic in 23:00 handler
- [ ] Add history view UI page
- [ ] Test end-to-end scheduled tasks
- [ ] Test Telegram alert delivery
- [ ] Test price persistence and P&L calculation
