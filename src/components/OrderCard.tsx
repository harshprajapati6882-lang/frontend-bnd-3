import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CreatedOrder, OrderStatus } from "../types/order";
import { RunTable } from "./RunTable";

interface OrderCardProps {
  order: CreatedOrder;
  onControl: (order: CreatedOrder, action: "pause" | "resume" | "cancel") => void;
  controlBusy: boolean;
}

const statusColor: Record<OrderStatus, string> = {
  running: "text-emerald-300",
  paused: "text-amber-300",
  cancelled: "text-rose-300",
  completed: "text-cyan-300",
  processing: "text-emerald-300",
  failed: "text-rose-300",
};

export function OrderCard({ order, onControl, controlBusy }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const finishTime = useMemo(() => order.runs[order.runs.length - 1]?.at, [order.runs]);
  const totalRuns = Math.max(1, order.runs.length);
  const completedRuns = Math.min(totalRuns, Math.max(0, order.completedRuns));
  const progressPercent = Math.round((completedRuns / totalRuns) * 100);
  const effectiveStatus = order.status === "processing" ? "running" : order.status;
  const shortLink =
    order.link.length > 56 ? `${order.link.slice(0, 36)}...${order.link.slice(-14)}` : order.link;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Order ID</p>
          <h3 className="text-lg font-semibold text-white">{order.id}</h3>
          <p className="text-sm text-cyan-200">{order.name || `Order #${order.id}`}</p>
          <p className="max-w-xl truncate text-sm text-slate-400" title={order.link || "No link provided"}>
            {shortLink || "No link provided"}
          </p>
        </div>
        <div className="space-y-2 text-right">
          <p className="text-sm text-slate-400">Panel Order ID: <span className="font-semibold text-cyan-200">{order.smmOrderId}</span></p>
          <p className="text-sm text-slate-400">Service: <span className="font-semibold text-slate-100">{order.serviceId}</span></p>
          <p className="text-sm text-slate-400">Quantity: <span className="font-semibold text-slate-100">{order.totalViews}</span></p>
          <p className="text-sm text-slate-400">Status: <span className={`font-semibold ${statusColor[effectiveStatus]}`}>{effectiveStatus}</span></p>
            {order.errorMessage && <p className="text-xs text-rose-300">Error: {order.errorMessage}</p>}
          {finishTime && <p className="text-xs text-slate-500">Finish ETA: {finishTime.toLocaleString()}</p>}
          <p className="text-xs text-slate-500">Last Update: {new Date(order.lastUpdatedAt || order.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Progress</span>
          <span>{progressPercent}% ({completedRuns}/{totalRuns} runs)</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-cyan-400/80 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={controlBusy || effectiveStatus !== "running"}
          onClick={() => onControl(order, "pause")}
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pause
        </button>
        <button
          type="button"
          disabled={controlBusy || effectiveStatus !== "paused"}
          onClick={() => onControl(order, "resume")}
          className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Resume
        </button>
        <button
          type="button"
          disabled={controlBusy || effectiveStatus === "cancelled" || effectiveStatus === "completed"}
          onClick={() => onControl(order, "cancel")}
          className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="ml-auto text-sm text-cyan-300 hover:text-cyan-200"
        >
          {expanded ? "Hide Runs" : "View Runs"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <RunTable runs={order.runs} runStatuses={order.runStatuses} runErrors={order.runErrors} mode="logs" />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
