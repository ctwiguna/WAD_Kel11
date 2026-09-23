import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import Laporan from "./pages/Laporan";
import Budget from "./pages/Budget";
import Login from "./pages/Login";
import { getData, postData } from "./API/getData";
import { track, getEvents, clearEvents } from "./lib/analytics";
import { storage } from "./lib/storage";

export default function App() {
  const [session, setSession] = useState(null);
  const [household, setHousehold] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [showQA, setShowQA] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getData("session");
      const h = await getData("household");
      if (s) setSession(s);
      if (h) setHousehold(h);
      setBooted(true);
    })();
  }, []);

  const handleLogin = async (s) => {
    setSession(s);
    const existing = await getData("household");
    if (!existing) {
      const h = await postData("household", { name: "Keluarga " + s.name });
      setHousehold(h);
    } else { setHousehold(existing); }
  };

  const handleLogout = () => {
    storage.save("kf.session", null);
    setSession(null); setHousehold(null);
  };

  if (!booted) return <div className="min-h-screen bg-kf-bg flex items-center justify-center">Memuat...</div>;
  if (!session) return <Login onLogin={handleLogin} />;

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard session={session} household={household} />;
      case "transactions": return <Transactions household={household} />;
      case "goals": return <Goals household={household} />;
      case "laporan": return <Laporan household={household} />;
      case "budget": return <Budget household={household} />;
      default: return <Dashboard session={session} household={household} />;
    }
  };

  return (
    <div className="min-h-screen bg-kf-bg relative">
      {/* Floating Controls */}
      <div className="fixed top-4 right-4 z-30 flex gap-2">
        <button onClick={() => setShowQA(!showQA)} className="text-[10px] px-2 py-1 bg-white rounded-full border border-gray-200 shadow-kf">QA</button>
        <button onClick={() => storage.setFailMode(!storage.getFailMode())} className={`text-[10px] px-2 py-1 rounded-full border shadow-kf ${storage.getFailMode() ? 'bg-red-100 text-red-600' : 'bg-white'}`}>
          failMode: {storage.getFailMode() ? 'ON' : 'OFF'}
        </button>
        <button onClick={handleLogout} className="text-[10px] px-2 py-1 bg-white rounded-full border border-gray-200 shadow-kf">Keluar</button>
      </div>

      <main className="pb-28">{renderPage()}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-full shadow-kf-lg flex justify-around items-center py-3 px-2 z-20 border border-gray-100">
        <button onClick={() => setPage("dashboard")} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-full ${page === 'dashboard' ? 'bg-[#2D2D2D] text-white' : 'text-kf-muted'}`}>
          <span className="text-lg"></span><span className="text-[10px] font-semibold">Beranda</span>
        </button>
        <button onClick={() => setPage("transactions")} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-full ${page === 'transactions' ? 'bg-[#2D2D2D] text-white' : 'text-kf-muted'}`}>
          <span className="text-lg">💳</span><span className="text-[10px] font-semibold">Transaksi</span>
        </button>
        <button onClick={() => setPage("transactions")} className="w-14 h-14 bg-kf-primary rounded-full shadow-fab flex items-center justify-center text-white text-3xl font-light -mt-8 border-4 border-kf-bg">
          +
        </button>
        <button onClick={() => setPage("goals")} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-full ${page === 'goals' ? 'bg-[#2D2D2D] text-white' : 'text-kf-muted'}`}>
          <span className="text-lg">⭐</span><span className="text-[10px] font-semibold">Goals</span>
        </button>
        <button onClick={() => setPage("laporan")} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-full ${page === 'laporan' ? 'bg-[#2D2D2D] text-white' : 'text-kf-muted'}`}>
          <span className="text-lg">📊</span><span className="text-[10px] font-semibold">Laporan</span>
        </button>
      </nav>

      {showQA && (
        <div className="fixed top-16 right-2 w-72 max-h-80 overflow-auto bg-black/90 text-green-300 text-xs p-3 rounded-xl z-50">
          <div className="flex justify-between mb-2 border-b border-gray-700 pb-2">
            <span className="font-bold text-white">Analytics</span>
            <button onClick={clearEvents} className="text-red-400">Clear</button>
          </div>
          {getEvents().map((e, i) => (
            <div key={i} className="border-b border-gray-800 py-1">
              <div className="text-yellow-300">{e.event}</div>
              <div className="text-gray-400 truncate">{JSON.stringify(e.payload)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}