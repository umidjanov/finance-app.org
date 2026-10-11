import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import api from "../api/axios";
import toast from "react-hot-toast";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

// Hook faqat GoogleOAuthProvider ichida ishlaydi
function GoogleButton({ onNavigate }) {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await api.post("/api/auth/google", {
          token: tokenResponse.access_token,
        });
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success("Google orqali kirdingiz! 🎉");
        onNavigate("/dashboard");
      } catch {
        toast.error("Google login xato!");
      }
    },
    onError: () => toast.error("Google login bekor qilindi!"),
  });

  return (
    <button
      className="w-full p-[13px] bg-[#FFFFFF] border-2 border-[#E5E5E5] rounded-[10px] text-[15px] font-semibold cursor-pointer flex items-center justify-center text-[#14213D] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-[#E5E5E5] transition-all"
      type="button"
      onClick={() => googleLogin()}
    >
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
        className="w-5 mr-[10px]"
      />
      Google orqali kirish
    </button>
  );
}


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Oddiy login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);
      const res = await api.post("/api/auth/login", formData);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Xush kelibsiz! 🎉");
      navigate("/dashboard");
    } catch {
      toast.error("Email yoki parol xato!");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#14213D] to-[#000000] p-4 font-sans">
      <div className="bg-[#FFFFFF] p-6 sm:p-10 rounded-[20px] w-full max-w-[420px] shadow-[0_25px_50px_rgba(0,0,0,0.4)]">
        <h2 className="text-center mb-2 text-[22px] sm:text-[28px] font-bold text-[#14213D]">
          💰 Finance App
        </h2>
        <p className="text-center text-[#14213D] mb-6 opacity-60">
          Hisobingizga kiring
        </p>

        {/* Google tugmasi - har doim ko'rsatiladi */}
        {GOOGLE_CLIENT_ID ? (
          <GoogleButton onNavigate={navigate} />
        ) : (
          <button
            className="w-full p-[13px] bg-[#FFFFFF] border-2 border-[#E5E5E5] rounded-[10px] text-[15px] font-semibold cursor-pointer flex items-center justify-center text-[#14213D] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-[#E5E5E5] transition-all opacity-60"
            type="button"
            onClick={() => toast.error("Google login sozlanmagan. Admin bilan bog'laning.")}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 mr-[10px]"
            />
            Google orqali kirish
          </button>
        )}

        <div className="flex items-center my-5 gap-3 before:content-[''] before:flex-1 before:h-[2px] before:bg-[#E5E5E5] after:content-[''] after:flex-1 after:h-[2px] after:bg-[#E5E5E5]">
          <span className="text-[#14213D] opacity-40 text-sm whitespace-nowrap px-2">
            yoki
          </span>
        </div>

        {/* Oddiy login */}
        <form onSubmit={handleLogin}>
          <div className="mb-[18px]">
            <label className="block mb-2 font-semibold text-[#14213D]">
              Email
            </label>
            <input
              className="w-full p-[13px_16px] rounded-[10px] border-2 border-[#E5E5E5] text-[15px] outline-none box-border focus:border-[#FCA311] transition-colors bg-[#FFFFFF] text-[#14213D] placeholder:text-[#14213D] placeholder:opacity-30"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@gmail.com"
              required
            />
          </div>
          <div className="mb-[18px]">
            <label className="block mb-2 font-semibold text-[#14213D]">
              Parol
            </label>
            <input
              className="w-full p-[13px_16px] rounded-[10px] border-2 border-[#E5E5E5] text-[15px] outline-none box-border focus:border-[#FCA311] transition-colors bg-[#FFFFFF] text-[#14213D] placeholder:text-[#14213D] placeholder:opacity-30"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            className="w-full p-[14px] bg-[#FCA311] text-[#14213D] border-none rounded-[10px] text-lg font-bold cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70"
            type="submit"
            disabled={loading}
          >
            {loading ? "⏳ Kirish..." : "🚀 Kirish"}
          </button>
        </form>
        <p className="text-center mt-3 text-[#14213D] opacity-60 text-sm">
          <Link
            to="/forgot-password"
            className="text-[#FCA311] font-semibold no-underline hover:underline"
          >
            🔐 Parolni unutdingizmi?
          </Link>
        </p>
        <p className="text-center mt-5 text-[#14213D] opacity-70">
          Akkaunt yo'qmi?{" "}
          <Link
            to="/register"
            className="text-[#FCA311] font-semibold no-underline hover:underline transition-all"
          >
            Ro'yxatdan o'ting
          </Link>
        </p>
      </div>
    </div>
  );
}
