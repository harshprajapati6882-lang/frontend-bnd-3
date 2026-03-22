import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GrowthGraph } from "../components/GrowthGraph";
import { OrderForm } from "../components/OrderForm";
import { PatternGenerator } from "../components/PatternGenerator";
import type { ApiPanel, Bundle, CreatedOrder, DeliveryOption, OrderConfig, QuickPatternPreset } from "../types/order";
import { createSmmOrder } from "../utils/api";
import { createPatternPlan } from "../utils/patterns";

interface NewOrderPageProps {
  apis: ApiPanel[];
  bundles: Bundle[];
  onCreateOrder: (order: CreatedOrder) => void;
  onNavigateToOrders: (notice?: string) => void;
}

function createOrderId() {
  return `ORD-${Date.now().toString().slice(-6)}`;
}

export function NewOrderPage({ apis, bundles, onCreateOrder, onNavigateToOrders }: NewOrderPageProps) {
  const [orderName, setOrderName] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [totalViews, setTotalViews] = useState(50000);
  const [selectedApiId, setSelectedApiId] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [startDelayHours, setStartDelayHours] = useState(0);
  const [includeLikes, setIncludeLikes] = useState(true);
  const [includeShares, setIncludeShares] = useState(true);
  const [includeSaves, setIncludeSaves] = useState(true);
  const [variancePercent, setVariancePercent] = useState(40);
  const [peakHoursBoost, setPeakHoursBoost] = useState(false);
  const [quickPreset, setQuickPreset] = useState<QuickPatternPreset | null>(null);
  const [customHours, setCustomHours] = useState(30);
  const [delivery, setDelivery] = useState<DeliveryOption>({ mode: "auto", hours: 18, label: "Auto" });
  const [seed, setSeed] = useState(0);
  const [expandedRuns, setExpandedRuns] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const config: OrderConfig = useMemo(
    () => ({
      postUrl,
      totalViews,
      startDelayHours,
      includeLikes,
      includeShares,
      includeSaves,
      variancePercent,
      peakHoursBoost,
      quickPreset,
      delivery:
        delivery.mode === "custom"
          ? { ...delivery, hours: customHours, label: "Custom" }
          : delivery.mode === "auto"
            ? { ...delivery, hours: Math.max(6, Math.min(48, delivery.hours)) }
            : delivery,
    }),
    [
      postUrl,
      totalViews,
      startDelayHours,
      includeLikes,
      includeShares,
      includeSaves,
      variancePercent,
      peakHoursBoost,
      quickPreset,
      delivery,
      customHours,
    ]
  );

  const plan = useMemo(() => createPatternPlan(config), [config, seed]);
  const bundleOptions = useMemo(() => {
    if (!selectedApiId) return bundles;
    return bundles.filter((bundle) => bundle.apiId === selectedApiId);
  }, [bundles, selectedApiId]);

  function isValidUrl(value: string) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-7">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h2 className="text-2xl font-semibold tracking-tight text-white">New Order</h2>
        <p className="mt-1 text-sm text-slate-400">
          Configure view delivery patterns and engagement distribution. Frontend-only model, ready for API wiring.
        </p>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <OrderForm
          orderName={orderName}
          postUrl={postUrl}
          totalViews={totalViews}
          selectedApiId={selectedApiId}
          selectedBundleId={selectedBundleId}
          apiOptions={apis.map((api) => ({ id: api.id, name: api.name }))}
          bundleOptions={bundleOptions.map((bundle) => ({ id: bundle.id, name: bundle.name }))}
          startDelayHours={startDelayHours}
          variancePercent={variancePercent}
          includeLikes={includeLikes}
          includeShares={includeShares}
          includeSaves={includeSaves}
          peakHoursBoost={peakHoursBoost}
          delivery={delivery}
          customHours={customHours}
          onPostUrlChange={setPostUrl}
          onOrderNameChange={setOrderName}
          onTotalViewsChange={(value) => setTotalViews(Math.max(0, Math.floor(value)))}
          onSelectedApiChange={(apiId) => {
            setSelectedApiId(apiId);
            setSelectedBundleId("");
          }}
          onSelectedBundleChange={setSelectedBundleId}
          onStartDelayHoursChange={(value) => setStartDelayHours(Math.max(0, Math.min(168, Math.floor(value))))}
          onVarianceChange={setVariancePercent}
          onToggleLikes={setIncludeLikes}
          onToggleShares={setIncludeShares}
          onToggleSaves={setIncludeSaves}
          onPeakHoursChange={setPeakHoursBoost}
          onDeliveryChange={(option) => setDelivery(option)}
          onCustomHoursChange={(hours) => {
            setCustomHours(Math.max(1, Math.min(96, hours)));
            setDelivery({ mode: "custom", label: "Custom", hours });
          }}
        />

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <h2 className="text-lg font-semibold text-white">Detection Risk</h2>
            <p className="mt-2 text-sm text-slate-400">Based on variance and delivery speed</p>
            <div className="mt-4 inline-flex rounded-lg border border-slate-700 bg-[#0d1424] px-4 py-2">
              <span
                className={`text-sm font-semibold ${
                  plan.risk === "Safe" ? "text-emerald-300" : plan.risk === "Medium" ? "text-amber-300" : "text-rose-300"
                }`}
              >
                {plan.risk}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Estimated duration: {plan.estimatedDurationHours}h</p>
          </div>

          <PatternGenerator
            plan={plan}
            selectedPreset={quickPreset}
            expandedRuns={expandedRuns}
            onApplyPreset={(preset) => {
              setQuickPreset(preset);
              if (preset === "viral-boost") {
                setVariancePercent(48);
                setDelivery({ mode: "preset", label: "12h", hours: 12 });
              }
              if (preset === "fast-start") {
                setVariancePercent(32);
                setDelivery({ mode: "preset", label: "6h", hours: 6 });
              }
              if (preset === "trending-push") {
                setVariancePercent(40);
                setDelivery({ mode: "preset", label: "24h", hours: 24 });
              }
              if (preset === "slow-burn") {
                setVariancePercent(22);
                setDelivery({ mode: "preset", label: "48h", hours: 48 });
              }
              setSeed((current) => current + 1);
              setExpandedRuns(false);
            }}
            onToggleRuns={() => setExpandedRuns((prev) => !prev)}
            onGenerate={() => {
              setSeed((current) => current + 1);
              setExpandedRuns(false);
            }}
          />
        </div>
      </div>

      <GrowthGraph plan={plan} />

      <div className="flex flex-wrap items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
        <p className="text-sm text-slate-400">Create order will store the current plan, schedule, and engagement data.</p>
        <button
          type="button"
          disabled={isCreatingOrder}
          onClick={async () => {
            setCreateError("");
            setCreateSuccess("");
            if (!selectedBundleId) {
              setCreateError("Select a bundle before creating an order.");
              return;
            }
            const trimmedUrl = postUrl.trim();
            if (!trimmedUrl) {
              setCreateError("Add a post URL before creating an order.");
              return;
            }
            if (!isValidUrl(trimmedUrl)) {
              setCreateError("Enter a valid post URL before creating an order.");
              return;
            }

            const selectedApi = apis.find((api) => api.id === selectedApiId) ?? null;
            if (!selectedApi) {
              setCreateError("Select an API before creating an order.");
              return;
            }
            if (!selectedApi.url.trim()) {
              setCreateError("API URL is required.");
              return;
            }
            if (!isValidUrl(selectedApi.url.trim())) {
              setCreateError("API URL must be a valid URL.");
              return;
            }
            if (!selectedApi.key.trim()) {
              setCreateError("API key is required.");
              return;
            }

            const selectedBundle = bundles.find((bundle) => bundle.id === selectedBundleId);
            if (!selectedBundle) {
              setCreateError("Selected bundle is missing. Please pick a valid bundle.");
              return;
            }
            const viewsServiceId = selectedBundle.serviceIds.views.trim();
            if (!viewsServiceId) {
              setCreateError("Selected bundle has no Views service ID.");
              return;
            }
            const likesServiceId = selectedBundle.serviceIds.likes.trim();
            const sharesServiceId = selectedBundle.serviceIds.shares.trim();
            const savesServiceId = selectedBundle.serviceIds.saves.trim();
            if (includeLikes && !likesServiceId) {
              setCreateError("Selected bundle has no Likes service ID.");
              return;
            }
            if (includeShares && !sharesServiceId) {
              setCreateError("Selected bundle has no Shares service ID.");
              return;
            }
            if (includeSaves && !savesServiceId) {
              setCreateError("Selected bundle has no Saves service ID.");
              return;
            }

            const quantity = plan.runs.reduce((acc, run) => acc + run.views, 0);
            if (!Number.isFinite(quantity) || quantity <= 0) {
              setCreateError("Quantity must be a valid number greater than 0.");
              return;
            }
            const viewRuns = plan.runs.map((run) => ({
              time: run.at.toISOString(),
              quantity: Math.floor(run.views),
            }));
            if (
              !viewRuns.length ||
              viewRuns.some((run) => !run.time || !Number.isFinite(run.quantity) || run.quantity <= 0)
            ) {
              setCreateError("Run schedule is invalid. Regenerate pattern and try again.");
              return;
            }

            // Preserve run index alignment across services by sending the full run arrays, including zeros.
            const likesRuns = plan.runs.map((run) => ({
              time: run.at.toISOString(),
              quantity: Math.max(0, Math.floor(run.likes)),
            }));
            const sharesRuns = plan.runs.map((run) => ({
              time: run.at.toISOString(),
              quantity: Math.max(0, Math.floor(run.shares)),
            }));
            const savesRuns = plan.runs.map((run) => ({
              time: run.at.toISOString(),
              quantity: Math.max(0, Math.floor(run.saves)),
            }));

            const servicesPayload: {
              views: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
              likes?: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
              shares?: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
              saves?: { serviceId: string; runs: Array<{ time: string; quantity: number }> };
            } = {
              views: {
                serviceId: viewsServiceId,
                runs: viewRuns,
              },
            };

            if (includeLikes) {
              servicesPayload.likes = {
                serviceId: likesServiceId,
                runs: likesRuns,
              };
            }
            if (includeShares) {
              servicesPayload.shares = {
                serviceId: sharesServiceId,
                runs: sharesRuns,
              };
            }
            if (includeSaves) {
              servicesPayload.saves = {
                serviceId: savesServiceId,
                runs: savesRuns,
              };
            }

            setIsCreatingOrder(true);
            try {
              const result = await createSmmOrder({
                name: orderName.trim() || undefined,
                apiUrl: selectedApi.url,
                apiKey: selectedApi.key,
                link: trimmedUrl,
                services: servicesPayload,
              });

              const order: CreatedOrder = {
                id: createOrderId(),
                name: orderName.trim(),
                schedulerOrderId: result.schedulerOrderId,
                smmOrderId: result.orderId ?? "Scheduled",
                link: trimmedUrl,
                totalViews: quantity,
                startDelayHours,
                patternType: plan.patternType,
                patternName: plan.patternName,
                runs: plan.runs,
                engagement: {
                  likes: plan.runs.reduce((acc, run) => acc + run.likes, 0),
                  shares: plan.runs.reduce((acc, run) => acc + run.shares, 0),
                  saves: plan.runs.reduce((acc, run) => acc + run.saves, 0),
                },
                serviceId: viewsServiceId,
                selectedAPI: selectedApi.name,
                selectedBundle: selectedBundle.name,
                status: result.status === "completed" ? "completed" : "running",
                completedRuns: typeof result.completedRuns === "number" ? result.completedRuns : 0,
                runStatuses: plan.runs.map(() => "pending"),
                createdAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
              };

              if (!order.name) {
                order.name = `Order #${order.id}`;
              }

              onCreateOrder(order);
              const successLabel = "Order Scheduled Successfully";
              const notice = result.orderId
                ? `${successLabel}. Provider ID: ${result.orderId}`
                : successLabel;
              setCreateSuccess(successLabel);
              onNavigateToOrders(notice);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Failed to create order";
              const failedOrder: CreatedOrder = {
                id: createOrderId(),
                name: orderName.trim() || "",
                smmOrderId: "N/A",
                link: trimmedUrl,
                totalViews: quantity,
                startDelayHours,
                patternType: plan.patternType,
                patternName: plan.patternName,
                runs: plan.runs,
                engagement: {
                  likes: plan.runs.reduce((acc, run) => acc + run.likes, 0),
                  shares: plan.runs.reduce((acc, run) => acc + run.shares, 0),
                  saves: plan.runs.reduce((acc, run) => acc + run.saves, 0),
                },
                serviceId: viewsServiceId,
                selectedAPI: selectedApi.name,
                selectedBundle: selectedBundle.name,
                status: "failed",
                completedRuns: 0,
                runStatuses: plan.runs.map((_, index) => (index === 0 ? "cancelled" : "pending")),
                runErrors: plan.runs.map((_, index) => (index === 0 ? message : "")),
                errorMessage: message,
                createdAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
              };
              if (!failedOrder.name) {
                failedOrder.name = `Order #${failedOrder.id}`;
              }
              onCreateOrder(failedOrder);
              setCreateError(message);
            } finally {
              setIsCreatingOrder(false);
            }
          }}
          className="rounded-lg border border-cyan-400/70 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreatingOrder ? "Creating..." : "Create Order"}
        </button>
      </div>
      {createError && <p className="text-sm text-rose-300">{createError}</p>}
      {createSuccess && <p className="text-sm text-emerald-300">{createSuccess}</p>}
    </div>
  );
}
