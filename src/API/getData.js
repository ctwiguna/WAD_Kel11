// Materi: folder API/getData → siap diganti axios
// Saat ini belum ada backend, jadi kita "simulasi" dengan localStorage.
// Struktur fungsi dibuat sama persis seperti kalau nanti pakai axios,
// supaya tinggal ganti isi dalam tanpa ubah pemanggil.

import { storage } from "../lib/storage";
import { track } from "../lib/analytics";

const KEY = {
  session: "kf.session",
  household: "kf.household",
  transactions: "kf.transactions",
  categories: "kf.categories",
  budgets: "kf.budgets",
  goals: "kf.goals", // TAMBAHAN BARU
};

const fakeLatency = (ms = 100) => new Promise((res) => setTimeout(res, ms));

export async function getData(resource, params = {}) {
  track("api.request", { resource });
  await fakeLatency();

  switch (resource) {
    case "session": return storage.load(KEY.session, null);
    case "household": return storage.load(KEY.household, null);
    case "transactions": {
      const all = storage.load(KEY.transactions, []);
      if (params.memberId) return all.filter((t) => t.memberId === params.memberId);
      return all;
    }
    case "categories":
      return storage.load(KEY.categories, [
        { id: "c_makan", name: "Makan", icon: "🍽️" },
        { id: "c_transport", name: "Transport", icon: "🚗" },
        { id: "c_belanja", name: "Belanja", icon: "🛒" },
        { id: "c_tagihan", name: "Tagihan", icon: "💡" },
        { id: "c_anak", name: "Anak", icon: "🧸" },
        { id: "c_hiburan", name: "Hiburan", icon: "🎬" },
        { id: "c_kesehatan", name: "Kesehatan", icon: "💊" },
      ]);
    case "budgets": return storage.load(KEY.budgets, []);
    case "goals": return storage.load(KEY.goals, []); // TAMBAHAN BARU
    default: throw new Error("Resource tidak dikenal: " + resource);
  }
}

export async function postData(resource, body) {
  track("api.mutate", { resource });
  await fakeLatency();

  if (resource === "login") {
    const session = { userId: "u_" + Date.now(), email: body.email, name: body.name, role: "owner" };
    storage.save(KEY.session, session);
    return session;
  }

  if (resource === "household") {
    const hh = {
      id: "hh_" + Date.now(), name: body.name, currency: "IDR",
      members: [
        { id: "m_ayah", name: "Ayah", role: "owner" },
        { id: "m_ibu", name: "Ibu", role: "co-manager" },
        { id: "m_anak", name: "Anak", role: "dependent" },
      ],
    };
    storage.save(KEY.household, hh);
    return hh;
  }

  if (resource === "transaction") {
    const all = storage.load(KEY.transactions, []);
    const next = [...all, { id: "t_" + Date.now(), ...body, createdAt: new Date().toISOString() }];
    storage.save(KEY.transactions, next);
    return body;
  }

  if (resource === "budget") {
    const all = storage.load(KEY.budgets, []);
    const next = [...all, { id: "b_" + Date.now(), ...body }];
    storage.save(KEY.budgets, next);
    return body;
  }

  // TAMBAHAN BARU UNTUK GOALS
  if (resource === "goal") {
    const all = storage.load(KEY.goals, []);
    const next = [...all, { id: "g_" + Date.now(), ...body, current: 0, createdAt: new Date().toISOString() }];
    storage.save(KEY.goals, next);
    return body;
  }

  if (resource === "goal-contribution") {
    const all = storage.load(KEY.goals, []);
    const goal = all.find((g) => g.id === body.goalId);
    if (goal) {
      goal.current = (goal.current || 0) + body.amount;
      storage.save(KEY.goals, all);
    }
    return body;
  }

  throw new Error("postData: resource tidak dikenal " + resource);
}