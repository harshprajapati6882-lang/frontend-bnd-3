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

  // ✅ SAFE PLAN (prevents crash)
  const plan = useMemo(() => {
    try {
      const result = createPatternPlan(config);
      return result && result.runs ? result : { runs: [] };
    } catch (e) {
      console.error("Pattern error:", e);
      return { runs: [] };
    }
  }, [config, seed]);

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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-semibold text-white">New Order</h2>
      </motion.div>

      <OrderForm
        orderName={orderName}
        postUrl={postUrl}
        totalViews={totalViews}
        selectedApiId={selectedApiId}
        selectedBundleId={selectedBundleId}
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
        onTotalViewsChange={(v) => setTotalViews(Math.max(0, Math.floor(v)))}
        onSelectedApiChange={setSelectedApiId}
        onSelectedBundleChange={setSelectedBundleId}
        onStartDelayHoursChange={setStartDelayHours}
        onVarianceChange={setVariancePercent}
        onToggleLikes={setIncludeLikes}
        onToggleShares={setIncludeShares}
        onToggleSaves={setIncludeSaves}
        onPeakHoursChange={setPeakHoursBoost}
        onDeliveryChange={setDelivery}
        onCustomHoursChange={setCustomHours}
      />

      <GrowthGraph plan={plan} />

      <button
        disabled={isCreatingOrder}
        onClick={async () => {
          setCreateError("");
          setCreateSuccess("");

          const selectedApi = apis.find((a) => a.id === selectedApiId);
          const selectedBundle = bundles.find((b) => b.id === selectedBundleId);

          if (!selectedApi || !selectedBundle) {
            setCreateError("Missing API or bundle");
            return;
          }

          const viewRuns = (plan.runs || []).map((run) => ({
            time: run.at.toISOString(),
            quantity: Math.floor(run.views),
          }));

          // ✅ FINAL SAFE LOGIC

          const likesRuns = (plan.runs || []).map((run) => ({
            time: run.at.toISOString(),
            quantity: run.likes >= 10 ? Math.floor(run.likes) : 0,
          }));

          const sharesRuns = (plan.runs || []).map((run) => ({
            time: run.at.toISOString(),
            quantity: run.shares >= 20 ? Math.floor(run.shares) : 0,
          }));

          const savesRuns = (plan.runs || []).map((run, index) => ({
            time: run.at.toISOString(),
            quantity: index !== 0 && run.saves >= 10 ? Math.floor(run.saves) : 0,
          }));

          try {
            await createSmmOrder({
              apiUrl: selectedApi.url,
              apiKey: selectedApi.key,
              link: postUrl,
              services: {
                views: {
                  serviceId: selectedBundle.serviceIds.views,
                  runs: viewRuns,
                },
                likes: includeLikes
                  ? { serviceId: selectedBundle.serviceIds.likes, runs: likesRuns }
                  : undefined,
                shares: includeShares
                  ? { serviceId: selectedBundle.serviceIds.shares, runs: sharesRuns }
                  : undefined,
                saves: includeSaves
                  ? { serviceId: selectedBundle.serviceIds.saves, runs: savesRuns }
                  : undefined,
              },
            });

            setCreateSuccess("Order created successfully");
          } catch (e) {
            setCreateError("Failed to create order");
          }
        }}
        className="bg-cyan-500 text-white px-4 py-2 rounded"
      >
        {isCreatingOrder ? "Creating..." : "Create Order"}
      </button>

      {createError && <p className="text-red-400">{createError}</p>}
      {createSuccess && <p className="text-green-400">{createSuccess}</p>}
    </div>
  );
}
