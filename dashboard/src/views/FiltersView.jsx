import { useOutletContext } from "react-router-dom";
import AdvancedFilters from "../components/AdvancedFilters";

export default function FiltersView() {
  const { filters, threshold, setThreshold, isThresholdPending, lowStock } = useOutletContext();
  return (
    <AdvancedFilters
      filters={filters}
      threshold={threshold}
      onThresholdChange={setThreshold}
      isThresholdPending={isThresholdPending}
      lowStock={lowStock}
    />
  );
}
