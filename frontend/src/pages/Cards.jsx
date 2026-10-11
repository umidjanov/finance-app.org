import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";

const BANKS = [
  { name: "Uzcard", color: "#1a6b3c", prefix: "8600", logo: "🇺🇿" },
  { name: "HUMO", color: "#2e7d32", prefix: "9860", logo: "🟢" },
  { name: "Kapitalbank", color: "#1565c0", prefix: "5614", logo: "🏦" },
  { name: "Xalqbank", color: "#c62828", prefix: "8610", logo: "🔴" },
  { name: "Agrobank", color: "#388e3c", prefix: "8620", logo: "🌿" },
  { name: "Ipoteka Bank", color: "#6a1b9a", prefix: "5897", logo: "🏠" },
  { name: "Boshqa", color: "#37474f", prefix: "****", logo: "💳" },
];

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [smsInfo, setSmsInfo] = useState(null);
  const [setupStep, setSetupStep] = useState(0); // 0=cards, 1=setup wizard
  const [form, setForm] = useState({
    bank_name: "Uzcard",
    card_last4: "",
    nickname: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadCards = useCallback(async () => {
    try {
      const res = await api.get("/api/cards/");
      setCards(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    }
  }, [navigate]);

  const loadSmsInfo = async () => {
    try {
      const res = await api.get("/api/sms/webhook-info");
      setSmsInfo(res.data);
    } catch {}
  };

  useEffect(() => {
    loadCards();
    loadSmsInfo();
  }, [loadCards]);

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (form.card_last4.length !== 4 || !/^\d+$/.test(form.card_last4)) {
      toast.error("Karta raqamining faqat oxirgi 4 raqamini kiriting!");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/cards/", form);
      toast.success("✅ Karta qo'shildi! Endi SMS Forwarder sozlang.");
      setForm({ bank_name: "Uzcard", card_last4: "", nickname: "" });
      setShowForm(false);
      loadCards();
      // Setup wizard ga o'tish
      setSetupStep(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Kartani o'chirasizmi?")) return;
    try {
      await api.delete(`/api/cards/${id}`);
      toast.success("O'chirildi!");
      loadCards();
    } catch {
      toast.error("Xato!");
    }
  };

  const selectedBank = BANKS.find((b) => b.name === form.bank_name) || BANKS[0];

  return (
    <div className="min-h-screen bg-[#14213D] p-5 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#1a2a4a] px-7 py-4 rounded-[14px] mb-5 shadow-[0_2px_12px_rgba(0,0,0,0.3)] border border-[#ffffff10]">
        <h2 className="m-0 text-[22px] text-[#FCA311] font-bold">💳 Mening Kartalarim</h2>
        <button
          className="px-5 py-[9px] bg-[#FCA311] text-[#14213D] border-none rounded-lg cursor-pointer font-bold hover:opacity-90"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
      </div>

      <div className="max-w-3xl mx-auto">

        {/* SETUP WIZARD — Avtomatik sozlash */}
        {setupStep === 1 && smsInfo && (
          <div className="bg-gradient-to-br from-[#1a2a4a] to-[#0d1f3c] rounded-2xl p-6 mb-6 border border-[#FCA311] border-opacity-40 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#FCA311] font-bold text-lg">🚀 Avtomatik sozlash</h3>
              <button onClick={() => setSetupStep(0)} className="text-[#E5E5E5] opacity-40 hover:opacity-80 text-xl">✕</button>
            </div>
            <p className="text-[#E5E5E5] opacity-70 text-sm mb-5">
              Karta qo'shildi! Endi <strong className="text-[#FCA311]">bir marta</strong> quyidagilarni bajaring — 
              shundan keyin bank SMS kelganida <strong className="text-green-400">avtomatik</strong> transaction qo'shiladi.
            </p>

            {/* Qadam 1 */}
            <div className="flex gap-3 mb-4">
              <div className="bg-[#FCA311] text-[#14213D] rounded-full w-8 h-8 flex items-center justify-center font-black text-sm flex-shrink-0">1</div>
              <div className="flex-1">
                <p className="text-[#E5E5E5] font-bold text-sm mb-1">Android telefoningizga SMS Forwarder o'rnating</p>
                <a
                  href="https://play.google.com/store/search?q=sms+forwarder+webhook"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#FCA311] text-[#14213D] px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90"
                >
                  📲 Google Play dan yuklab olish
                </a>
              </div>
            </div>

            {/* Qadam 2 */}
            <div className="flex gap-3 mb-4">
              <div className="bg-[#FCA311] text-[#14213D] rounded-full w-8 h-8 flex items-center justify-center font-black text-sm flex-shrink-0">2</div>
              <div className="flex-1">
                <p className="text-[#E5E5E5] font-bold text-sm mb-2">Ilovada quyidagi sozlamalarni kiriting:</p>
                <div className="space-y-2">
                  {[
                    { label: "Webhook URL", value: smsInfo.webhook_url, copy: true },
                    { label: "Header: X-Webhook-Token", value: smsInfo.webhook_token, copy: true },
                    { label: "User Token (payload ichiga)", value: smsInfo.user_token, copy: true },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[#E5E5E5] opacity-50 text-xs mb-1">{item.label}</p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={item.value}
                          className="flex-1 bg-[#14213D] border border-[#ffffff15] rounded-lg px-3 py-2 text-[#FCA311] text-xs font-mono"
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
                <div className="mt-2 p-3 bg-[#14213D] rounded-lg border border-[#ffffff10]">
                  <p className="text-[#E5E5E5] opacity-50 text-xs mb-1">JSON Body (payload):</p>
                  <code className="text-green-400 text-xs font-mono block">
                    {`{"sms_body": "$sms_body", "phone_from": "$phone_from", "user_token": "${smsInfo.user_token}"}`}
                  </code>
                </div>
              </div>
            </div>

            {/* Qadam 3 */}
            <div className="flex gap-3 mb-5">
              <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-black text-sm flex-shrink-0">✓</div>
              <div className="flex-1">
                <p className="text-green-400 font-bold text-sm">Tayyor! Endi hamma narsa avtomatik</p>
                <p className="text-[#E5E5E5] opacity-60 text-xs mt-1">
                  Bank SMS kelganida → SMS Forwarder ushlab oladi → Finance App avtomatik transaction qo'shadi
                </p>
              </div>
            </div>

            <button
              className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-colors"
              onClick={() => setSetupStep(0)}
            >
              ✅ Tushunarli, yopish
            </button>
          </div>
        )}

        {/* Kartalar ro'yxati */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {cards.map((card) => {
            const bank = BANKS.find((b) => b.name === card.bank_name) || BANKS[6];
            return (
              <div
                key={card.id}
                className="relative rounded-2xl p-5 text-white shadow-xl overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${card.color}ee, ${card.color}88)` }}
              >
                {/* Karta chip dizayni */}
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
                  style={{ background: "white", transform: "translate(30%, -30%)" }} />
                <div className="absolute bottom-0 right-8 w-24 h-24 rounded-full opacity-10"
                  style={{ background: "white", transform: "translateY(30%)" }} />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-white opacity-70 text-xs mb-1">{bank.logo} {card.bank_name}</p>
                      <p className="font-bold text-base">{card.nickname}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${card.is_active ? "bg-green-500 bg-opacity-30 text-green-300" : "bg-red-500 bg-opacity-30 text-red-300"}`}>
                        {card.is_active ? "✅ Faol" : "⏸ Faol emas"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xl font-mono tracking-widest mb-4 opacity-90">
                    {card.card_number_masked}
                  </p>

                  <div className="flex justify-between items-center">
                    <p className="text-xs opacity-60">
                      Qo'shilgan: {new Date(card.created_at).toLocaleDateString("uz-UZ")}
                    </p>
                    <button
                      className="text-white opacity-60 hover:opacity-100 text-sm hover:text-red-300 transition-colors"
                      onClick={() => handleDelete(card.id)}
                    >
                      🗑️ O'chirish
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Karta qo'shish tugmasi */}
          <button
            className="rounded-2xl p-5 border-2 border-dashed border-[#ffffff20] text-[#E5E5E5] opacity-50 hover:opacity-80 hover:border-[#FCA311] transition-all flex flex-col items-center justify-center gap-2 min-h-[160px]"
            onClick={() => setShowForm(true)}
          >
            <span className="text-4xl">+</span>
            <span className="font-bold text-sm">Karta qo'shish</span>
          </button>
        </div>

        {/* Karta qo'shish formasi */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a2a4a] rounded-2xl p-6 w-full max-w-md border border-[#ffffff10] shadow-2xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[#FCA311] font-bold text-lg">💳 Yangi karta qo'shish</h3>
                <button onClick={() => setShowForm(false)} className="text-[#E5E5E5] opacity-50 hover:opacity-100 text-xl">✕</button>
              </div>

              {/* Karta preview */}
              <div
                className="rounded-xl p-4 mb-5 text-white relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${selectedBank.color}ee, ${selectedBank.color}88)` }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 bg-white" style={{transform: "translate(30%,-30%)"}}/>
                <p className="text-xs opacity-70 mb-1">{selectedBank.logo} {form.bank_name}</p>
                <p className="font-bold mb-3">{form.nickname || "Mening kartam"}</p>
                <p className="text-lg font-mono tracking-widest opacity-90">
                  {selectedBank.prefix} **** **** {form.card_last4 || "????"}
                </p>
              </div>

              <form onSubmit={handleAddCard} className="space-y-4">
                {/* Bank tanlash */}
                <div>
                  <label className="text-[#E5E5E5] text-sm font-bold block mb-2">Bank</label>
                  <div className="grid grid-cols-3 gap-2">
                    {BANKS.map((bank) => (
                      <button
                        key={bank.name}
                        type="button"
                        className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${
                          form.bank_name === bank.name
                            ? "border-[#FCA311] bg-[#FCA311] text-[#14213D]"
                            : "border-[#ffffff20] text-[#E5E5E5] hover:border-[#FCA311]"
                        }`}
                        onClick={() => setForm({ ...form, bank_name: bank.name })}
                      >
                        {bank.logo} {bank.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Karta oxirgi 4 raqam */}
                <div>
                  <label className="text-[#E5E5E5] text-sm font-bold block mb-2">
                    Karta oxirgi 4 raqami
                  </label>
                  <input
                    className="w-full bg-[#14213D] border border-[#ffffff20] rounded-lg px-4 py-3 text-[#E5E5E5] text-2xl font-mono text-center tracking-[0.5em] focus:border-[#FCA311] outline-none"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1234"
                    value={form.card_last4}
                    onChange={(e) => setForm({ ...form, card_last4: e.target.value.replace(/\D/g, "") })}
                  />
                  <p className="text-[#E5E5E5] opacity-40 text-xs mt-1 text-center">
                    Masalan: kartangizda <strong>8600 **** **** 1234</strong> bo'lsa → <strong>1234</strong> kiriting
                  </p>
                </div>

                {/* Nom */}
                <div>
                  <label className="text-[#E5E5E5] text-sm font-bold block mb-2">Karta nomi (ixtiyoriy)</label>
                  <input
                    className="w-full bg-[#14213D] border border-[#ffffff20] rounded-lg px-4 py-3 text-[#E5E5E5] focus:border-[#FCA311] outline-none"
                    type="text"
                    placeholder="Asosiy karta, Ish kartam..."
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  />
                </div>

                {/* Xavfsizlik eslatmasi */}
                <div className="bg-[#14213D] rounded-lg p-3 flex gap-2 border border-[#ffffff08]">
                  <span className="text-xl">🔒</span>
                  <p className="text-[#E5E5E5] opacity-60 text-xs">
                    <strong>Xavfsiz:</strong> To'liq karta raqami saqlanmaydi. Faqat oxirgi 4 raqam va bank nomi saqlanadi. 
                    SMS orqali transactionlar avtomatik aniqlanadi.
                  </p>
                </div>

                <button
                  className="w-full py-3 bg-[#FCA311] text-[#14213D] font-black rounded-xl hover:opacity-90 disabled:opacity-50 text-base"
                  type="submit"
                  disabled={loading || form.card_last4.length !== 4}
                >
                  {loading ? "⏳ Qo'shilmoqda..." : "✅ Kartani qo'shish"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Bo'sh holat */}
        {cards.length === 0 && !showForm && (
          <div className="bg-[#1a2a4a] rounded-2xl p-10 text-center border border-[#ffffff10]">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-[#FCA311] font-bold text-xl mb-2">Hali karta qo'shilmagan</h3>
            <p className="text-[#E5E5E5] opacity-50 mb-6 text-sm">
              Bank kartangizni qo'shing — SMS kelganida avtomatik transaction yaratiladi
            </p>
            <button
              className="px-8 py-3 bg-[#FCA311] text-[#14213D] font-bold rounded-xl hover:opacity-90"
              onClick={() => setShowForm(true)}
            >
              + Karta qo'shish
            </button>
          </div>
        )}

        {/* Qanday ishlaydi info */}
        {cards.length > 0 && (
          <div className="bg-[#1a2a4a] rounded-2xl p-5 border border-[#ffffff10] mt-4">
            <h4 className="text-[#FCA311] font-bold mb-3 text-sm">⚡ Qanday ishlaydi?</h4>
            <div className="flex items-center gap-2 flex-wrap text-sm text-[#E5E5E5] opacity-70">
              <span className="bg-[#14213D] rounded-lg px-3 py-1">💳 Xarid qilasiz</span>
              <span>→</span>
              <span className="bg-[#14213D] rounded-lg px-3 py-1">📱 SMS keladi</span>
              <span>→</span>
              <span className="bg-[#14213D] rounded-lg px-3 py-1">📲 SMS Forwarder ushlab oladi</span>
              <span>→</span>
              <span className="bg-green-500 bg-opacity-20 text-green-400 rounded-lg px-3 py-1 font-bold">✅ Avtomatik transaction!</span>
            </div>
            <button
              className="mt-3 text-[#FCA311] text-xs hover:underline"
              onClick={() => setSetupStep(1)}
            >
              🔧 SMS Forwarder sozlamalarini ko'rish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
