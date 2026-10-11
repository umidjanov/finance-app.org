import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import api from "../api/axios";
import toast from "react-hot-toast";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

function GoogleRegisterButton({ onNavigate }) {
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
    onError: () => toast.error("Bekor qilindi!"),
  });

  return (
    <button
      className="w-full p-[13px] bg-[#FFFFFF] border-2 border-[#E5E5E5] rounded-[10px] text-[15px] font-semibold cursor-pointer flex items-center justify-center text-[#14213D] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-[#E5E5E5] transition-colors"
      type="button"
      onClick={() => googleLogin()}
    >
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
        className="w-5 mr-[10px]"
      />
      Google orqali ro'yxatdan o'tish
    </button>
  );
}

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    full_name: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/auth/register", form);
      toast.success("Ro'yxatdan o'tdingiz!");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato yuz berdi!");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#14213D] to-[#000000] p-4">
      <div className="bg-[#FFFFFF] p-6 sm:p-10 rounded-[20px] w-full max-w-[420px] shadow-[0_25px_50px_rgba(0,0,0,0.4)]">
        <h2 className="text-center mb-6 text-[22px] sm:text-[26px] font-bold text-[#14213D]">
          📝 Ro'yxatdan o'tish
        </h2>

        {GOOGLE_CLIENT_ID ? (
          <GoogleRegisterButton onNavigate={navigate} />
        ) : (
          <button
            className="w-full p-[13px] bg-[#FFFFFF] border-2 border-[#E5E5E5] rounded-[10px] text-[15px] font-semibold cursor-pointer flex items-center justify-center text-[#14213D] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-[#E5E5E5] transition-colors opacity-60"
            type="button"
            onClick={() => toast.error("Google login sozlanmagan. Admin bilan bog'laning.")}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 mr-[10px]"
            />
            Google orqali ro'yxatdan o'tish
          </button>
        )}

        <div className="flex items-center my-5 gap-3 before:content-[''] before:flex-1 before:h-[1px] before:bg-[#E5E5E5] after:content-[''] after:flex-1 after:h-[1px] after:bg-[#E5E5E5]">
          <span className="text-[#14213D] opacity-40 text-sm px-2">yoki</span>
        </div>

        <form onSubmit={handleRegister}>
          {[
            {
              name: "full_name",
              label: "Ism Familiya",
              type: "text",
              placeholder: "Fayzulloh Umidjonov",
            },
            {
              name: "username",
              label: "Username",
              type: "text",
              placeholder: "fayzulloh",
            },
            {
              name: "email",
              label: "Email",
              type: "email",
              placeholder: "email@gmail.com",
            },
            {
              name: "password",
              label: "Parol",
              type: "password",
              placeholder: "••••••••",
            },
          ].map((f) => (
            <div key={f.name} className="mb-4">
              <label className="block mb-[6px] font-semibold text-[#14213D]">
                {f.label}
              </label>
              <input
                className="w-full p-[12px_16px] rounded-[10px] border-2 border-[#E5E5E5] text-[15px] text-[#14213D] outline-none focus:border-[#FCA311] transition-colors box-border bg-[#FFFFFF] placeholder:text-[#14213D] placeholder:opacity-30"
                type={f.type}
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                required
              />
            </div>
          ))}
          <button
            className="w-full p-[14px] bg-[#FCA311] text-[#14213D] border-none rounded-[10px] text-lg font-bold cursor-pointer mt-2 disabled:opacity-70 transition-opacity hover:opacity-90 active:scale-[0.98]"
            type="submit"
            disabled={loading}
          >
            {loading ? "⏳ Saqlanmoqda..." : "✅ Ro'yxatdan o'tish"}
          </button>
        </form>

        <p className="text-center mt-5 text-[#14213D] opacity-70">
          Akkaunt bormi?{" "}
          <Link
            to="/login"
            className="text-[#FCA311] font-semibold no-underline hover:underline"
          >
            Kiring
          </Link>
        </p>
      </div>
    </div>
  );
}
