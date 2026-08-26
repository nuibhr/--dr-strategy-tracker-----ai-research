import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  PieChart,
  RefreshCw,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

function StatCard({ label, value, note, tone = "emerald" }: { label: string; value: string; note: string; tone?: "emerald" | "sky" | "amber" | "slate" }) {
  const colors = {
    emerald: "from-emerald-400/15 to-emerald-400/[0.02] border-emerald-400/20 text-emerald-200",
    sky: "from-sky-400/15 to-sky-400/[0.02] border-sky-400/20 text-sky-200",
    amber: "from-amber-400/15 to-amber-400/[0.02] border-amber-400/20 text-amber-200",
    slate: "from-white/[0.08] to-white/[0.02] border-white/10 text-white",
  };
  return <div className={`rounded-2xl border bg-gradient-to-br p-4 ${colors[tone]}`}><p className="text-xs text-white/55">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-white/45">{note}</p></div>;
}

export default function DividendDashboard() {
  const { data, isLoading } = trpc.brokerConnection.getStatus.useQuery();
  const connection = data?.connection;
  const isVerified = connection?.status === "verified";

  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#141b24] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200"><span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1">ยังไม่มีข้อมูลพอร์ต</span> รอ Sync พอร์ตจริงแบบ read-only</div>
            <h1 className="text-2xl font-bold tracking-tight">Dividend Portfolio Dashboard</h1>
            <p className="mt-1 text-sm text-white/55">ภาพรวมรายได้ปันผล สัดส่วนความเสี่ยง และรายการที่ต้องทบทวน</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/thai-dividend-portfolio"><Button variant="outline" className="gap-2 border-white/10 text-white/80 hover:bg-white/5"><Landmark className="h-4 w-4" /> ตั้งค่าโบรกเกอร์</Button></Link>
            <Button disabled className="gap-2 bg-emerald-500/50 text-black"><RefreshCw className="h-4 w-4" /> Sync Portfolio เร็ว ๆ นี้</Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="มูลค่าพอร์ตรวม" value="—" note="จะแสดงเมื่อ Sync สำเร็จ" />
          <StatCard label="ปันผลคาดการณ์ / ปี" value="—" note="ต้องใช้ข้อมูลพอร์ตจริง" tone="sky" />
          <StatCard label="Forward dividend yield" value="—" note="ต้องใช้ต้นทุนและเงินปันผลจริง" tone="amber" />
          <StatCard label="เงินสดรอใช้" value="—" note="ต้องใช้ข้อมูลพอร์ตจริง" tone="slate" />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-white/10 bg-[#141b24] p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><PieChart className="h-5 w-5 text-emerald-300" /><h2 className="font-bold">สัดส่วนพอร์ตเทียบเป้าหมาย</h2></div><p className="mt-1 text-xs text-white/45">ยังไม่มีข้อมูลพอร์ตจริงสำหรับคำนวณ</p></div></div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-white/55"><ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" /> เชื่อมต่อและ Sync พอร์ตแบบ read-only ก่อน จึงจะแสดงสัดส่วนจริง</div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#141b24] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-sky-300" /><h2 className="font-bold">เป้ารายได้ปันผล</h2></div>
            <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.05] p-4"><p className="text-xs text-white/50">เป้าหมายต่อปี</p><p className="mt-2 text-2xl font-bold text-white/40">—</p><p className="mt-3 text-xs text-white/50">ต้องตั้งเป้าหมายและใช้ข้อมูลพอร์ตจริงก่อนคำนวณ</p></div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><p className="text-xs text-white/45">Yield on cost</p><p className="mt-1 text-lg font-bold">—</p><p className="text-[11px] text-white/35">ต้องใช้ต้นทุนจริงจากโบรกเกอร์</p></div><div className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><p className="text-xs text-white/45">เงินปันผลสะสม YTD</p><p className="mt-1 text-lg font-bold">—</p><p className="text-[11px] text-white/35">จะปรากฏหลัง sync</p></div></div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#141b24] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-300" /><h2 className="font-bold">Action Center</h2></div><span className="text-xs text-white/45">รอข้อมูลจริง</span></div>
            <p className="text-sm text-white/50">ยังไม่มีรายการให้ทบทวนจนกว่าจะ Sync พอร์ตจริง</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#141b24] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-violet-300" /><h2 className="font-bold">Dividend Calendar</h2></div>
            <p className="text-sm text-white/50">ยังไม่มีข้อมูลวัน XD หรือประกาศปันผลจากแหล่งข้อมูลจริง</p>
          </section>
        </div>

        <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#141b24] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className={`rounded-full p-2 ${isVerified ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}</div><div><p className="text-sm font-semibold">{isVerified ? `เชื่อมต่อ Settrade แล้ว · Broker ${connection?.brokerId}` : "ยังไม่ได้เชื่อมต่อบัญชีโบรกเกอร์"}</p><p className="text-xs text-white/45">{isVerified ? "พร้อมสำหรับขั้น Sync พอร์ตแบบ read-only ที่จะเพิ่มถัดไป" : "เชื่อมต่อก่อนเพื่อเตรียมดึงพอร์ตของคุณ"}</p></div></div>
          <Link href="/thai-dividend-portfolio"><Button size="sm" className="gap-2 bg-white/10 text-white hover:bg-white/15">{isVerified ? "จัดการการเชื่อมต่อ" : "เชื่อมต่อโบรกเกอร์"}<ArrowUpRight className="h-3.5 w-3.5" /></Button></Link>
        </section>
      </div>
    </div>
  );
}
