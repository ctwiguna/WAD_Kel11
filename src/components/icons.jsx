import React from 'react'
/** Ikon garis 24px, stroke mengikuti currentColor. Tanpa dependensi aset. */
const base={width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,focusable:false}
export function IconHome(p){return <svg {...base} {...p}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>}
export function IconList(p){return <svg {...base} {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>}
export function IconWallet(p){return <svg {...base} {...p}><path d="M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H6a3 3 0 0 0 0 6h13v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M19 10h2v4h-2a2 2 0 0 1 0-4z"/></svg>}
export function IconTarget(p){return <svg {...base} {...p}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m16 8 3-3"/></svg>}
export function IconChart(p){return <svg {...base} {...p}><path d="M4 19V5M4 19h16M8 16v-5M12 16V7M16 16v-3"/></svg>}
export function IconPlus(p){return <svg {...base} {...p}><path d="M12 5v14M5 12h14"/></svg>}
export function IconPencil(p){return <svg {...base} {...p}><path d="m4 16-.8 4.8L8 20l11-11a2.8 2.8 0 0 0-4-4zM13 7l4 4"/></svg>}
export function IconUpload(p){return <svg {...base} {...p}><path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"/></svg>}
