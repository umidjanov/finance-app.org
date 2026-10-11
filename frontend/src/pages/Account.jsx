import { useState, useEffect, useRef, useCallback } from "react"; // useCallback qo'shildi
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../constants";

export default function Account() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [smsInfo, setSmsInfo] = useState(null);
  const [smsLogs, setSmsLogs] = useState([]);
  const [manualSms, setManualSms] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const [emailForm, setEmailForm] = useState({ new_email: "" });
  const [passForm, setPassForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    username: "",
  });
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();
  const navigate = useNavigate();

  // 1. loadUser funksiyasini useCallback bilan o'raymiz (Cheksiz siklni to'xtatadi)
  const loadUser = useCallback(async () => {
    try {
      const res = await api.get("/api/auth/me");

      // Faqat ma'lumot kelganda state-ni yangilaymiz
      setUser(res.data);
      setProfileForm({
        full_name: res.data.full_name || "",
        username: res.data.username || "",
      });

      // LocalStorage-ga faqat ma'lumot o'zgarganda yozamiz
      const currentStored = localStorage.getItem("user");
      if (currentStored !== JSON.stringify(res.data)) {
        localStorage.setItem("user", JSON.stringify(res.data));
      }
    } catch (err) {
      // Agar avtorizatsiya xatosi bo'lsa, login sahifasiga yuboramiz
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
      console.error("User yuklashda xato:", err);
    }
  }, [navigate]);

  // 2. useEffect bog'liqligini to'g'ri ko'rsatamiz
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (activeTab === "sms") loadSmsInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put("/api/auth/update-email", emailForm);
      localStorage.setItem("token", res.data.access_token);
      toast.success("Email yangilandi!");
      loadUser();
      setEmailForm({ new_email: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato!");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm_password) {
      return toast.error("Parollar mos kelmadi!");
    }
    setLoading(true);
    try {
      await api.put("/api/auth/update-password", passForm);
      toast.success("Parol yangilandi! Qayta kiring.");
      localStorage.clear();
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato!");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/api/auth/update-profile", profileForm);
      toast.success("Profil yangilandi!");
      loadUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato!");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/api/auth/upload-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Rasm yuklandi!");
      loadUser();
    } catch (err) {
      console.error("Avatar yuklashda xato:", err);
      toast.error(err.response?.data?.detail || "Rasm yuklashda xato!");
    }
  };

  const tabs = [
    { id: "info", label: "👤 Ma'lumotlar" },
    { id: "email", label: "📧 Email" },
    { id: "password", label: "🔐 Parol" },
    { id: "profile", label: "✏️ Tahrirlash" },
    { id: "sms", label: "📲 SMS Integratsiya" },
  ];

  const loadSmsInfo = async () => {
    try {
      const [infoRes, logsRes] = await Promise.all([
        api.get("/api/sms/webhook-info"),
        api.get("/api/sms/logs?limit=20"),
      ]);
      setSmsInfo(infoRes.data);
      setSmsLogs(logsRes.data);
    } catch (err) {
      console.error("SMS info yuklanmadi:", err);
    }
  };

  const handleManualSms = async () => {
    if (!manualSms.trim()) return;
    setSmsLoading(true);
    try {
      const res = await api.post("/api/sms/manual", { sms_text: manualSms });
      if (res.data.transaction_created) {
        toast.success(`✅ Transaction yaratildi: ${res.data.parsed?.amount_float?.toLocaleString()} UZS`);
      } else {
        toast.error("❌ SMS parse qilinmadi — bank SMS formatiga mos kelmaydi");
      }
      setManualSms("");
      loadSmsInfo();
    } catch {
      toast.error("Xato yuz berdi!");
    } finally {
      setSmsLoading(false);
    }
  };

  const handleDeleteLog = async (id) => {
    try {
      await api.delete(`/api/sms/logs/${id}`);
      setSmsLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success("O'chirildi!");
    } catch {
      toast.error("O'chirishda xato!");
    }
  };

  return (
    <div className="min-h-screen bg-[#14213D] p-5 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#1a2a4a] px-7 py-4 rounded-[14px] mb-5 shadow-[0_2px_12px_rgba(0,0,0,0.3)] border border-[#ffffff10]">
        <h2 className="m-0 text-[22px] text-[#FCA311] font-bold">👤 Akkaunt</h2>
        <button
          className="px-5 py-[9px] bg-[#FCA311] text-[#14213D] border-none rounded-lg cursor-pointer font-bold hover:opacity-90"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT — Avatar + Info */}
        <div className="bg-[#1a2a4a] rounded-[14px] p-6 border border-[#ffffff10] flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div
              className="w-28 h-28 rounded-full border-4 border-[#FCA311] overflow-hidden cursor-pointer bg-[#14213D] flex items-center justify-center"
              onClick={() => fileRef.current.click()}
            >
              {user?.avatar ? (
                <img
                  src={`${API_BASE_URL}${user.avatar}`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl">👤</span>
              )}
            </div>
            <button
              className="absolute bottom-0 right-0 bg-[#FCA311] text-[#14213D] rounded-full w-8 h-8 text-lg font-bold border-none cursor-pointer flex items-center justify-center"
              onClick={() => fileRef.current.click()}
            >
              +
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <h3 className="text-[#FCA311] text-xl font-bold mb-1">
            {user?.full_name}
          </h3>
          <p className="text-[#E5E5E5] opacity-60 mb-4">@{user?.username}</p>

          <div className="w-full space-y-2 text-left">
            {[
              { label: "ID", value: `#${user?.id}` },
              { label: "Email", value: user?.email },
              { label: "Admin", value: user?.is_admin ? "Ha ✅" : "Yo'q ❌" },
              {
                label: "Holat",
                value: user?.is_active ? "Faol ✅" : "Faol emas",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center py-2 border-b border-[#ffffff10]"
              >
                <span className="text-[#E5E5E5] opacity-50 text-sm">
                  {item.label}
                </span>
                <span className="text-[#E5E5E5] text-sm font-semibold">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <button
            className="mt-5 w-full px-5 py-[9px] bg-transparent text-[#E5E5E5] border-2 border-[#E5E5E5] rounded-lg cursor-pointer font-bold hover:bg-[#E5E5E5] hover:text-[#14213D] transition-all"
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
          >
            🚪 Chiqish
          </button>
        </div>

        {/* RIGHT — Tabs */}
        <div className="lg:col-span-2">
          <div className="flex gap-2 mb-4 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 rounded-lg font-semibold text-sm border-none cursor-pointer transition-all ${
                  activeTab === tab.id
                    ? "bg-[#FCA311] text-[#14213D]"
                    : "bg-[#1a2a4a] text-[#E5E5E5] hover:bg-[#FCA311] hover:text-[#14213D]"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-[#1a2a4a] rounded-[14px] p-6 border border-[#ffffff10]">
            {activeTab === "info" && (
              <div>
                <h3 className="text-[#FCA311] text-lg font-bold mb-4">
                  👤 Foydalanuvchi ma'lumotlari
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "🆔 ID", value: user?.id },
                    { label: "👤 Ism Familiya", value: user?.full_name },
                    { label: "🔖 Username", value: `@${user?.username}` },
                    { label: "📧 Email", value: user?.email },
                    {
                      label: "🛡️ Admin",
                      value: user?.is_admin ? "Ha" : "Yo'q",
                    },
                    {
                      label: "✅ Faol",
                      value: user?.is_active ? "Ha" : "Yo'q",
                    },
                    {
                      label: "📧 Tasdiqlangan",
                      value: user?.is_verified ? "Ha" : "Yo'q",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center p-3 bg-[#14213D] rounded-lg border border-[#ffffff08]"
                    >
                      <span className="text-[#E5E5E5] opacity-60 text-sm">
                        {item.label}
                      </span>
                      <span className="text-[#FCA311] font-semibold text-sm">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "email" && (
              <div>
                <h3 className="text-[#FCA311] text-lg font-bold mb-2">
                  📧 Email yangilash
                </h3>
                <p className="text-[#E5E5E5] opacity-50 text-sm mb-4">
                  Hozirgi: <span className="text-[#FCA311]">{user?.email}</span>
                </p>
                <form onSubmit={handleUpdateEmail}>
                  <div className="mb-4">
                    <label className="block mb-2 font-semibold text-[#E5E5E5] text-sm">
                      Yangi Email
                    </label>
                    <input
                      className="w-full p-[11px_14px] rounded-lg border border-[#ffffff20] text-[15px] outline-none bg-[#14213D] text-[#E5E5E5] placeholder:text-[#E5E5E5] placeholder:opacity-30 focus:border-[#FCA311] transition-colors"
                      type="email"
                      placeholder="yangi@gmail.com"
                      value={emailForm.new_email}
                      onChange={(e) =>
                        setEmailForm({ new_email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <button
                    className="w-full p-[12px] bg-[#FCA311] text-[#14213D] border-none rounded-lg font-bold cursor-pointer hover:opacity-90 disabled:opacity-50"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "⏳ Yangilanmoqda..." : "✅ Emailni yangilash"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "password" && (
              <div>
                <h3 className="text-[#FCA311] text-lg font-bold mb-4">
                  🔐 Parol yangilash
                </h3>
                <form onSubmit={handleUpdatePassword}>
                  {[
                    { key: "old_password", label: "Eski parol" },
                    { key: "new_password", label: "Yangi parol" },
                    {
                      key: "confirm_password",
                      label: "Yangi parolni tasdiqlang",
                    },
                  ].map((f) => (
                    <div key={f.key} className="mb-4">
                      <label className="block mb-2 font-semibold text-[#E5E5E5] text-sm">
                        {f.label}
                      </label>
                      <input
                        className="w-full p-[11px_14px] rounded-lg border border-[#ffffff20] text-[15px] outline-none bg-[#14213D] text-[#E5E5E5] placeholder:text-[#E5E5E5] placeholder:opacity-30 focus:border-[#FCA311] transition-colors"
                        type="password"
                        placeholder="••••••••"
                        value={passForm[f.key]}
                        onChange={(e) =>
                          setPassForm({ ...passForm, [f.key]: e.target.value })
                        }
                        required
                      />
                    </div>
                  ))}
                  <button
                    className="w-full p-[12px] bg-[#FCA311] text-[#14213D] border-none rounded-lg font-bold cursor-pointer hover:opacity-90 disabled:opacity-50"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "⏳ Yangilanmoqda..." : "🔐 Parolni yangilash"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "profile" && (
              <div>
                <h3 className="text-[#FCA311] text-lg font-bold mb-4">
                  ✏️ Profilni tahrirlash
                </h3>
                <form onSubmit={handleUpdateProfile}>
                  {[
                    {
                      key: "full_name",
                      label: "Ism Familiya",
                      placeholder: "Fayzulloh Umidjonov",
                    },
                    {
                      key: "username",
                      label: "Username",
                      placeholder: "fayzulloh",
                    },
                  ].map((f) => (
                    <div key={f.key} className="mb-4">
                      <label className="block mb-2 font-semibold text-[#E5E5E5] text-sm">
                        {f.label}
                      </label>
                      <input
                        className="w-full p-[11px_14px] rounded-lg border border-[#ffffff20] text-[15px] outline-none bg-[#14213D] text-[#E5E5E5] placeholder:text-[#E5E5E5] placeholder:opacity-30 focus:border-[#FCA311] transition-colors"
                        type="text"
                        placeholder={f.placeholder}
                        value={profileForm[f.key]}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            [f.key]: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                  <button
                    className="w-full p-[12px] bg-[#FCA311] text-[#14213D] border-none rounded-lg font-bold cursor-pointer hover:opacity-90 disabled:opacity-50"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "⏳ Saqlanmoqda..." : "✅ Saqlash"}
                  </button>
                </form>
              </div>
            )}

            {/* ────────── SMS INTEGRATSIYA ────────── */}
            {activeTab === "sms" && (
              <div>
                <h3 className="text-[#FCA311] text-lg font-bold mb-1">📲 Bank SMS Integratsiyasi</h3>
                <p className="text-[#E5E5E5] opacity-50 text-sm mb-5">
                  Bank SMS lari avtomatik ravishda Finance App ga yuboriladi va transaction yaratiladi.
                </p>

                {/* Yo'riqnoma */}
                <div className="bg-[#0d1f3c] border border-[#FCA311] border-opacity-30 rounded-xl p-4 mb-5">
                  <h4 className="text-[#FCA311] font-bold mb-3 text-sm">🚀 Qanday ulash?</h4>
                  <div className="space-y-2 text-sm text-[#E5E5E5]">
                    {[
                      { n: 1, text: 'Google Play dan "SMS Forwarder" ilovasini yuklab oling', link: "https://play.google.com/store/search?q=sms+forwarder" },
                      { n: 2, text: "Ilovada yangi qoida yarating — bank SMS lari uchun" },
                      { n: 3, text: "Quyidagi Webhook URL va tokenni ilovaga kiriting" },
                      { n: 4, text: "Bankdan SMS kelganda avtomatik transaction yaratiladi ✅" },
                    ].map((s) => (
                      <div key={s.n} className="flex items-start gap-2">
                        <span className="bg-[#FCA311] text-[#14213D] rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">{s.n}</span>
                        <span className="opacity-80">
                          {s.text}
                          {s.link && (
                            <a href={s.link} target="_blank" rel="noreferrer"
                              className="text-[#FCA311] ml-1 underline">→ Ochish</a>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Webhook sozlamalari */}
                {smsInfo && (
                  <div className="space-y-3 mb-5">
                    {[
                      { label: "📡 Webhook URL", value: smsInfo.webhook_url },
                      { label: "🔑 User Token", value: smsInfo.user_token },
                      { label: "🛡️ Header Token (X-Webhook-Token)", value: smsInfo.webhook_token || "..." },
                    ].map((item) => (
                      <div key={item.label}>
                        <label className="text-[#E5E5E5] text-xs opacity-60 block mb-1">{item.label}</label>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={item.value}
                            className="flex-1 bg-[#14213D] border border-[#ffffff15] rounded-lg px-3 py-2 text-[#E5E5E5] text-sm font-mono"
                          />
                          <button
                            className="bg-[#FCA311] text-[#14213D] px-3 rounded-lg font-bold text-sm hover:opacity-90"
                            onClick={() => { navigator.clipboard.writeText(item.value); toast.success("Nusxa olindi!"); }}
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Qo'llab quvvatlanadigan banklar */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {["Uzcard 🇺🇿", "HUMO 🟢", "Kapitalbank 🏦", "Payme 💙", "Click 🟡", "Xalqbank 🔴", "Agrobank 🌿"].map((b) => (
                    <span key={b} className="bg-[#14213D] border border-[#ffffff15] text-[#E5E5E5] text-xs px-3 py-1 rounded-full">{b}</span>
                  ))}
                </div>

                {/* Qo'lda SMS kiritish */}
                <div className="border border-[#ffffff15] rounded-xl p-4 mb-5">
                  <h4 className="text-[#E5E5E5] font-bold text-sm mb-2">✍️ SMS matnini qo'lda kiriting (test uchun)</h4>
                  <textarea
                    className="w-full bg-[#14213D] border border-[#ffffff15] rounded-lg p-3 text-[#E5E5E5] text-sm resize-none focus:border-[#FCA311] outline-none font-mono"
                    rows={3}
                    placeholder={`Misol: Uzcard: 8600****1234 kartangizdan 150 000 so'm yechildi. Qoldiq: 2 350 000 so'm. Savdo: KORZINKA`}
                    value={manualSms}
                    onChange={(e) => setManualSms(e.target.value)}
                  />
                  <button
                    className="mt-2 w-full bg-[#FCA311] text-[#14213D] font-bold py-2 rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
                    onClick={handleManualSms}
                    disabled={smsLoading || !manualSms.trim()}
                  >
                    {smsLoading ? "⏳ Parse qilinmoqda..." : "🚀 Parse qilib Transaction yaratish"}
                  </button>
                </div>

                {/* SMS Loglar */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[#E5E5E5] font-bold text-sm">📋 SMS Loglar ({smsLogs.length})</h4>
                    <button onClick={loadSmsInfo} className="text-[#FCA311] text-xs hover:underline">🔄 Yangilash</button>
                  </div>
                  {smsLogs.length === 0 ? (
                    <p className="text-center text-[#E5E5E5] opacity-40 py-8 text-sm">Hali hech qanday SMS kelmagan</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {smsLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`bg-[#14213D] rounded-xl p-3 border ${
                            log.is_parsed ? "border-green-500 border-opacity-30" : "border-red-500 border-opacity-30"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                log.is_parsed ? "bg-green-500 bg-opacity-20 text-green-400" : "bg-red-500 bg-opacity-20 text-red-400"
                              }`}>
                                {log.is_parsed ? "✅ Parsed" : "❌ Xato"}
                              </span>
                              {log.bank_name && <span className="text-[#FCA311] text-xs font-bold">{log.bank_name}</span>}
                              {log.source === "manual" && <span className="text-[#E5E5E5] opacity-40 text-xs">✍️ Manual</span>}
                            </div>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-red-400 text-xs hover:text-red-300"
                            >🗑️</button>
                          </div>
                          {log.is_parsed && (
                            <div className="flex flex-wrap gap-3 text-xs text-[#E5E5E5] opacity-80 mb-1">
                              {log.amount && <span>💰 {log.amount} {log.currency}</span>}
                              {log.transaction_type && (
                                <span className={log.transaction_type === "income" ? "text-green-400" : "text-red-400"}>
                                  {log.transaction_type === "income" ? "⬆️ Kirim" : "⬇️ Chiqim"}
                                </span>
                              )}
                              {log.merchant && <span>🏪 {log.merchant}</span>}
                              {log.card_last4 && <span>💳 *{log.card_last4}</span>}
                              {log.transaction_id && <span className="text-green-400">📝 #{log.transaction_id}</span>}
                            </div>
                          )}
                          <p className="text-[#E5E5E5] opacity-40 text-xs font-mono truncate">{log.raw_sms}</p>
                          <p className="text-[#E5E5E5] opacity-25 text-xs mt-1">
                            {new Date(log.received_at).toLocaleString("uz-UZ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}