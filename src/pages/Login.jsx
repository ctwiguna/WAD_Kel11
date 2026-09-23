import { useState } from "react";
import { postData } from "../API/getData";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name) return;
    const session = await postData("login", { email, name });
    onLogin(session);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-kf-bg p-4">
      <div className="bg-white rounded-2xl shadow-kf-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-kf-text mb-2">KeluargaFin</h1>
        <p className="text-sm text-kf-muted mb-6">Kelola uang rumah tangga tanpa ribet.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-kf-primary" placeholder="Nama kamu" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-kf-primary" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="w-full bg-kf-primary text-white py-3 rounded-xl font-semibold shadow-kf">Masuk</button>
        </form>
      </div>
    </div>
  );
}