import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "../api/axios";
import toast from "react-hot-toast";
import { CATEGORIES, MONTHS, fmt } from "../constants";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(
    new Date().getFullYear().toString(),
  );

  const [showMenu, setShowMenu] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    type: "income",
    category: "",
    description: "",
  });
  const navigate = useNavigate();

  const loadAll = useCallback(async () => {
    try {
      const [sumRes, chartRes, transRes] = await Promise.all([
        api.get("/api/dashboard/summary"),
        api.get("/api/dashboard/monthly-summary"),
        api.get("/api/transactions/"),
      ]);

      const s = sumRes.data;
      setSummary({
        balance: s.balance ?? 0,
        this_month: {
          income: s.this_month?.kirim ?? s.this_month?.income ?? 0,
          expense: s.this_month?.chiqim ?? s.this_month?.expense ?? 0,
          savings: s.this_month?.hozirgi_summa ?? s.this_month?.savings ?? 0,
        },
        all_time: {
          income: s.all_time?.kirim ?? s.all_time?.income ?? 0,
          expense: s.all_time?.chiqim ?? s.all_time?.expense ?? 0,
          savings: s.all_time?.hozirgi_summa ?? s.all_time?.savings ?? 0,
        },
      });

      const chartData = chartRes.data
        .map((m) => ({
          month_name: m.oy_name || m.month_name || `${m.oy}-oy`,
          income: m.kirim ?? m.income ?? 0,
          expense: m.chiqim ?? m.expense ?? 0,
        }))
        .filter((m) => m.income > 0 || m.expense > 0);

      setMonthlyChart(
        chartData.length > 0
          ? chartData
          : chartRes.data.slice(-6).map((m) => ({
              month_name: m.oy_name || m.month_name || `${m.oy}-oy`,
              income: m.kirim ?? m.income ?? 0,
              expense: m.chiqim ?? m.expense ?? 0,
            })),
      );

      setTransactions(transRes.data);
    } catch (err) {
      console.error("Xato:", err);
      toast.error("Ma'lumot yuklanmadi!");
    }
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    loadAll();
  }, [loadAll]);

  const loadTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append("type", filterType);
      if (filterMonth) params.append("month", filterMonth);
      if (filterYear) params.append("year", filterYear);
      const res = await api.get(`/api/transactions/?${params}`);
      setTransactions(res.data);
    } catch (err) {
      console.error("Transactionlar xatosi:", err);
      toast.error("Transactionlar yuklanmadi!");
    }
  }, [filterType, filterMonth, filterYear]);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    loadAll();
    loadTransactions();
  }, [loadAll, loadTransactions]);

  const openAddForm = () => {
    setEditId(null);
    setForm({ amount: "", type: "income", category: "", description: "" });
    setShowForm(true);
  };

  const openEditForm = (t) => {
    setEditId(t.id);
    setForm({
      amount: t.amount.toString(),
      type: t.type,
      category: t.category,
      description: t.description || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ amount: "", type: "income", category: "", description: "" });
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editId) {
        await api.put(`/api/transactions/${editId}`, payload);
        toast.success("Yangilandi! ✅");
      } else {
        await api.post("/api/transactions/", payload);
        toast.success("Qo'shildi! ✅");
      }
      closeForm();
      loadAll();
      loadTransactions();
    } catch (err) {
      console.error("Transaction saqlash xatosi:", err);
      toast.error(err.response?.data?.detail || "Xato yuz berdi!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.delete(`/api/transactions/${id}`);
      toast.success("O'chirildi!");
      loadAll();
      loadTransactions();
    } catch (err) {
      console.error("Transaction o'chirish xatosi:", err);
      toast.error(err.response?.data?.detail || "Xato!");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const sendMonthlyReport = async () => {
    try {
      await api.post("/api/dashboard/send-monthly-report");
      toast.success("Hisobot emailingizga yuborildi! 📧");
    } catch (err) {
      console.error("Hisobot xatosi:", err);
      toast.error("Xato!");
    }
  };

  const downloadMonthlyPDF = async () => {
    try {
      const now = new Date();
      const res = await api.get(
        `/api/dashboard/export/monthly-pdf?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `hisobot_${now.getMonth() + 1}_${now.getFullYear()}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF yuklandi! 📄");
    } catch (err) {
      console.error("PDF xatosi:", err);
      toast.error("PDF yaratishda xato!");
    }
  };

  const downloadAllPDF = async () => {
    try {
      const res = await api.get("/api/dashboard/export/all-pdf", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "barcha_transactionlar.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF yuklandi! 📄");
    } catch (err) {
      console.error("PDF xatosi:", err);
      toast.error("PDF yaratishda xato!");
    }
  };

  return (
    <div className="min-h-screen bg-[#14213D] p-5 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-[#1a2a4a] px-4 sm:px-7 py-4 rounded-[14px] mb-4 shadow-[0_2px_12px_rgba(0,0,0,0.3)] border border-[#ffffff10]">
        <h2 className="m-0 text-[18px] sm:text-[22px] text-[#FCA311] font-bold">
          💰 Finance App
        </h2>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-5 flex-wrap">
          {/* <button
            className="px-3 py-2 bg-[#ffffff15] text-[#E5E5E5] border border-[#ffffff30] rounded-lg font-bold text-sm cursor-pointer hover:bg-[#FCA311] hover:text-[#14213D] transition-all"
            onClick={downloadMonthlyPDF}
          >
            📄 Oylik PDF
          </button>
          <button
            className="px-3 py-2 bg-[#ffffff15] text-[#E5E5E5] border border-[#ffffff30] rounded-lg font-bold text-sm cursor-pointer hover:bg-[#FCA311] hover:text-[#14213D] transition-all"
            onClick={downloadAllPDF}
          >
            📄 Barcha PDF
          </button> */}
          <button
            className="px-3 py-2 bg-[#ffffff15] text-[#FCA311] border border-[#FCA311] rounded-lg font-bold text-sm no-underline hover:bg-[#FCA311] hover:text-[#14213D] transition-all"
            onClick={sendMonthlyReport}
          >
            📧 Hisobot
          </button>
          {user?.is_admin && (
            <Link
              to="/admin"
              className="px-3 py-2 bg-[#ffffff15] text-[#FCA311] border border-[#FCA311] rounded-lg font-bold text-sm no-underline hover:bg-[#FCA311] hover:text-[#14213D] transition-all"
            >
              🔒 Admin
            </Link>
          )}
          <Link
            to="/cards"
            className="px-3 py-2 bg-[#ffffff10] text-[#E5E5E5] border border-[#ffffff20] rounded-lg font-bold text-sm no-underline hover:bg-[#FCA311] hover:text-[#14213D] transition-all"
          >
            💳 Kartalarim
          </Link>
          <Link
            to="/account"
            className="px-3 py-2 bg-[#ffffff15] text-[#FCA311] border border-[#FCA311] rounded-lg font-bold text-sm no-underline hover:bg-[#FCA311] hover:text-[#14213D] transition-all"
          >
            👤 {user?.full_name}
          </Link>
          <button
            className="px-3 py-2 bg-[#FCA311] text-[#14213D] border-none rounded-lg cursor-pointer font-bold text-sm hover:opacity-90"
            onClick={openAddForm}
          >
            + Qo'shish
          </button>
          <button
            className="px-3 py-2 bg-transparent text-[#E5E5E5] border-2 border-[#E5E5E5] rounded-lg cursor-pointer font-bold text-sm hover:bg-[#E5E5E5] hover:text-[#14213D] transition-all"
            onClick={handleLogout}
          >
            Chiqish
          </button>
        </div>

        {/* Mobile — burger + qo'shish */}
        <div className="flex md:hidden items-center gap-2">
          <button
            className="px-3 py-2 bg-[#FCA311] text-[#14213D] border-none rounded-lg cursor-pointer font-bold text-sm"
            onClick={openAddForm}
          >
            + Qo'shish
          </button>
          <button
            className="w-10 h-10 bg-[#ffffff15] border border-[#ffffff30] rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1"
            onClick={() => setShowMenu(!showMenu)}
          >
            <span
              className={`block w-5 h-0.5 bg-[#FCA311] transition-all ${showMenu ? "rotate-45 translate-y-1.5" : ""}`}
            ></span>
            <span
              className={`block w-5 h-0.5 bg-[#FCA311] transition-all ${showMenu ? "opacity-0" : ""}`}
            ></span>
            <span
              className={`block w-5 h-0.5 bg-[#FCA311] transition-all ${showMenu ? "-rotate-45 -translate-y-1.5" : ""}`}
            ></span>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {showMenu && (
        <div className="md:hidden bg-[#1a2a4a] rounded-[14px] mb-4 border border-[#ffffff10] overflow-hidden">
          <div className="p-4 border-b border-[#ffffff10] flex items-center gap-3">
            <span className="text-2xl">👤</span>
            <div>
              <p className="text-[#FCA311] font-bold text-sm m-0">
                {user?.full_name}
              </p>
              <p className="text-[#E5E5E5] opacity-50 text-xs m-0">
                {user?.email || ""}
              </p>
            </div>
          </div>
          {[
            {
              label: "📄 Oylik PDF",
              action: () => {
                downloadMonthlyPDF();
                setShowMenu(false);
              },
            },
            {
              label: "📄 Barcha PDF",
              action: () => {
                downloadAllPDF();
                setShowMenu(false);
              },
            },
            {
              label: "📧 Hisobot yuborish",
              action: () => {
                sendMonthlyReport();
                setShowMenu(false);
              },
            },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full text-left px-4 py-3 text-[#E5E5E5] text-sm font-semibold border-b border-[#ffffff08] bg-transparent cursor-pointer hover:bg-[#FCA311] hover:text-[#14213D] transition-all"
              onClick={item.action}
            >
              {item.label}
            </button>
          ))}
          {user?.is_admin && (
            <Link
              to="/admin"
              className="block px-4 py-3 text-[#FCA311] text-sm font-semibold border-b border-[#ffffff08] no-underline hover:bg-[#FCA311] hover:text-[#14213D] transition-all"
              onClick={() => setShowMenu(false)}
            >
              🔒 Admin Panel
            </Link>
          )}
          <Link
            to="/account"
            className="block px-4 py-3 text-[#E5E5E5] text-sm font-semibold border-b border-[#ffffff08] no-underline hover:bg-[#FCA311] hover:text-[#14213D] transition-all"
            onClick={() => setShowMenu(false)}
          >
            👤 Akkaunt
          </Link>
          <button
            className="w-full text-left px-4 py-3 text-[#eb3349] text-sm font-bold bg-transparent cursor-pointer hover:bg-[#eb3349] hover:text-white transition-all"
            onClick={handleLogout}
          >
            🚪 Chiqish
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-[14px] mb-5">
        {[
          {
            label: "💳 Balans",
            value: summary?.balance,
            bg: "bg-[#FCA311]",
            text: "text-[#14213D]",
          },
          {
            label: "📈 Bu oylik kirim",
            value: summary?.this_month?.income,
            bg: "bg-[#1a2a4a]",
            text: "text-[#FFFFFF]",
          },
          {
            label: "📉 Bu oylik chiqim",
            value: summary?.this_month?.expense,
            bg: "bg-[#1a2a4a]",
            text: "text-[#FFFFFF]",
          },
          {
            label: "🏦 Bu oylik tejamkorlik",
            value: summary?.this_month?.savings,
            bg: "bg-[#1a2a4a]",
            text: "text-[#FFFFFF]",
          },
          {
            label: "📊 Jami kirim",
            value: summary?.all_time?.income,
            bg: "bg-[#1a2a4a]",
            text: "text-[#FFFFFF]",
          },
          {
            label: "📊 Jami chiqim",
            value: summary?.all_time?.expense,
            bg: "bg-[#1a2a4a]",
            text: "text-[#FFFFFF]",
          },
        ].map((c, i) => (
          <div
            key={i}
            className={`p-5 px-4 rounded-[14px] ${c.bg} border border-[#ffffff10] shadow-[0_4px_15px_rgba(0,0,0,0.2)]`}
          >
            <p className={`text-[12px] opacity-80 m-0 mb-2 ${c.text}`}>
              {c.label}
            </p>
            <p className={`text-[18px] font-bold m-0 ${c.text}`}>
              {fmt(c.value)} so'm
            </p>
          </div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* BAR CHART */}
        <div className="bg-[#1a2a4a] rounded-[14px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-[#ffffff10]">
          <h3 className="m-0 mb-4 text-[#FCA311] text-[16px] font-semibold">
            📊 Oylik kirim/chiqim
          </h3>
          {monthlyChart.length > 0 ? (
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height={260} minWidth={0}>
                <BarChart
                  data={monthlyChart}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis
                    dataKey="month_name"
                    tick={{ fontSize: 12, fill: "#E5E5E5" }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    tick={{ fontSize: 11, fill: "#E5E5E5" }}
                  />
                  <Tooltip
                    formatter={(v) => `${v.toLocaleString()} so'm`}
                    contentStyle={{
                      background: "#14213D",
                      border: "1px solid #FCA311",
                      borderRadius: "8px",
                      color: "#E5E5E5",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#E5E5E5" }} />
                  <Bar
                    dataKey="expense"
                    name="Chiqim"
                    fill="#ff4757"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="income"
                    name="Kirim"
                    fill="#FCA311"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-10 text-[#E5E5E5] opacity-50">
              📭 Ma'lumot yo'q
            </div>
          )}
        </div>

        {/* CATEGORY LIST */}
        <div className="bg-[#1a2a4a] rounded-[14px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-[#ffffff10]">
          <h3 className="m-0 mb-4 text-[#FCA311] text-[16px] font-semibold">
            🍕 Chiqim kategoriyalar
          </h3>
          {summary?.all_time?.expense > 0 ? (
            <div className="flex flex-col gap-[10px]">
              {Object.entries(
                transactions
                  .filter((t) => t.type === "expense")
                  .reduce((acc, t) => {
                    acc[t.category] = (acc[t.category] || 0) + t.amount;
                    return acc;
                  }, {}),
              ).map(([cat, total], i) => {
                const percent = summary.all_time.expense
                  ? Math.round((total / summary.all_time.expense) * 100)
                  : 0;
                const colors = [
                  "#FCA311",
                  "#ff4757",
                  "#E5E5E5",
                  "#38ef7d",
                  "#764ba2",
                  "#ffd200",
                  "#f45c43",
                  "#11998e",
                ];
                return (
                  <div
                    key={i}
                    className="flex justify-between items-center p-[10px_14px] bg-[#14213D] rounded-lg border border-[#ffffff08]"
                  >
                    <div className="flex items-center gap-[10px]">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: colors[i % colors.length] }}
                      />
                      <span className="font-semibold text-[#E5E5E5]">
                        {cat}
                      </span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <span className="text-[#E5E5E5] opacity-70 text-sm">
                        {fmt(total)} so'm
                      </span>
                      <span className="bg-[#FCA311] text-[#14213D] px-2 py-[2px] rounded-[20px] text-[12px] font-bold">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-[#E5E5E5] opacity-50">
              📭 Ma'lumot yo'q
            </div>
          )}
        </div>
      </div>

      {/* TRANSACTIONS */}
      <div className="bg-[#1a2a4a] rounded-[14px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.2)] overflow-x-auto border border-[#ffffff10]">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 flex-wrap gap-[10px]">
          <h3 className="m-0 text-[#FCA311] text-[16px] font-semibold">
            🔍 Amaliyotlar
          </h3>
          <div className="flex gap-4 flex-wrap">
            <select
              className="px-[16px] rounded-lg border border-[#ffffff20] text-sm outline-none bg-[#14213D] text-[#E5E5E5]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Hammasi</option>
              <option value="income">Kirim</option>
              <option value="expense">Chiqim</option>
            </select>
            <select
              className="p-[8px_12px] rounded-lg border border-[#ffffff20] text-sm outline-none bg-[#14213D] text-[#E5E5E5]"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="">Barcha oylar</option>
              {MONTHS.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input
              className="p-[8px_12px] rounded-lg border border-[#ffffff20] text-sm outline-none w-20 bg-[#14213D] text-[#E5E5E5]"
              type="number"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            />
            <button
              className="px-[18px] py-2 bg-[#FCA311] text-[#14213D] rounded-lg font-semibold cursor-pointer border-none hover:opacity-90"
              onClick={loadTransactions}
            >
              Filter
            </button>
            <button
              className="px-[18px] py-2 bg-transparent text-[#E5E5E5] border border-[#E5E5E5] rounded-lg font-semibold cursor-pointer hover:bg-[#E5E5E5] hover:text-[#14213D] transition-all"
              onClick={() => {
                setFilterType("");
                setFilterMonth("");
                setFilterYear(new Date().getFullYear().toString());
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <table className="w-[900px] lg:w-full border-collapse">
          <thead>
            <tr className="bg-[#14213D]">
              {["Sana", "Tur", "Kategoriya", "Izoh", "Summa", "Amal"].map(
                (h) => (
                  <th
                    key={h}
                    className="p-[12px_16px] text-left text-[13px] text-[#FCA311] font-semibold border-b border-[#ffffff15]"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-[#E5E5E5] opacity-50"
                >
                  📭 Ma'lumot yo'q
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-[#ffffff08] hover:bg-[#14213D] transition-colors"
                >
                  <td className="p-[12px_16px] text-sm text-[#E5E5E5]">
                    {new Date(t.date).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="p-[12px_16px]">
                    <span
                      className={`px-2 py-1 rounded-[20px] text-[12px] font-bold ${t.type === "income" ? "bg-[#FCA311] text-[#14213D]" : "bg-[#ff475720] text-[#ff4757]"}`}
                    >
                      {t.type === "income" ? "📈 Kirim" : "📉 Chiqim"}
                    </span>
                  </td>
                  <td className="p-[12px_16px] text-sm text-[#E5E5E5]">
                    {t.category}
                  </td>
                  <td className="p-[12px_16px] text-sm text-[#E5E5E5] opacity-70">
                    {t.description || "-"}
                  </td>
                  <td
                    className={`p-[12px_16px] text-sm font-bold ${t.type === "income" ? "text-[#FCA311]" : "text-[#ff4757]"}`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {fmt(t.amount)} so'm
                  </td>
                  <td className="p-[12px_16px]">
                    <div className="flex items-center gap-2">
                      <button
                        className="bg-transparent border-none cursor-pointer text-base opacity-50 hover:opacity-100 transition-opacity"
                        onClick={() => openEditForm(t)}
                        title="Tahrirlash"
                      >
                        ✏️
                      </button>
                      <button
                        className="bg-transparent border-none cursor-pointer text-base opacity-50 hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(t.id)}
                        title="O'chirish"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]"
          onClick={closeForm}
        >
          <div
            className="bg-[#1a2a4a] rounded-2xl p-8 w-[400px] shadow-[0_25px_50px_rgba(0,0,0,0.5)] border border-[#FCA311]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 mb-6 text-xl text-[#FCA311] font-bold">
              {editId ? "✏️ Transactionni tahrirlash" : "➕ Yangi transaction"}
            </h3>
            <form onSubmit={handleSubmitTransaction}>
              {[
                { label: "Tur", type: "select", key: "type" },
                { label: "Summa (so'm)", type: "number", key: "amount" },
                { label: "Kategoriya", type: "select", key: "category" },
                { label: "Izoh (ixtiyoriy)", type: "text", key: "description" },
              ].map((f) => (
                <div key={f.key} className="mb-4">
                  <label className="block mb-[6px] font-semibold text-[#E5E5E5] text-sm">
                    {f.label}
                  </label>
                  {f.key === "type" ? (
                    <select
                      className="w-full p-[11px_14px] rounded-lg border border-[#ffffff20] text-[15px] outline-none bg-[#14213D] text-[#E5E5E5]"
                      value={form.type}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value, category: "" })
                      }
                    >
                      <option value="income">📈 Kirim</option>
                      <option value="expense">📉 Chiqim</option>
                    </select>
                  ) : f.key === "category" ? (
                    <select
                      className="w-full p-[11px_14px] rounded-lg border border-[#ffffff20] text-[15px] outline-none bg-[#14213D] text-[#E5E5E5]"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      required
                    >
                      <option value="">Tanlang...</option>
                      {CATEGORIES[form.type].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full p-[11px_14px] rounded-lg border border-[#ffffff20] text-[15px] outline-none bg-[#14213D] text-[#E5E5E5] placeholder:text-[#E5E5E5] placeholder:opacity-30 focus:border-[#FCA311] transition-colors"
                      type={f.type}
                      placeholder={f.key === "amount" ? "500000" : "Izoh..."}
                      value={form[f.key]}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                      min={f.key === "amount" ? "1" : undefined}
                      required={f.key === "amount"}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-3 mt-2">
                <button
                  className="flex-1 px-5 py-[11px] bg-[#FCA311] text-[#14213D] border-none rounded-lg cursor-pointer font-bold hover:opacity-90"
                  type="submit"
                >
                  {editId ? "💾 Saqlash" : "✅ Qo'shish"}
                </button>
                <button
                  className="px-5 py-[11px] bg-transparent text-[#E5E5E5] border-2 border-[#E5E5E5] rounded-lg cursor-pointer font-bold hover:bg-[#E5E5E5] hover:text-[#14213D] transition-all"
                  type="button"
                  onClick={closeForm}
                >
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
