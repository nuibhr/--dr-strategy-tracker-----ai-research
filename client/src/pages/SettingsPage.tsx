import { useLocation } from "wouter";
import { ArrowLeft, Settings, Bell, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SettingsPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={() => navigate("/")} variant="ghost" className="text-white/60 hover:text-white gap-2"><ArrowLeft className="w-4 h-4" /> กลับ</Button>
          <div><h1 className="text-xl font-bold text-white">Settings</h1><p className="text-xs text-white/40">ตั้งค่าระบบ</p></div>
        </div>

        <div className="space-y-4">
          {[
            { icon: Bell, label: "Telegram Notifications", desc: "ตั้งค่าการแจ้งเตือนผ่าน Telegram Bot", color: "text-blue-400", bg: "bg-blue-500/10" },
            { icon: Database, label: "Market Data Provider", desc: "เลือกแหล่งข้อมูลราคา (ปัจจุบัน: Mock Mode)", color: "text-green-400", bg: "bg-green-500/10" },
            { icon: Shield, label: "Broker API", desc: "เชื่อมต่อ Broker API สำหรับดึงข้อมูลราคา", color: "text-purple-400", bg: "bg-purple-500/10" },
            { icon: Settings, label: "General Settings", desc: "ตั้งค่าทั่วไปของระบบ", color: "text-white/60", bg: "bg-white/5" },
          ].map(item => (
            <div
              key={item.label}
              onClick={() => toast.info("Feature coming soon")}
              className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5 cursor-pointer hover:border-white/20 transition-all flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
