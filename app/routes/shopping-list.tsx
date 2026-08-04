import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useAction, useQuery, useMutation } from "convex/react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, Modifier } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import { GripVertical, Plus, Check, X, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";

export function meta() {
  return [
    { title: "Shopping List - Emille" },
    { name: "description", content: "Your shopping list" },
  ];
}

function formatQuantity(amount?: number, unit?: string): string | null {
  if (!amount && !unit) return null;
  const parts: string[] = [];
  if (amount != null) {
    parts.push(
      Number.isInteger(amount)
        ? String(amount)
        : amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""),
    );
  }
  if (unit) parts.push(unit);
  return parts.join(" ");
}

type ShoppingItem = {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  checked: boolean;
  order: number;
  mealName?: string;
};

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

function SortableShoppingItem({
  item,
  onToggle,
  onRemove,
  isSorting,
}: {
  item: ShoppingItem;
  onToggle: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  isSorting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const qty = formatQuantity(item.amount, item.unit);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isSorting && transform
          ? CSS.Transform.toString({ ...transform, x: 0 })
          : undefined,
        transition: isSorting ? transition : undefined,
      }}
      className={`relative flex items-center gap-3 py-4 pr-4 pl-16 bg-white/60 backdrop-blur-sm rounded-xl border transition-[opacity,box-shadow,border-color] ${
        item.checked ? "border-blush/30 opacity-60" : "border-blush/50"
      } ${isDragging ? "opacity-30 shadow-lg" : ""}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag ${item.name} to reorder`}
        className="touch-none absolute inset-y-0 left-0 flex w-12 items-center justify-center rounded-l-xl border-r border-blush/30 text-mauve/50 cursor-grab active:cursor-grabbing hover:bg-plum/5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <button
        onClick={() => onToggle(item.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          item.checked
            ? "bg-plum border-plum text-white"
            : "border-blush/50 bg-white/60 hover:border-plum/50"
        }`}
      >
        {item.checked && <Check className="w-4 h-4" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`font-medium ${item.checked ? "text-mauve line-through" : "text-plum"}`}>
            {item.name}
          </span>
          {qty && <span className="text-sm text-mauve/70">{qty}</span>}
        </div>
        {item.mealName && <span className="text-xs text-mauve/60">{item.mealName}</span>}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        className="h-8 w-8 text-mauve/50 hover:text-destructive"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function ShoppingListPage() {
  const shoppingList = useQuery(api.shoppingList.get);
  const addItem = useMutation(api.shoppingList.addItem).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.shoppingList.get, {});
      if (current === undefined || !("_id" in current)) return;
      const newItem = {
        id: crypto.randomUUID(),
        name: args.name,
        amount: args.amount,
        unit: args.unit,
        checked: false,
        order: 0,
      };
      localStore.setQuery(api.shoppingList.get, {}, {
        ...current,
        items: [
          newItem,
          ...current.items.map((item) => ({ ...item, order: item.order + 1 })),
        ],
      });
    },
  );
  const toggleItem = useMutation(api.shoppingList.toggleItem).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.shoppingList.get, {});
      if (current === undefined || !("_id" in current)) return;
      localStore.setQuery(api.shoppingList.get, {}, {
        ...current,
        items: current.items.map((item) =>
          item.id === args.itemId ? { ...item, checked: !item.checked } : item,
        ),
      });
    },
  );
  const removeItem = useMutation(api.shoppingList.removeItem).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.shoppingList.get, {});
      if (current === undefined || !("_id" in current)) return;
      localStore.setQuery(api.shoppingList.get, {}, {
        ...current,
        items: current.items
          .filter((item) => item.id !== args.itemId)
          .map((item, i) => ({ ...item, order: i })),
      });
    },
  );
  const reorderItems = useMutation(api.shoppingList.reorderItems).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.shoppingList.get, {});
      if (current === undefined || !("_id" in current)) return;

      const itemById = new Map(current.items.map((item) => [item.id, item]));
      const reorderedItems = args.itemIds
        .map((id, order) => {
          const item = itemById.get(id);
          return item && { ...item, order };
        })
        .filter((item): item is NonNullable<typeof item> => item !== undefined);

      localStore.setQuery(api.shoppingList.get, {}, {
        ...current,
        items: reorderedItems,
      });
    },
  );
  const clearChecked = useMutation(api.shoppingList.clearChecked);
  const clearAll = useMutation(api.shoppingList.clearAll);
  const organizeWithAi = useAction(api.ai.shoppingListOrder.organize);
  const currentUser = useQuery(api.users.getMe);

  const [newItemName, setNewItemName] = useState("");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const items = useMemo(() => {
    if (!shoppingList?.items) return [];
    return [...shoppingList.items].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return a.order - b.order;
    });
  }, [shoppingList?.items]);

  const handleAddItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    setNewItemName("");
    addItem({ name });
  };

  const handleToggle = (itemId: string) => {
    toggleItem({ itemId });
  };

  const handleRemove = (itemId: string) => {
    removeItem({ itemId });
  };

  const handleOrganize = async () => {
    setIsOrganizing(true);
    setOrganizationError(null);
    try {
      const { itemIds } = await organizeWithAi({});
      const checkedIds = (shoppingList?.items ?? [])
        .filter((item) => item.checked)
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id);
      await reorderItems({ itemIds: [...itemIds, ...checkedIds] });
    } catch (caught) {
      setOrganizationError(
        caught instanceof Error ? caught.message : "Could not organize your shopping list.",
      );
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveItemId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveItemId(null);
    if (!over || active.id === over.id) return;

    const currentItems = shoppingList?.items || [];
    const draggedIndex = currentItems.findIndex((i) => i.id === active.id);
    const targetIndex = currentItems.findIndex((i) => i.id === over.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const draggedItem = currentItems[draggedIndex];
    const targetItem = currentItems[targetIndex];

    // Checked items always render as a separate section at the bottom.
    if (draggedItem.checked !== targetItem.checked) return;

    reorderItems({ itemIds: arrayMove(currentItems, draggedIndex, targetIndex).map((i) => i.id) });
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const uncheckedCount = items.length - checkedCount;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-plum">Shopping List</h1>
      </div>

      {/* Add Item */}
      <div className="flex gap-2 mb-6 items-center">
        <Input
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
        />
        <Button
          size="icon"
          onClick={handleAddItem}
          disabled={!newItemName.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* List Stats + clear actions */}
      {items.length > 0 && (
        <div className="flex items-center justify-between mb-4 text-sm text-mauve">
          <div className="flex items-center gap-1">
            {currentUser?.pro === true && uncheckedCount > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOrganize}
                disabled={isOrganizing}
                className="gap-1.5"
              >
                {isOrganizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isOrganizing ? "Organizing…" : "Organize list"}
              </Button>
            )}
            {checkedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearChecked()}
                className="text-mauve hover:text-destructive gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Clear checked
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearAll()}
              className="text-mauve hover:text-destructive gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </Button>
          </div>
        </div>
      )}

      {organizationError && (
        <p className="mb-4 text-sm text-destructive">{organizationError}</p>
      )}

      {/* Shopping List */}
      {shoppingList === undefined ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading...</p>
        </div>
      ) : items.length === 0 ? (
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
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragCancel={() => setActiveItemId(null)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableShoppingItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                  isSorting={activeItemId !== null}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null} modifiers={[restrictToVerticalAxis]}>
            {activeItemId && (() => {
              const item = items.find((candidate) => candidate.id === activeItemId);
              return item ? (
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-plum/40 shadow-xl">
                  <GripVertical className="w-5 h-5 text-mauve/50 shrink-0" />
                  <span className="font-medium text-plum">{item.name}</span>
                </div>
              ) : null;
            })()}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
