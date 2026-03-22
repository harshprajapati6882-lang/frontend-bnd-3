import { BundleManager } from "../components/BundleManager";
import type { ApiPanel, Bundle } from "../types/order";

interface BundlesPageProps {
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

export function BundlesPage({ apis, bundles, onAddBundle }: BundlesPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-7">
      <BundleManager apis={apis} bundles={bundles} onAddBundle={onAddBundle} />
    </div>
  );
}
