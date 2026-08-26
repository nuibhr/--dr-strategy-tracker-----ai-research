import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import DrDetail from "./pages/DrDetail";
import AdminPage from "./pages/Admin";
import DrPicksPage from "./pages/DrPicks";
import WatchlistPage from "./pages/Watchlist";
import AlertsPage from "./pages/Alerts";
import PerformancePage from "./pages/Performance";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import DR80ScannerPage from "./pages/DR80Scanner";
import AdminUsersPage from "./pages/AdminUsers";
import ThaiDividendPortfolio from "./pages/ThaiDividendPortfolio";
import DividendDashboard from "./pages/DividendDashboard";

function Router() {
  return (
    <AppShell>
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/dr/:id"} component={DrDetail} />
      <Route path={"/dr-picks"} component={DrPicksPage} />
      <Route path={"/watchlist"} component={WatchlistPage} />
      <Route path={"/alerts"} component={AlertsPage} />
      <Route path={"/performance"} component={PerformancePage} />
      <Route path={"/history"} component={HistoryPage} />
      <Route path={"/admin/users"} component={AdminUsersPage} />
      <Route path={"/admin/new"} component={AdminPage} />
      <Route path={"/admin"} component={AdminPage} />
      <Route path={"/settings"} component={SettingsPage} />
      <Route path={"/dr80-scanner"} component={DR80ScannerPage} />
      <Route path={"/thai-dividend-portfolio"} component={ThaiDividendPortfolio} />
      <Route path={"/dividend-dashboard"} component={DividendDashboard} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
