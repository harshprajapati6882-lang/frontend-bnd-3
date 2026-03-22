import { useMemo, useState } from "react";
import type { ApiPanel, ApiService, Bundle } from "../types/order";

interface BundleManagerProps {
  apis: ApiPanel[];
  bundles: Bundle[];
  onAddBundle: (bundle: {
    name: string;
    apiId: string;
    views: string;
    likes: string;
    shares: string;
    saves: string;
  }) => void;
}

function filterServices(services: ApiService[], keywords: string[]) {
  return services.filter((service) => {
    const name = service.name.toLowerCase();
    return keywords.some((keyword) => name.includes(keyword));
  });
}

function getApiServices(apis: ApiPanel[], apiId: string) {
  return apis.find((api) => api.id === apiId)?.services ?? [];
}

export function BundleManager({ apis, bundles, onAddBundle }: BundleManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [apiId, setApiId] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [shares, setShares] = useState("");
  const [saves, setSaves] = useState("");

  const viewOptions = useMemo(
    () => filterServices(getApiServices(apis, apiId), ["view", "views"]),
    [apis, apiId]
  );
  const likeOptions = useMemo(
    () => filterServices(getApiServices(apis, apiId), ["like", "likes"]),
    [apis, apiId]
  );
  const shareOptions = useMemo(
    () => filterServices(getApiServices(apis, apiId), ["share", "shares"]),
    [apis, apiId]
  );
  const saveOptions = useMemo(
    () => filterServices(getApiServices(apis, apiId), ["save", "saves"]),
    [apis, apiId]
  );

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-white">Bundles</h2>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200"
        >
          ➕ Create Bundle
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            if (!apiId) return;
            if (!views.trim() || !likes.trim() || !shares.trim() || !saves.trim()) return;
            onAddBundle({
              name: name.trim(),
              apiId,
              views: views.trim(),
              likes: likes.trim(),
              shares: shares.trim(),
              saves: saves.trim(),
            });
            setName("");
            setApiId("");
            setViews("");
            setLikes("");
            setShares("");
            setSaves("");
            setShowForm(false);
          }}
          className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/30 p-5 md:grid-cols-2"
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bundle Name"
            className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100 md:col-span-2"
          />

          <p className="text-xs uppercase tracking-wide text-slate-500 md:col-span-2">Bundle Creator</p>

          <select
            value={apiId}
            onChange={(event) => {
              setApiId(event.target.value);
              setViews("");
              setLikes("");
              setShares("");
              setSaves("");
            }}
            className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100 md:col-span-2"
          >
            <option value="">Select API Panel</option>
            {apis.map((api) => (
              <option key={`bundle-api-${api.id}`} value={api.id}>
                {api.name}
              </option>
            ))}
          </select>
          <select
            value={views}
            onChange={(event) => setViews(event.target.value)}
            className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100"
          >
            <option value="">Views Service</option>
            {viewOptions.map((service) => (
              <option key={`views-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <select
            value={likes}
            onChange={(event) => setLikes(event.target.value)}
            className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100"
          >
            <option value="">Likes Service</option>
            {likeOptions.map((service) => (
              <option key={`likes-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <select
            value={shares}
            onChange={(event) => setShares(event.target.value)}
            className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100"
          >
            <option value="">Shares Service</option>
            {shareOptions.map((service) => (
              <option key={`shares-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>

          <select
            value={saves}
            onChange={(event) => setSaves(event.target.value)}
            className="rounded-xl border border-slate-700 bg-[#0d1424] px-3 py-2.5 text-sm text-slate-100"
          >
            <option value="">Saves Service</option>
            {saveOptions.map((service) => (
              <option key={`saves-service-${service.id}`} value={service.id}>
                {service.name} ({service.id})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="md:col-span-2 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
          >
            Save Bundle
          </button>
        </form>
      )}

      <div className="space-y-3">
        {bundles.length === 0 && <p className="text-sm text-slate-500">No bundles created yet.</p>}
        {bundles.map((bundle) => (
          <article key={bundle.id} className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <h3 className="text-base font-semibold text-white">{bundle.name}</h3>
            <p className="mt-2 text-sm text-slate-400">
              Panel: <span className="text-slate-200">{apis.find((api) => api.id === bundle.apiId)?.name ?? "Unknown"}</span>
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Views Service: <span className="text-slate-200">{bundle.serviceIds.views}</span>
            </p>
            <p className="text-sm text-slate-400">
              Likes Service: <span className="text-slate-200">{bundle.serviceIds.likes}</span>
            </p>
            <p className="text-sm text-slate-400">
              Shares Service: <span className="text-slate-200">{bundle.serviceIds.shares}</span>
            </p>
            <p className="text-sm text-slate-400">
              Saves Service: <span className="text-slate-200">{bundle.serviceIds.saves}</span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}