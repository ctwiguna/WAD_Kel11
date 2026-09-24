// getData.js — lapisan data fetching
// Saat ini: ambil dari localStorage (dengan fallback ke mockData)
// Nanti ganti dengan: import axios from 'axios'; dan panggil endpoint FastAPI

import { load, save } from '../utils/localStorage';
import { track } from '../utils/analytics';
import {
  transactions as mockTransactions,
  budgets as mockBudgets,
  goals as mockGoals,
} from '../data/mockData';

// const BASE_URL = 'http://localhost:8000/api'; // aktifkan saat backend siap

// ─── Transactions ────────────────────────────────────────────

export async function getTransactions() {
  track('getData:getTransactions');

  // Nanti ganti dengan:
  // const { data } = await axios.get(`${BASE_URL}/transactions`);
  // return data;

  const cached = load('kf_transactions', null);
  if (cached) return cached;

  await simulateDelay();
  save('kf_transactions', mockTransactions);
  return mockTransactions;
}

export async function postTransaction(txn) {
  track('getData:postTransaction', { merchant: txn.merchant, amount: txn.amount });

  // Nanti ganti dengan:
  // const { data } = await axios.post(`${BASE_URL}/transactions`, txn);
  // return data;

  const current = load('kf_transactions', mockTransactions);
  const updated = [txn, ...current];
  save('kf_transactions', updated);
  return txn;
}

// ─── Budgets ─────────────────────────────────────────────────

export async function getBudgets() {
  track('getData:getBudgets');

  // Nanti ganti dengan:
  // const { data } = await axios.get(`${BASE_URL}/budgets`);
  // return data;

  const cached = load('kf_budgets', null);
  if (cached) return cached;

  await simulateDelay();
  save('kf_budgets', mockBudgets);
  return mockBudgets;
}

export async function putBudget(category, limit) {
  track('getData:putBudget', { category, limit });

  // Nanti ganti dengan:
  // const { data } = await axios.put(`${BASE_URL}/budgets/${category}`, { limit });
  // return data;

  const current = load('kf_budgets', mockBudgets);
  const updated = current.map(b => b.category === category ? { ...b, limit } : b);
  save('kf_budgets', updated);
  return updated;
}

// ─── Goals ───────────────────────────────────────────────────

export async function getGoals() {
  track('getData:getGoals');

  // Nanti ganti dengan:
  // const { data } = await axios.get(`${BASE_URL}/goals`);
  // return data;

  const cached = load('kf_goals', null);
  if (cached) return cached;

  await simulateDelay();
  save('kf_goals', mockGoals);
  return mockGoals;
}

export async function postGoalContribution(goalId, amount) {
  track('getData:postGoalContribution', { goalId, amount });

  // Nanti ganti dengan:
  // const { data } = await axios.post(`${BASE_URL}/goals/${goalId}/contribute`, { amount });
  // return data;

  const current = load('kf_goals', mockGoals);
  const updated = current.map(g =>
    g.id === goalId ? { ...g, current: Math.min(g.current + amount, g.target) } : g
  );
  save('kf_goals', updated);
  return updated;
}

// ─── Helper ──────────────────────────────────────────────────

function simulateDelay(ms = 400) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
