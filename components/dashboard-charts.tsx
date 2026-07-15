"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { month: "Feb", revenue: 0, profit: 0 }, { month: "Mar", revenue: 150, profit: 48 }, { month: "Apr", revenue: 300, profit: 92 },
  { month: "May", revenue: 150, profit: 41 }, { month: "Jun", revenue: 450, profit: 137 }, { month: "Jul", revenue: 600, profit: 188 },
];

export function DashboardChart() {
  return <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ left: -20, right: 8, top: 15 }}><defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#176b5b" stopOpacity={0.25}/><stop offset="100%" stopColor="#176b5b" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2d7"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#78716c" }}/><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#78716c" }}/><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4dfd5" }}/><Area type="monotone" dataKey="revenue" stroke="#176b5b" strokeWidth={2.5} fill="url(#rev)"/><Area type="monotone" dataKey="profit" stroke="#e16a4a" strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer></div>;
}
