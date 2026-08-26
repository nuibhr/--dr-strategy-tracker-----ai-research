import { useState } from "react";
import { CheckCircle2, KeyRound, Landmark, Loader2, LockKeyhole, RefreshCw, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";

type ConnectionForm = {
  brokerId: string;
  appCode: string;
  appId: string;
  appSecret: string;
};

const initialForm: ConnectionForm = {
  brokerId: "",
  appCode: "ALGO_EQ",
  appId: "",
  appSecret: "",
};

const modelAllocation = [
  { bucket: "Defensive income", target: "35%", description: "สาธารณูปโภค, สื่อสาร, โครงสร้างพื้นฐาน" },
  { bucket: "Quality dividend growth", target: "35%", description: "ธุรกิจที่กำไรและเงินปันผลเติบโตสม่ำเสมอ" },
  { bucket: "Financials", target: "15%", description: "ธนาคาร/ประกัน แยกความเสี่ยงรายตัว" },
  { bucket: "REIT & Property Fund", target: "10%", description: "กระแสเงินสดและการกระจายรายได้" },
  { bucket: "Cash buffer", target: "5%", description: "รองรับ rebalancing และโอกาสใหม่" },
];

export default function ThaiDividendPortfolio() {
  const [form, setForm] = useState<ConnectionForm>(initialForm);
  const [showSecret, setShowSecret] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.brokerConnection.getStatus.useQuery();

  const saveConnection = trpc.brokerConnection.save.useMutation({
    onSuccess: async () => {
      setForm(current => ({ ...current, appId: "", appSecret: "" }));
      setAccepted(false);
      await utils.brokerConnection.getStatus.invalidate();
      toast.success("บันทึกข้อมูลเชื่อมต่อแบบเข้ารหัสแล้ว");
    },
    onError: error => toast.error(error.message),
  });

  const verifyConnection = trpc.brokerConnection.verify.useMutation({
    onSuccess: async () => {
      await utils.brokerConnection.getStatus.invalidate();
      toast.success("ยืนยันการเชื่อมต่อ Settrade สำเร็จ");
    },
    onError: async error => {
      await utils.brokerConnection.getStatus.invalidate();
      toast.error(error.message);
    },
  });

  const disconnect = trpc.brokerConnection.disconnect.useMutation({
    onSuccess: async () => {
      await utils.brokerConnection.getStatus.invalidate();
      toast.success("ลบข้อมูลเชื่อมต่อออกจากระบบแล้ว");
    },
    onError: error => toast.error(error.message),
  });

  const update = (field: keyof ConnectionForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!accepted) {
      toast.error("กรุณายืนยันว่าเป็น API credentials ของบัญชีคุณเองก่อนบันทึก");
      return;
    }
    saveConnection.mutate(form);
  };

  const connection = data?.connection;
  const canSave = Boolean(data?.encryptionReady && data?.persistenceReady && accepted && form.brokerId && form.appCode && form.appId && form.appSecret);

  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-[#151d25] to-[#0d1117] p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <WalletCards className="h-3.5 w-3.5" /> Thai Dividend Portfolio
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">พอร์ตหุ้นปันผลไทยที่มีวินัยก่อนผลตอบแทน</h1>
              <p className="mt-3 text-sm leading-6 text-white/65">
                ตั้งเป้าสัดส่วน ตรวจความกระจุกตัว และคัดกรองความเสี่ยงปันผลก่อนสร้างแผน rebalancing
                การเชื่อมต่อ Settrade ในเวอร์ชันนี้ใช้เพื่อตรวจสอบ credentials เท่านั้น — ยังไม่ส่งคำสั่งซื้อขายจริง
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/65">
              <p className="font-semibold text-white">สถานะคำสั่งซื้อขาย</p>
              <p className="mt-1 text-amber-200">ปิดอยู่: รอเปิดหลังผ่าน sandbox และ review</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-2xl border border-white/10 bg-[#141b24] p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-emerald-400/10 p-2.5"><Landmark className="h-5 w-5 text-emerald-300" /></div>
              <div>
                <h2 className="font-bold">เชื่อมต่อบัญชีโบรกเกอร์ของคุณ</h2>
                <p className="mt-1 text-xs leading-5 text-white/50">รองรับรูปแบบ Settrade Open API; ใส่ข้อมูลจาก API Portal ของบัญชีคุณเอง</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55"><Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสถานะการเชื่อมต่อ</div>
            ) : connection ? (
              <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <CheckCircle2 className={`mt-0.5 h-5 w-5 ${connection.status === "verified" ? "text-emerald-300" : "text-amber-300"}`} />
                    <div>
                      <p className="text-sm font-semibold">Settrade • Broker {connection.brokerId}</p>
                      <p className="mt-1 text-xs text-white/60">App ID: {connection.appIdHint} · App code: {connection.appCode}</p>
                      <p className="mt-1 text-xs text-white/50">{connection.status === "verified" ? "ยืนยันกับ Settrade แล้ว" : connection.status === "error" ? connection.lastError : "บันทึกแล้ว รอทดสอบการเชื่อมต่อ"}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${connection.status === "verified" ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>{connection.status.toUpperCase()}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => verifyConnection.mutate()} disabled={verifyConnection.isPending} className="gap-2 bg-emerald-500 text-black hover:bg-emerald-400">
                    {verifyConnection.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} ทดสอบการเชื่อมต่อ
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (window.confirm("ลบ API credentials ที่บันทึกไว้หรือไม่? การกระทำนี้ย้อนกลับไม่ได้")) disconnect.mutate();
                  }} disabled={disconnect.isPending} className="gap-2 border-red-400/25 text-red-200 hover:bg-red-400/10 hover:text-red-100">
                    <Trash2 className="h-3.5 w-3.5" /> ยกเลิกการเชื่อมต่อ
                  </Button>
                </div>
              </div>
            ) : null}

            {!data?.encryptionReady && (
              <div className="mb-5 rounded-xl border border-red-400/25 bg-red-400/[0.06] p-4 text-sm text-red-100">
                ผู้ดูแลระบบต้องตั้งค่า <code>BROKER_CREDENTIALS_ENCRYPTION_KEY</code> บน server ก่อน ระบบจึงจะรับข้อมูลได้อย่างปลอดภัย
              </div>
            )}
            {!data?.persistenceReady && (
              <div className="mb-5 rounded-xl border border-red-400/25 bg-red-400/[0.06] p-4 text-sm text-red-100">
                ระบบยังไม่มีฐานข้อมูลถาวร จึงปิดการรับ API credentials ของลูกค้าไว้ก่อน เพื่อไม่ให้ข้อมูลหายเมื่อ server restart
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="brokerId">Broker ID</Label><Input id="brokerId" value={form.brokerId} onChange={e => update("brokerId", e.target.value)} placeholder="เช่น รหัสจากโบรกเกอร์" className="border-white/10 bg-white/[0.04]" /></div>
                <div className="space-y-2"><Label htmlFor="appCode">App code</Label><Input id="appCode" value={form.appCode} onChange={e => update("appCode", e.target.value)} className="border-white/10 bg-white/[0.04]" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="appId">App ID</Label><Input id="appId" autoComplete="off" value={form.appId} onChange={e => update("appId", e.target.value)} placeholder="สร้างจาก Settrade API Portal" className="border-white/10 bg-white/[0.04]" /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label htmlFor="appSecret">App Secret</Label><button type="button" onClick={() => setShowSecret(value => !value)} className="text-xs text-emerald-300 hover:text-emerald-200">{showSecret ? "ซ่อน" : "แสดง"}</button></div>
                <Input id="appSecret" type={showSecret ? "text" : "password"} autoComplete="new-password" value={form.appSecret} onChange={e => update("appSecret", e.target.value)} placeholder="จะถูกส่งผ่าน TLS และเข้ารหัสก่อนบันทึก" className="border-white/10 bg-white/[0.04]" />
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <Switch checked={accepted} onCheckedChange={setAccepted} />
                <p className="text-xs leading-5 text-white/60">ฉันยืนยันว่าเป็น credentials ของบัญชีฉันเอง และรับทราบว่าไม่ควรส่ง App Secret ผ่านแชต อีเมล หรือภาพหน้าจอ</p>
              </div>
              <Button type="submit" disabled={!canSave || saveConnection.isPending} className="w-full gap-2 bg-emerald-500 text-black hover:bg-emerald-400">
                {saveConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />} เข้ารหัสและบันทึกการเชื่อมต่อ
              </Button>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#141b24] p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="font-bold">การคุ้มครองข้อมูล</h2></div>
              <ul className="space-y-3 text-xs leading-5 text-white/60">
                <li>• Secret ไม่ถูกเก็บใน browser, localStorage หรือแสดงกลับผ่าน API</li>
                <li>• Server เข้ารหัสด้วย AES-256-GCM ก่อนบันทึกลงฐานข้อมูล</li>
                <li>• ปุ่มทดสอบเรียกเฉพาะ authentication endpoint และไม่ส่งคำสั่งซื้อขาย</li>
                <li>• ลูกค้าลบการเชื่อมต่อของตนเองได้ทันที</li>
              </ul>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#141b24] p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-300" /><h2 className="font-bold">โครงพอร์ตเริ่มต้น</h2></div>
              <div className="space-y-3">
                {modelAllocation.map(item => <div key={item.bucket} className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{item.bucket}</span><span className="text-emerald-300">{item.target}</span></div><p className="mt-1 text-xs text-white/45">{item.description}</p></div>)}
              </div>
              <p className="mt-4 text-xs leading-5 text-white/45">สัดส่วนนี้เป็น template ให้ปรับตามผล suitability และเป้าหมายของลูกค้า ไม่ใช่คำแนะนำเฉพาะบุคคล</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
