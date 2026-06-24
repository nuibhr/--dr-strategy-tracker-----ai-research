import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { DRAutoSave } from "@/components/DRAutoSave";

export default function Home() {
  const { user, loading, error, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">📊</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">DR Strategy Tracker</h1>
                <p className="text-xs text-slate-400">หนุ่มนักออม AI Research</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <>
                  <Button
                    onClick={() => navigate("/portfolio")}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    My Portfolio
                  </Button>
                  <Button
                    onClick={() => navigate("/settings")}
                    variant="outline"
                    className="text-slate-300 border-slate-600 hover:bg-slate-700"
                  >
                    Settings
                  </Button>
                  <Button
                    onClick={() => logout()}
                    variant="outline"
                    className="text-slate-300 border-slate-600 hover:bg-slate-700"
                  >
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-white">DR Strategy Tracker</h2>
            <p className="text-xl text-slate-400">
              Track your DR stock positions, monitor P&L, and sync from Google Sheets
            </p>
          </div>

          {isAuthenticated ? (
            <div className="space-y-6">
              <p className="text-lg text-slate-300">
                Welcome back, <span className="font-semibold text-amber-400">{user?.name}</span>!
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <DRAutoSave />
                <Button
                  onClick={() => navigate("/portfolio")}
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  Go to Portfolio
                </Button>
                <Button
                  onClick={() => navigate("/settings")}
                  size="lg"
                  variant="outline"
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  Configure Settings
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg text-slate-300">
                Sign in to start tracking your DR positions
              </p>
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                size="lg"
                className="bg-amber-500 hover:bg-amber-600"
              >
                Sign in with Google
              </Button>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">Portfolio Tracking</h3>
              <p className="text-slate-400">Monitor your DR stock positions and P&L in real-time</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="text-3xl mb-3">🔔</div>
              <h3 className="text-lg font-semibold text-white mb-2">Alert System</h3>
              <p className="text-slate-400">Get notified when your positions hit TP or SL</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
