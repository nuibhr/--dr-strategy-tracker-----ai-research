import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Bell,
  Database,
  RefreshCcw,
  Save,
  Settings,
  Shield,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "drStrategySettings";

type StrategySettings = {
  defaultTp1Percent: string;
  defaultTp2Percent: string;
  defaultSlPercent: string;
  nearAlertPercent: string;
  riskPerTradePercent: string;
  maxActivePicks: string;
  autoRefreshMinutes: string;
  autoCloseOnTp2: boolean;
  autoCloseOnSl: boolean;
  notifyNearTarget: boolean;
  notifyStatusChange: boolean;
  marketDataProvider: "settrade";
};

const defaultSettings: StrategySettings = {
  defaultTp1Percent: "5",
  defaultTp2Percent: "10",
  defaultSlPercent: "5",
  nearAlertPercent: "2",
  riskPerTradePercent: "1",
  maxActivePicks: "8",
  autoRefreshMinutes: "15",
  autoCloseOnTp2: true,
  autoCloseOnSl: true,
  notifyNearTarget: true,
  notifyStatusChange: true,
  marketDataProvider: "settrade",
};

function NumberField({
  id,
  label,
  value,
  suffix,
  onChange,
}: {
  id: keyof StrategySettings;
  label: string;
  value: string;
  suffix?: string;
  onChange: (id: keyof StrategySettings, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs text-white/50">
        {label}
      </Label>
      <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-3">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(id, event.target.value)}
          className="border-0 bg-transparent px-0 text-white shadow-none focus-visible:ring-0"
        />
        {suffix && <span className="text-xs text-white/35">{suffix}</span>}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs text-white/40">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const [settings, setSettings] = useState<StrategySettings>(defaultSettings);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    } catch {
      toast.error("อ่าน settings เดิมไม่ได้ ใช้ค่าเริ่มต้นแทน");
    }
  }, []);

  const updateNumber = (id: keyof StrategySettings, value: string) => {
    if (/^\d*\.?\d*$/.test(value)) {
      setSettings((current) => ({ ...current, [id]: value }));
    }
  };

  const saveSettings = () => {
    const required = [
      settings.defaultTp1Percent,
      settings.defaultTp2Percent,
      settings.defaultSlPercent,
      settings.nearAlertPercent,
      settings.riskPerTradePercent,
      settings.maxActivePicks,
      settings.autoRefreshMinutes,
    ];

    if (required.some((value) => value.trim() === "" || Number(value) < 0)) {
      toast.error("กรุณากรอกค่าตัวเลขให้ครบและไม่ติดลบ");
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast.success("บันทึก settings แล้ว");
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
    toast.success("คืนค่าเริ่มต้นแล้ว");
  };

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="gap-2 text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> กลับ
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-xs text-white/40">ตั้งค่ากลยุทธ์, alert และเงื่อนไขปิดสถานะ</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <section className="rounded-lg border border-white/10 bg-[#1a1f2e] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Target className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Strategy defaults</h2>
                  <p className="text-xs text-white/40">ใช้เป็นค่าเริ่มต้นเวลาเพิ่ม DR pick ใหม่</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField id="defaultTp1Percent" label="TP1" value={settings.defaultTp1Percent} suffix="%" onChange={updateNumber} />
                <NumberField id="defaultTp2Percent" label="TP2" value={settings.defaultTp2Percent} suffix="%" onChange={updateNumber} />
                <NumberField id="defaultSlPercent" label="Stop loss" value={settings.defaultSlPercent} suffix="%" onChange={updateNumber} />
                <NumberField id="nearAlertPercent" label="Near alert threshold" value={settings.nearAlertPercent} suffix="%" onChange={updateNumber} />
                <NumberField id="riskPerTradePercent" label="Risk per trade" value={settings.riskPerTradePercent} suffix="% portfolio" onChange={updateNumber} />
                <NumberField id="maxActivePicks" label="Max active picks" value={settings.maxActivePicks} onChange={updateNumber} />
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#1a1f2e] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <Shield className="h-5 w-5 text-red-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Exit rules</h2>
                  <p className="text-xs text-white/40">กำหนดว่าควรปิดสถานะเมื่อเข้าเงื่อนไขไหน</p>
                </div>
              </div>
              <div className="space-y-3">
                <ToggleRow
                  label="Auto mark closed on TP2"
                  description="เมื่อราคาถึง TP2 ให้ถือว่าแผนทำกำไรจบแล้ว"
                  checked={settings.autoCloseOnTp2}
                  onChange={(value) => setSettings((current) => ({ ...current, autoCloseOnTp2: value }))}
                />
                <ToggleRow
                  label="Auto mark closed on SL"
                  description="เมื่อราคาถึง SL ให้ถือว่าปิดสถานะเพื่อลดความเสี่ยง"
                  checked={settings.autoCloseOnSl}
                  onChange={(value) => setSettings((current) => ({ ...current, autoCloseOnSl: value }))}
                />
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#1a1f2e] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Bell className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Notifications</h2>
                  <p className="text-xs text-white/40">ตั้งค่าการแจ้งเตือนสัญญาณสำคัญ</p>
                </div>
              </div>
              <div className="space-y-3">
                <ToggleRow
                  label="Notify near TP/SL"
                  description="แจ้งเตือนเมื่อราคาเข้าใกล้เป้าตาม threshold"
                  checked={settings.notifyNearTarget}
                  onChange={(value) => setSettings((current) => ({ ...current, notifyNearTarget: value }))}
                />
                <ToggleRow
                  label="Notify status changes"
                  description="แจ้งเมื่อสถานะเปลี่ยน เช่น Waiting เป็น Hit TP1"
                  checked={settings.notifyStatusChange}
                  onChange={(value) => setSettings((current) => ({ ...current, notifyStatusChange: value }))}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-white/10 bg-[#1a1f2e] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Database className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Market data</h2>
                  <p className="text-xs text-white/40">แหล่งราคาและรอบ refresh</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-white/50">Provider</Label>
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                    Settrade (ข้อมูลจริงเท่านั้น)
                  </div>
                  <p className="text-xs text-white/35">หากเชื่อมต่อ Settrade ไม่สำเร็จ ระบบจะแสดงว่าไม่มีข้อมูล และจะไม่สร้างราคาสำรองขึ้นเอง</p>
                </div>
                <NumberField
                  id="autoRefreshMinutes"
                  label="Auto refresh"
                  value={settings.autoRefreshMinutes}
                  suffix="min"
                  onChange={updateNumber}
                />
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#1a1f2e] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                  <Settings className="h-5 w-5 text-white/60" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Current rule summary</h2>
                  <p className="text-xs text-white/40">ภาพรวมค่าที่จะใช้กับกลยุทธ์</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-white/55">
                <p>TP1 +{settings.defaultTp1Percent}% และ TP2 +{settings.defaultTp2Percent}% จาก entry</p>
                <p>SL -{settings.defaultSlPercent}% และ near alert ที่ {settings.nearAlertPercent}%</p>
                <p>จำกัดความเสี่ยง {settings.riskPerTradePercent}% ต่อ trade</p>
                <p>ข้อมูลราคาจาก {settings.marketDataProvider} ทุก {settings.autoRefreshMinutes} นาที</p>
              </div>
              <div className="mt-5 flex gap-2">
                <Button onClick={saveSettings} className="flex-1 gap-2 bg-amber-500 text-black hover:bg-amber-400">
                  <Save className="h-4 w-4" /> Save
                </Button>
                <Button onClick={resetSettings} variant="outline" className="gap-2 border-white/10 text-white/70">
                  <RefreshCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
