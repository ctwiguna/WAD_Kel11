// Materi: useFetch → tabel "aturan custom hook"
// 1. Nama diawali "use"                 ✅ useFetch
// 2. Memanggil hook bawaan              ✅ useState, useEffect
// 3. Tidak return JSX                   ✅ return { data, loading, error, refetch }
// 4. Hindari duplikasi logic            ✅ semua halaman pakai hook ini

import { useState, useEffect } from "react";
import { getData } from "../API/getData";

export function useFetch(resource, params, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getData(resource, params)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resource, JSON.stringify(params), ...deps]);

  const refetch = () => {
    setLoading(true);
    getData(resource, params)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return { data, loading, error, refetch };
}