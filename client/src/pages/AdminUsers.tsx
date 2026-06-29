import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, Shield, UserCog, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

type UserRole = "user" | "admin";

type AdminUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastSignedIn: Date | string;
};

const EMPTY_FORM = {
  openId: "",
  name: "",
  email: "",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-white/50">
        {label} {required ? <span className="text-red-400">*</span> : null}
      </label>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-green-500/50 focus:outline-none"
      />
    </div>
  );
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState(EMPTY_FORM);
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const usersQuery = trpc.adminUsers.list.useQuery(undefined, {
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const createAdmin = trpc.adminUsers.createAdmin.useMutation({
    onSuccess: async () => {
      toast.success("เพิ่มแอดมินสำเร็จ");
      setForm(EMPTY_FORM);
      await utils.adminUsers.list.invalidate();
    },
    onError: error => toast.error(`เพิ่มแอดมินไม่สำเร็จ: ${error.message}`),
  });

  const updateRole = trpc.adminUsers.updateRole.useMutation({
    onSuccess: async () => {
      toast.success("อัปเดตสิทธิ์สำเร็จ");
      await utils.adminUsers.list.invalidate();
      await utils.auth.me.invalidate();
    },
    onError: error => toast.error(`อัปเดตสิทธิ์ไม่สำเร็จ: ${error.message}`),
  });

  function handleCreateAdmin() {
    if (!form.openId.trim()) {
      toast.error("กรุณาใส่ OpenID ของผู้ใช้");
      return;
    }

    createAdmin.mutate({
      openId: form.openId.trim(),
      name: form.name.trim() || undefined,
      email: form.email.trim() || undefined,
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117]">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117] px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <Shield className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="mb-2 text-lg font-bold text-white">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="mb-5 text-sm text-white/45">หน้านี้สำหรับ Admin เท่านั้น</p>
          <Button onClick={() => navigate("/")} variant="outline" className="border-white/20 text-white">
            กลับหน้าแรก
          </Button>
        </div>
      </div>
    );
  }

  const users = (usersQuery.data ?? []) as AdminUser[];
  const adminCount = users.filter(item => item.role === "admin").length;
  const viewerCount = users.length - adminCount;

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/")} variant="ghost" className="gap-2 text-white/60 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> กลับ
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Users</h1>
              <p className="text-xs text-white/40">จัดการผู้ดูแลระบบและสิทธิ์ของผู้ใช้งาน</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="border-yellow-500/30 bg-yellow-500/15 text-yellow-300">
              Admin {adminCount}
            </Badge>
            <Badge className="border-blue-500/30 bg-blue-500/15 text-blue-300">
              Viewer {viewerCount}
            </Badge>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-[#1a1f2e] p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">เพิ่มแอดมิน</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TextField
              label="OpenID"
              value={form.openId}
              onChange={value => setForm(current => ({ ...current, openId: value }))}
              placeholder="เช่น openid จาก OAuth"
              required
            />
            <TextField
              label="ชื่อ"
              value={form.name}
              onChange={value => setForm(current => ({ ...current, name: value }))}
              placeholder="ชื่อที่แสดงในระบบ"
            />
            <TextField
              label="อีเมล"
              value={form.email}
              onChange={value => setForm(current => ({ ...current, email: value }))}
              placeholder="admin@example.com"
            />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/40">
              ถ้าผู้ใช้เคย login แล้ว ให้ copy OpenID ของเขาจากตารางด้านล่าง แล้วเปลี่ยน role ได้ทันที
            </p>
            <Button
              onClick={handleCreateAdmin}
              disabled={createAdmin.isPending}
              className="gap-2 bg-green-600 text-white hover:bg-green-500"
            >
              {createAdmin.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              เพิ่มเป็น Admin
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1f2e]">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/50" />
              <p className="text-sm font-semibold text-white">ผู้ใช้งานทั้งหมด ({users.length})</p>
            </div>
            {usersQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-white/40" /> : null}
          </div>

          {usersQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-white/40">กำลังโหลดผู้ใช้งาน...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <UserCog className="mx-auto mb-3 h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">ยังไม่มีผู้ใช้งานในระบบ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    {["User", "OpenID", "Login", "Last seen", "Role", "Actions"].map(header => (
                      <th key={header} className="px-4 py-3 text-left font-medium text-white/40">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(item => {
                    const isSelf = item.id === user?.id;
                    const isUpdating = updateRole.isPending;
                    return (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/3">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                              {(item.name || item.email || item.openId).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{item.name || "Unnamed user"}</p>
                              <p className="text-white/35">{item.email || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[240px] px-4 py-3">
                          <code className="block truncate rounded bg-black/20 px-2 py-1 text-[11px] text-white/55">
                            {item.openId}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-white/50">{item.loginMethod || "-"}</td>
                        <td className="px-4 py-3 text-white/50">{formatDate(item.lastSignedIn)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              item.role === "admin"
                                ? "border-yellow-500/30 bg-yellow-500/15 text-yellow-300"
                                : "border-blue-500/30 bg-blue-500/15 text-blue-300"
                            }
                          >
                            {item.role === "admin" ? "Admin" : "Viewer"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating || item.role === "admin"}
                              onClick={() => updateRole.mutate({ userId: item.id, role: "admin" })}
                              className="h-8 border-white/10 text-white/70 hover:text-white"
                            >
                              Make Admin
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating || item.role === "user" || isSelf}
                              onClick={() => updateRole.mutate({ userId: item.id, role: "user" })}
                              className="h-8 border-white/10 text-white/70 hover:text-white disabled:opacity-35"
                            >
                              Make Viewer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
