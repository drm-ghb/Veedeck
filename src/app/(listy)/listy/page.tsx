import { ShoppingCart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ListyPage() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Listy zakupowe</h1>
          <p className="text-gray-500 mt-1">Twórz i zarządzaj listami zakupowymi dla klientów</p>
        </div>
        <Button className="flex items-center gap-2 sm:self-start">
          <Plus size={16} />
          Nowa lista
        </Button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#19213D]/10 flex items-center justify-center mb-4">
          <ShoppingCart size={28} className="text-[#19213D]" />
        </div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Brak list zakupowych
        </h2>
        <p className="text-sm text-gray-400 max-w-xs">
          Kliknij „Nowa lista" aby stworzyć pierwszą listę zakupową dla swojego klienta.
        </p>
      </div>
    </div>
  );
}
