import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import { fmt } from "../constants";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("stats");
  const navigate = useNavigate();

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/stats");
      setStats(res.data);
    } catch {
      toast.error("Admin huquqi yo'q!");
      navigate("/dashboard");
    }
  }, [navigate]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Userlarni yuklashda xato:", err);
      toast.error("Foydalanuvchilar yuklanmadi!");
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/transactions");
      setTransactions(res.data);
    } catch (err) {
      console.error("Transactionlarni yuklashda xato:", err);
      toast.error("Transactionlar yuklanmadi!");
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadUsers();
    loadTransactions();
  }, [loadStats, loadUsers, loadTransactions]);

  const toggleActive = async (id) => {
    try {
      const res = await api.put(`/api/admin/users/${id}/toggle-active`);
      toast.success(res.data.message);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato!");
    }
  };

  const toggleAdmin = async (id) => {
    try {
      const res = await api.put(`/api/admin/users/${id}/toggle-admin`);
      toast.success(res.data.message);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato!");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Foydalanuvchini o'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.delete(`/api/admin/users/${id}`);
      toast.success("O'chirildi!");
      loadUsers();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xato!");
    }
  };

  const tabs = [
    { id: "stats", label: "📊 Statistika" },
    { id: "users", label: "👥 Foydalanuvchilar" },
    { id: "transactions", label: "💳 Transactionlar" },
  ];

  return (
    <div className="min-h-screen bg-[#14213D] p-4 sm:p-5 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#1a2a4a] px-4 sm:px-7 py-4 rounded-[14px] mb-5 border border-[#ffffff10]">
        <h2 className="m-0 text-[18px] sm:text-[22px] text-[#FCA311] font-bold">
          🔒 Admin Panel
        </h2>
        <button
          className="px-3 sm:px-5 py-2 bg-[#FCA311] text-[#14213D] border-none rounded-lg cursor-pointer font-bold text-sm"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-lg font-semibold text-sm border-none cursor-pointer whitespace-nowrap transition-all ${
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

      {/* STATS TAB */}
      {activeTab === "stats" && stats && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-5">
            {[
              {
                label: "👥 Jami userlar",
                value: stats.total_users,
                suffix: "ta",
                bg: "from-[#667eea] to-[#764ba2]",
              },
              {
                label: "✅ Faol userlar",
                value: stats.active_users,
                suffix: "ta",
                bg: "from-[#11998e] to-[#38ef7d]",
              },
              {
                label: "🚫 Bloklangan",
                value: stats.blocked_users,
                suffix: "ta",
                bg: "from-[#eb3349] to-[#f45c43]",
              },
              {
                label: "💳 Transactionlar",
                value: stats.total_transactions,
                suffix: "ta",
                bg: "from-[#f7971e] to-[#ffd200]",
              },
              {
                label: "📈 Jami kirim",
                value: fmt(stats.total_income),
                suffix: "so'm",
                bg: "from-[#1a6b3c] to-[#38ef7d]",
              },
              {
                label: "📉 Jami chiqim",
                value: fmt(stats.total_expense),
                suffix: "so'm",
                bg: "from-[#c0392b] to-[#f45c43]",
              },
              {
                label: "🏦 Jami tejamkorlik",
                value: fmt(stats.total_savings),
                suffix: "so'm",
                bg: "from-[#FCA311] to-[#ffd200]",
              },
            ].map((c, i) => (
              <div
                key={i}
                className={`p-4 rounded-[14px] text-white bg-gradient-to-br ${c.bg}`}
              >
                <p className="text-[11px] opacity-90 m-0 mb-1">{c.label}</p>
                <p className="text-[16px] sm:text-[20px] font-bold m-0">
                  {c.value} {c.suffix}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === "users" && (
        <div className="bg-[#1a2a4a] rounded-[14px] p-4 sm:p-6 border border-[#ffffff10]">
          <h3 className="text-[#FCA311] font-bold mb-4">
            👥 Foydalanuvchilar ({users.length} ta)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-[900px] lg:w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#14213D]">
                  {[
                    "ID",
                    "Ism",
                    "Email",
                    "Balans",
                    "Trx",
                    "Admin",
                    "Holat",
                    "Amal",
                  ].map((h) => (
                    <th
                      key={h}
                      className="p-3 text-left text-[12px] text-[#FCA311] font-semibold border-b border-[#ffffff15]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[#ffffff08] hover:bg-[#14213D] transition-colors"
                  >
                    <td className="p-3 text-sm text-[#E5E5E5]">#{u.id}</td>
                    <td className="p-3 text-sm text-[#E5E5E5] font-semibold">
                      {u.full_name || "-"}
                    </td>
                    <td className="p-3 text-sm text-[#E5E5E5] opacity-70">
                      {u.email}
                    </td>
                    <td className="p-3 text-sm text-[#FCA311] font-bold">
                      {fmt(u.balance)} so'm
                    </td>
                    <td className="p-3 text-sm text-[#E5E5E5]">
                      {u.transaction_count} ta
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-bold ${u.is_admin ? "bg-[#FCA311] text-[#14213D]" : "bg-[#ffffff15] text-[#E5E5E5]"}`}
                      >
                        {u.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-bold ${u.is_active ? "bg-[#11998e20] text-[#38ef7d]" : "bg-[#eb334920] text-[#eb3349]"}`}
                      >
                        {u.is_active ? "Faol" : "Bloklangan"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button
                          className={`px-2 py-1 rounded text-[11px] font-bold border-none cursor-pointer ${u.is_active ? "bg-[#eb334920] text-[#eb3349]" : "bg-[#11998e20] text-[#38ef7d]"}`}
                          onClick={() => toggleActive(u.id)}
                        >
                          {u.is_active ? "🚫 Blok" : "✅ Faol"}
                        </button>
                        <button
                          className="px-2 py-1 rounded text-[11px] font-bold border-none cursor-pointer bg-[#FCA31120] text-[#FCA311]"
                          onClick={() => toggleAdmin(u.id)}
                        >
                          {u.is_admin ? "👤 User" : "🔒 Admin"}
                        </button>
                        <button
                          className="px-2 py-1 rounded text-[11px] font-bold border-none cursor-pointer bg-[#eb334920] text-[#eb3349]"
                          onClick={() => deleteUser(u.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === "transactions" && (
        <div className="bg-[#1a2a4a] rounded-[14px] p-4 sm:p-6 border border-[#ffffff10]">
          <h3 className="text-[#FCA311] font-bold mb-4">
            💳 Barcha transactionlar ({transactions.length} ta)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-[900px] lg:w-full border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-[#14213D]">
                  {["ID", "User", "Tur", "Kategoriya", "Summa", "Sana"].map(
                    (h) => (
                      <th
                        key={h}
                        className="p-3 text-left text-[12px] text-[#FCA311] font-semibold border-b border-[#ffffff15]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[#ffffff08] hover:bg-[#14213D] transition-colors"
                  >
                    <td className="p-3 text-sm text-[#E5E5E5]">#{t.id}</td>
                    <td className="p-3 text-sm text-[#E5E5E5] opacity-70">
                      {t.user_email}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-bold ${t.type === "income" ? "bg-[#FCA311] text-[#14213D]" : "bg-[#eb334920] text-[#eb3349]"}`}
                      >
                        {t.type === "income" ? "📈 Kirim" : "📉 Chiqim"}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-[#E5E5E5]">{t.category}</td>
                    <td
                      className={`p-3 text-sm font-bold ${t.type === "income" ? "text-[#FCA311]" : "text-[#eb3349]"}`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {fmt(t.amount)} so'm
                    </td>
                    <td className="p-3 text-sm text-[#E5E5E5] opacity-60">
                      {new Date(t.date).toLocaleDateString("uz-UZ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
