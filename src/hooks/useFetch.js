/**
 * useFetch — custom hook sesuai materi (custom hook + useEffect + useState).
 *
 * Dipakai untuk mengambil data: mengembalikan { data, loading, error, refetch }.
 * - `fn`    : fungsi yang mengembalikan Promise (mis. getTransactions)
 * - `deps`  : nilai yang kalau berubah akan memicu pengambilan ulang
 *             (mis. household.id atau filter bulan)
 *
 * Refetch manual (setelah simpan/hapus) cukup panggil `refetch()`.
 */
import { useEffect, useState } from 'react'

export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)

    fn()
      .then((result) => {
        if (!active) return
        setData(result)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(err)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
    // fn tidak dimasukkan ke daftar deps supaya tidak fetch ulang tiap render;
    // pengambilan ulang dikendalikan oleh `deps` dan `refreshKey`.
  }, [...deps, refreshKey])

  function refetch() {
    setRefreshKey((k) => k + 1)
  }

  return { data, loading, error, refetch }
}
