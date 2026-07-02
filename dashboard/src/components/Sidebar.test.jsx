import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("renders all four navigation destinations", () => {
    render(
      <MemoryRouter initialEntries={["/critical"]}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /resumen general/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pedidos críticos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /filtro específico/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /reportes predictivos/i })).toBeInTheDocument();
  });

  it("marks the active route", () => {
    render(
      <MemoryRouter initialEntries={["/critical"]}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /pedidos críticos/i })).toHaveClass("bg-indigo-600");
  });
});
