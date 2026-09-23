// Materi: localStorage → load()/save() + kf.failMode
// kf.failMode = flag darurat: kalau true, semua baca tulis localStorage
// dilempar ke console dan return data kosong (buat QA / demo error state)

const KF_KEY = "kf.failMode";

export const storage = {
  load(key, fallback = null) {
    try {
      if (localStorage.getItem(KF_KEY) === "true") return fallback;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },
  save(key, value) {
    try {
      if (localStorage.getItem(KF_KEY) === "true") return false;
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  },
  setFailMode(on) { localStorage.setItem(KF_KEY, on ? "true" : "false"); },
  getFailMode() { return localStorage.getItem(KF_KEY) === "true"; },
};