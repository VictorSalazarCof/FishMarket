import { useOutletContext } from "react-router-dom";
import CriticalOrders from "../components/CriticalOrders";

export default function CriticalView() {
  const { status, lowStock } = useOutletContext();
  return <CriticalOrders status={status} lowStock={lowStock} />;
}
