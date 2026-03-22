import { useMemo, useState } from "react";
import type { CreatedOrder } from "../types/order";
import { OrderCard } from "../components/OrderCard";

interface OrdersPageProps {
  orders: CreatedOrder[];
  notice: string;
  controllingOrderId: string | null;
  onControlOrder: (order: CreatedOrder, action: "pause" | "resume" | "cancel") => void;
  onDismissNotice: () => void;
}

export function OrdersPage({ orders, notice, controllingOrderId, onControlOrder, onDismissNotice }: OrdersPageProps) {
  const [query, setQuery] = useState("");
  const filteredOrders = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return orders;
    return orders.filter(
      (order) => order.name.toLowerCase().includes(value) || order.link.toLowerCase().includes(value)
    );
  }, [orders, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 py-7">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Orders</h2>
        <p className="mt-1 text-sm text-slate-400">Track immediately executed orders and inspect run schedules.</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by order name or link"
          className="w-full rounded-lg border border-slate-700 bg-[#0d1424] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400/40 transition focus:ring-2"
        />
      </div>
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <p>{notice}</p>
          <button type="button" onClick={onDismissNotice} className="text-emerald-100/80 hover:text-emerald-50">
            Dismiss
          </button>
        </div>
      )}
      {filteredOrders.length === 0 && <p className="text-sm text-slate-500">No orders found.</p>}
      {filteredOrders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          controlBusy={controllingOrderId === order.id}
          onControl={onControlOrder}
        />
      ))}
    </div>
  );
}
