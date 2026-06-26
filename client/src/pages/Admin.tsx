import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowLeft, Plus, Pencil, Trash2, BarChart2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type DrStatus = "Hit TP1" | "Hit TP2" | "Hit SL" | "Near TP" | "Near SL" | "Waiting" | "Closed" | "Watchlist";

interface DrPick {
  id: number;
  symbol: string;
  name: string;
  market: string;
  entryDate: Date;
  entryPrice: string;
  tp1: string;
  tp2: string;
  sl: string;
  status: DrStatus;
  reason?: string | null;
  note?: string | null;
  isActive: number;
}

function getStatusClass(status: DrStatus) {
  switch (status) {
    case "Hit TP1": return "bg-green-500/20 text-green-400 border border-green-500/40";
    case "Hit TP2": return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
    case "Hit SL": return "bg-red-500/20 text-red-400 border border-red-500/40";
    case "Near TP": return "bg-blue-500/20 text-blue-400 border border-blue-500/40";
    case "Near SL": return "bg-orange-500/20 text-orange-400 border border-orange-500/40";
    case "Waiting": return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40";
    case "Closed": return "bg-gray-500/20 text-gray-400 border border-gray-500/40";
    case "Watchlist": return "bg-purple-500/20 text-purple-400 border border-purple-500/40";
    default: return "bg-gray-500/20 text-gray-400 border border-gray-500/40";
  }
}

const STATUS_OPTIONS: DrStatus[] = ["Waiting", "Near TP", "Near SL", "Hit TP1", "Hit TP2", "Hit SL", "Closed", "Watchlist"];

const EMPTY_FORM = {
  symbol: "", name: "", market: "US", entryDate: new Date().toISOString().split("T")[0],
  entryPrice: "", tp1: "", tp2: "", sl: "", reason: "", note: "",
};

function InputField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-white/50 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50"
      />
    </div>
  );
}

export default function AdminPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const utils = trpc.useUtils();
  const { data: picksData, isLoading } = trpc.drPicks.list.useQuery();
  const picks: DrPick[] = (picksData as DrPick[] | undefined) ?? [];

  const createMutation = trpc.drPicks.create.useMutation({
    onSuccess: () => {
      utils.drPicks.list.invalidate();
      toast.success("เพิ่ม DR Pick สำเร็จ");
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(`เกิดข้อผิดพลาด: ${e.message}`),
  });

  const updateMutation = trpc.drPicks.update.useMutation({
    onSuccess: () => {
      utils.drPicks.list.invalidate();
      toast.success("อัปเดต DR Pick สำเร็จ");
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(`เกิดข้อผิดพลาด: ${e.message}`),
  });

  const deleteMutation = trpc.drPicks.delete.useMutation({
    onSuccess: () => {
      utils.drPicks.list.invalidate();
      toast.success("ลบ DR Pick สำเร็จ");
    },
    onError: (e) => toast.error(`เกิดข้อผิดพลาด: ${e.message}`),
  });

  function handleEdit(pick: DrPick) {
    setEditId(pick.id);
    setForm({
      symbol: pick.symbol,
      name: pick.name,
      market: pick.market,
      entryDate: new Date(pick.entryDate).toISOString().split("T")[0],
      entryPrice: pick.entryPrice,
      tp1: pick.tp1,
      tp2: pick.tp2,
      sl: pick.sl,
      reason: pick.reason ?? "",
      note: pick.note ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.symbol || !form.name || !form.entryPrice || !form.tp1 || !form.tp2 || !form.sl) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    const payload = {
      symbol: form.symbol.toUpperCase(),
      name: form.name,
      market: form.market,
      entryDate: new Date(form.entryDate),
      entryPrice: form.entryPrice,
      tp1: form.tp1,
      tp2: form.tp2,
      sl: form.sl,
      reason: form.reason || undefined,
      note: form.note || undefined,
    };
    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="text-white/50 text-sm animate-pulse">กำลังโหลด...</div>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="text-center">
        <BarChart2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <p className="text-white/50 text-sm mb-6">กรุณาเข้าสู่ระบบก่อน</p>
        <Button onClick={() => window.location.href = getLoginUrl()} className="bg-green-500 hover:bg-green-600 text-white">
          เข้าสู่ระบบ
        </Button>
      </div>
    </div>
  );
  if (user?.role !== "admin") return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">🔒</div>
        <h2 className="text-white font-bold text-lg mb-2">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-white/40 text-sm mb-6">หน้านี้สำหรับ Admin เท่านั้น</p>
        <Button onClick={() => navigate("/")} variant="outline" className="border-white/20 text-white">
          กลับหน้าหลัก
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/")} variant="ghost" className="text-white/60 hover:text-white gap-2">
              <ArrowLeft className="w-4 h-4" /> กลับ
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Manage DR Picks</h1>
              <p className="text-xs text-white/40">จัดการรายการ DR picks ทั้งหมด</p>
            </div>
          </div>
          <Button
            onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); }}
            className="bg-green-500 hover:bg-green-600 text-white gap-2"
          >
            <Plus className="w-4 h-4" /> เพิ่ม DR Pick
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">{editId ? "แก้ไข DR Pick" : "เพิ่ม DR Pick ใหม่"}</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditId(null); }} className="text-white/40 hover:text-white h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <InputField label="Symbol *" value={form.symbol} onChange={v => setForm(f => ({ ...f, symbol: v }))} placeholder="เช่น AAPL80" />
              <InputField label="ชื่อ *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="เช่น Apple DR" />
              <div>
                <label className="text-xs text-white/50 block mb-1">ตลาด</label>
                <select
                  value={form.market}
                  onChange={e => setForm(f => ({ ...f, market: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
                >
                  {["US", "TH", "HK", "JP", "EU"].map(m => <option key={m} value={m} className="bg-[#1a1f2e]">{m}</option>)}
                </select>
              </div>
              <InputField label="วันที่เข้า *" value={form.entryDate} onChange={v => setForm(f => ({ ...f, entryDate: v }))} type="date" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <InputField label="ราคาเข้า *" value={form.entryPrice} onChange={v => setForm(f => ({ ...f, entryPrice: v }))} placeholder="เช่น 4.20" />
              <InputField label="TP1 *" value={form.tp1} onChange={v => setForm(f => ({ ...f, tp1: v }))} placeholder="เช่น 4.45" />
              <InputField label="TP2 *" value={form.tp2} onChange={v => setForm(f => ({ ...f, tp2: v }))} placeholder="เช่น 4.60" />
              <InputField label="SL *" value={form.sl} onChange={v => setForm(f => ({ ...f, sl: v }))} placeholder="เช่น 4.00" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-white/50 block mb-1">เหตุผลที่เลือก</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="อธิบายเหตุผลที่เลือก DR นี้..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Note</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-green-500 hover:bg-green-600 text-white gap-2"
              >
                <Save className="w-4 h-4" /> {editId ? "บันทึกการแก้ไข" : "เพิ่ม DR Pick"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }} className="border-white/20 text-white/60 hover:text-white">
                ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-[#1a1f2e] border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <p className="text-sm font-semibold text-white">รายการ DR Picks ทั้งหมด ({picks.length})</p>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-white/40 text-sm animate-pulse">กำลังโหลด...</div>
          ) : picks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-white/40 text-sm mb-3">ยังไม่มี DR picks</p>
              <Button onClick={() => setShowForm(true)} size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-2">
                <Plus className="w-3.5 h-3.5" /> เพิ่ม DR Pick แรก
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Symbol", "Name", "Market", "Entry Price", "TP1", "TP2", "SL", "Status", "Active", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-white/40 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {picks.map(pick => (
                    <tr key={pick.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">{pick.symbol.charAt(0)}</div>
                          <span className="font-semibold text-white">{pick.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">{pick.name}</td>
                      <td className="px-4 py-3 text-white/50">{pick.market}</td>
                      <td className="px-4 py-3 text-white font-medium">{pick.entryPrice}</td>
                      <td className="px-4 py-3 text-green-400">{pick.tp1}</td>
                      <td className="px-4 py-3 text-emerald-400">{pick.tp2}</td>
                      <td className="px-4 py-3 text-red-400">{pick.sl}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusClass(pick.status)}`}>{pick.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold ${pick.isActive === 1 ? "text-green-400" : "text-white/30"}`}>
                          {pick.isActive === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(pick)}
                            className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`ลบ ${pick.symbol}?`)) deleteMutation.mutate({ id: pick.id });
                            }}
                            className="h-7 w-7 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
