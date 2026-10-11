import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  // Countdown timer
  const startTimer = () => {
    setTimer(300);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // 1-qadam: Email yuborish
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/otp/send-otp", { email });
      toast.success("Kod emailga yuborildi! 📧");
      setStep(2);
      startTimer();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato!");
    } finally {
      setLoading(false);
    }
  };

  // 2-qadam: Kod tekshirish
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/otp/verify-otp", { email, code });
      toast.success("Kod tasdiqlandi! ✅");
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Kod noto'g'ri!");
    } finally {
      setLoading(false);
    }
  };

  // 3-qadam: Yangi parol
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Parollar mos kelmadi!");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/otp/reset-password", {
        email,
        code,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success("Parol yangilandi! Endi kiring. 🎉");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#14213D] to-[#000000] p-4 font-sans">
      <div className="bg-[#FFFFFF] p-8 rounded-[20px] w-full max-w-[420px] shadow-[0_25px_50px_rgba(0,0,0,0.4)]">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s
                    ? "bg-[#FCA311] text-[#14213D]"
                    : "bg-[#E5E5E5] text-[#888]"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-8 h-0.5 ${step > s ? "bg-[#FCA311]" : "bg-[#E5E5E5]"}`}
                />
              )}
            </div>
          ))}
        </div>

        <h2 className="text-center text-[24px] font-bold text-[#14213D] mb-2">
          🔐 Parolni tiklash
        </h2>

        {/* STEP 1 — Email */}
        {step === 1 && (
          <div>
            <p className="text-center text-[#888] text-sm mb-6">
              Emailingizni kiriting — kod yuboramiz
            </p>
            <form onSubmit={handleSendOTP}>
              <div className="mb-4">
                <label className="block mb-2 font-semibold text-[#14213D] text-sm">
                  📧 Email
                </label>
                <input
                  className="w-full p-[12px_16px] rounded-[10px] border-2 border-[#E5E5E5] text-[15px] outline-none focus:border-[#FCA311] transition-colors text-[#14213D]"
                  type="email"
                  placeholder="email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                className="w-full p-[13px] bg-[#FCA311] text-[#14213D] border-none rounded-[10px] font-bold text-[16px] cursor-pointer hover:opacity-90 disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? "⏳ Yuborilmoqda..." : "📧 Kod yuborish"}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2 — OTP kod */}
        {step === 2 && (
          <div>
            <p className="text-center text-[#888] text-sm mb-2">
              <b className="text-[#14213D]">{email}</b> ga kod yuborildi
            </p>
            {timer > 0 && (
              <p className="text-center text-[#FCA311] font-bold mb-4">
                ⏰ {formatTime(timer)}
              </p>
            )}
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-4">
                <label className="block mb-2 font-semibold text-[#14213D] text-sm">
                  🔢 6 xonali kod
                </label>
                <input
                  className="w-full p-[12px_16px] rounded-[10px] border-2 border-[#E5E5E5] text-[20px] outline-none focus:border-[#FCA311] transition-colors text-[#14213D] text-center tracking-[8px] font-bold"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  required
                />
              </div>
              <button
                className="w-full p-[13px] bg-[#FCA311] text-[#14213D] border-none rounded-[10px] font-bold text-[16px] cursor-pointer hover:opacity-90 disabled:opacity-50 mb-3"
                type="submit"
                disabled={loading || code.length !== 6}
              >
                {loading ? "⏳ Tekshirilmoqda..." : "✅ Tasdiqlash"}
              </button>
              {timer === 0 && (
                <button
                  className="w-full p-[11px] bg-transparent text-[#14213D] border-2 border-[#E5E5E5] rounded-[10px] font-bold text-[14px] cursor-pointer hover:border-[#FCA311] transition-colors"
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setCode("");
                  }}
                >
                  🔄 Qayta yuborish
                </button>
              )}
            </form>
          </div>
        )}

        {/* STEP 3 — Yangi parol */}
        {step === 3 && (
          <div>
            <p className="text-center text-[#888] text-sm mb-6">
              Yangi parolni kiriting
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="block mb-2 font-semibold text-[#14213D] text-sm">
                  🔐 Yangi parol
                </label>
                <input
                  className="w-full p-[12px_16px] rounded-[10px] border-2 border-[#E5E5E5] text-[15px] outline-none focus:border-[#FCA311] transition-colors text-[#14213D]"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <p className="text-[11px] text-[#888] mt-1">
                  Kamida 8 belgi, 1 katta harf, 1 raqam
                </p>
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-semibold text-[#14213D] text-sm">
                  🔐 Parolni tasdiqlang
                </label>
                <input
                  className="w-full p-[12px_16px] rounded-[10px] border-2 border-[#E5E5E5] text-[15px] outline-none focus:border-[#FCA311] transition-colors text-[#14213D]"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button
                className="w-full p-[13px] bg-[#FCA311] text-[#14213D] border-none rounded-[10px] font-bold text-[16px] cursor-pointer hover:opacity-90 disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? "⏳ Saqlanmoqda..." : "✅ Parolni yangilash"}
              </button>
            </form>
          </div>
        )}

        <p className="text-center mt-5 text-[#14213D] opacity-60 text-sm">
          <Link
            to="/login"
            className="text-[#FCA311] font-semibold no-underline hover:underline"
          >
            ← Loginга qaytish
          </Link>
        </p>
      </div>
    </div>
  );
}
