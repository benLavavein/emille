import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import {
  GripVertical,
  Plus,
  Trash2,
  Check,
  X,
  ArrowUpDown,
  Store,
} from "lucide-react";

export function meta() {
  return [
    { title: "Shopping List - Emille" },
    { name: "description", content: "Your shopping list" },
  ];
}

export default function ShoppingListPage() {
  const shoppingList = useQuery(api.shoppingList.get);
  const stores = useQuery(api.groceryStores.list);
  const user = useQuery(api.users.getMe);
  const addItem = useMutation(api.shoppingList.addItem);
  const toggleItem = useMutation(api.shoppingList.toggleItem);
  const removeItem = useMutation(api.shoppingList.removeItem);
  const reorderItems = useMutation(api.shoppingList.reorderItems);
  const clearChecked = useMutation(api.shoppingList.clearChecked);
  const setDefaultStore = useMutation(api.users.setDefaultStore);

  const [newItemName, setNewItemName] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [sortByStore, setSortByStore] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Set initial selected store from user default
  const effectiveStoreId = selectedStoreId ?? user?.defaultStoreId ?? null;

  // Get the selected store details
  const selectedStore = stores?.find((s) => s._id === effectiveStoreId);

  // Sort items based on store aisle order if enabled
  const sortedItems = useMemo(() => {
    if (!shoppingList?.items) return [];

    let items = [...shoppingList.items];

    if (sortByStore && selectedStore) {
      // Create a map of section name to order
      const sectionOrderMap = new Map(
        selectedStore.sections.map((s) => [s.name, s.order])
      );

      items.sort((a, b) => {
        const aSection = a.ingredient?.storeSectionName;
        const bSection = b.ingredient?.storeSectionName;
        const aStoreMatches = a.ingredient?.storeId === selectedStore._id;
        const bStoreMatches = b.ingredient?.storeId === selectedStore._id;

        // Items without this store go to bottom
        if (aStoreMatches && !bStoreMatches) return -1;
        if (!aStoreMatches && bStoreMatches) return 1;
        if (!aStoreMatches && !bStoreMatches) return a.order - b.order;

        // Both have this store - sort by section order
        const aOrder = aSection ? sectionOrderMap.get(aSection) ?? 999 : 999;
        const bOrder = bSection ? sectionOrderMap.get(bSection) ?? 999 : 999;

        if (aOrder !== bOrder) return aOrder - bOrder;

        // Same section - maintain original order
        return a.order - b.order;
      });
    }

    return items;
  }, [shoppingList?.items, sortByStore, selectedStore]);

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    await addItem({ name: newItemName.trim() });
    setNewItemName("");
  };

  const handleToggle = async (itemId: string) => {
    await toggleItem({ itemId });
  };

  const handleRemove = async (itemId: string) => {
    await removeItem({ itemId });
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId || sortByStore) return;

    const currentItems = shoppingList?.items || [];
    const draggedIndex = currentItems.findIndex((i) => i.id === draggedItemId);
    const targetIndex = currentItems.findIndex((i) => i.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...currentItems];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    reorderItems({ itemIds: newOrder.map((i) => i.id) });
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId || null);
  };

  const handleSetAsDefault = async () => {
    if (effectiveStoreId) {
      await setDefaultStore({ storeId: effectiveStoreId as any });
    }
  };

  const checkedCount = sortedItems.filter((i) => i.checked).length;
  const uncheckedCount = sortedItems.length - checkedCount;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/"
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-plum">Shopping List</h1>
      </div>

      {/* Store Selector */}
      <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50">
        <div className="flex items-center gap-3 mb-3">
          <Store className="w-5 h-5 text-plum" />
          <label className="text-sm font-medium text-plum">Store</label>
        </div>
        <div className="flex gap-3">
          <select
            value={effectiveStoreId || ""}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-blush/50 bg-white/60 text-plum focus:outline-none focus:ring-2 focus:ring-plum/30"
          >
            <option value="">No store selected</option>
            {stores?.map((store) => (
              <option key={store._id} value={store._id}>
                {store.name}
                {user?.defaultStoreId === store._id ? " (default)" : ""}
              </option>
            ))}
          </select>
          {effectiveStoreId && user?.defaultStoreId !== effectiveStoreId && (
            <Button variant="outline" size="sm" onClick={handleSetAsDefault}>
              Set as default
            </Button>
          )}
        </div>

        {effectiveStoreId && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setSortByStore(!sortByStore)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                sortByStore
                  ? "bg-plum text-white"
                  : "bg-blush/30 text-plum hover:bg-blush/50"
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort by aisle order
            </button>
          </div>
        )}
      </div>

      {/* Add Item */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddItem();
            }
          }}
          placeholder="Add an item..."
          className="flex-1 px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
        />
        <Button onClick={handleAddItem} disabled={!newItemName.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* List Stats */}
      {sortedItems.length > 0 && (
        <div className="flex items-center justify-between mb-4 text-sm text-mauve">
          <span>
            {uncheckedCount} item{uncheckedCount !== 1 ? "s" : ""} remaining
          </span>
          {checkedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearChecked()}
              className="text-mauve hover:text-destructive"
            >
              Clear {checkedCount} checked
            </Button>
          )}
        </div>
      )}

      {/* Shopping List */}
      {shoppingList === undefined ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading...</p>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <svg
            className="w-16 h-16 mx-auto text-blush mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-plum mb-2">
            Your list is empty
          </h2>
          <p className="text-mauve mb-4">
            Add items manually or from a meal plan
          </p>
          <Link
            to="/meal-plan"
            className="text-plum hover:underline font-medium"
          >
            Go to meal plan
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              draggable={!sortByStore}
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border transition-all ${
                item.checked
                  ? "border-blush/30 opacity-60"
                  : "border-blush/50"
              } ${
                draggedItemId === item.id ? "opacity-50 shadow-lg" : ""
              } ${!sortByStore ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
              {!sortByStore && (
                <GripVertical className="w-5 h-5 text-mauve/50 shrink-0" />
              )}

              <button
                onClick={() => handleToggle(item.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  item.checked
                    ? "bg-plum border-plum text-white"
                    : "border-blush/50 bg-white/60 hover:border-plum/50"
                }`}
              >
                {item.checked && <Check className="w-4 h-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <span
                  className={`font-medium ${
                    item.checked ? "text-mauve line-through" : "text-plum"
                  }`}
                >
                  {item.name}
                </span>
                {sortByStore && item.ingredient?.storeSectionName && (
                  <span className="ml-2 text-xs text-mauve/70">
                    ({item.ingredient.storeSectionName})
                  </span>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(item.id)}
                className="h-8 w-8 text-mauve/50 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
