import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FilterBar from "./FilterBar";

const baseFilters = { startDate: "2025-01-01", endDate: "2025-01-31", groupBy: "day", activePreset: 30 };

describe("FilterBar", () => {
  it("clamps endDate forward when startDate is moved past it", () => {
    const onChange = vi.fn();
    render(<FilterBar filters={baseFilters} onChange={onChange} onRefresh={vi.fn()} loading={false} />);

    fireEvent.change(screen.getByLabelText(/desde/i), { target: { value: "2025-02-15" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: "2025-02-15", endDate: "2025-02-15" }),
    );
  });

  it("calls onRefresh when the Actualizar button is clicked", () => {
    const onRefresh = vi.fn();
    render(<FilterBar filters={baseFilters} onChange={vi.fn()} onRefresh={onRefresh} loading={false} />);

    fireEvent.click(screen.getByRole("button", { name: /actualizar/i }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
