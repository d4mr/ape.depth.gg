import { createFileRoute } from "@tanstack/react-router";
import TrenchesTable from "@/components/trenches-table";
import TokenBalances from "@/components/token-balances";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-2 h-full min-h-0 w-full grid grid-cols-[2fr_1fr] overflow-hidden flex-grow gap-2">
      <TrenchesTable />
      <TokenBalances />
    </div>
  );
}
