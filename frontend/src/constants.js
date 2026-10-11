export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const CATEGORIES = {
  income: ["Maosh", "Freelance", "Biznes", "Investitsiya", "Sovg'a", "Boshqa"],
  expense: [
    "Oziq-ovqat",
    "Transport",
    "Uy-joy",
    "Kiyim",
    "Sog'liq",
    "Ta'lim",
    "Ko'ngilochar",
    "Boshqa",
  ],
};

export const MONTHS = [
  "",
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

export const fmt = (n) => (Number(n) || 0).toLocaleString("uz-UZ");
