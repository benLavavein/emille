import { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { X, Repeat } from "lucide-react";
import { Input, InputSlot } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Combobox, type ComboboxItem } from "~/components/ui/combobox";
import { MEAL_TIMES, MEAL_TIME_ICONS } from "~/lib/constants/meals";
import type { MealFormApi } from "./index";

type Props = {
  form: MealFormApi;
};

export function MealDetailsSection({ form }: Props) {
  const existingTags = useQuery(api.tags.list);
  const createTag = useMutation(api.tags.create);
  const availableSides = useQuery(api.meals.listSides);

  const handleCreateTag = useCallback(
    async (tagName: string) => {
      const id = await createTag({ name: tagName });
      const current = form.getFieldValue("tags");
      form.setFieldValue("tags", [...current, { id, name: tagName }]);
    },
    [createTag, form],
  );

  return (
    <>
      {/* Type toggle — Meal or Pairing */}
      <form.Field name="type">
        {(field) => (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={field.state.value === "meal" ? "default" : "outline"}
              onClick={() => field.handleChange("meal")}
              className="flex-1"
            >
              Meal
            </Button>
            <Button
              type="button"
              variant={field.state.value === "side" ? "default" : "outline"}
              onClick={() => field.handleChange("side")}
              className="flex-1"
            >
              Pairing
            </Button>
          </div>
        )}
      </form.Field>

      {/* Meal Name */}
      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) =>
            !value.trim() ? "Meal name is required" : undefined,
        }}
      >
        {(field) => (
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-plum mb-2"
            >
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="e.g., Grandma's Chicken Soup"
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive mt-1">
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {/* Description */}
      <form.Field name="description">
        {(field) => (
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-plum mb-2"
            >
              Description
            </label>
            <Textarea
              id="description"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={2}
              placeholder="A short description of this meal..."
            />
          </div>
        )}
      </form.Field>

      {/* Prep, Cook Time & Servings */}
      <div className="flex gap-4">
        <form.Field name="prepTimeMin">
          {(field) => (
            <div className="flex-1 min-w-0">
              <label
                htmlFor="prepTime"
                className="block text-sm font-medium text-plum mb-2"
              >
                Prep Time
              </label>
              <Input
                id="prepTime"
                type="number"
                min="0"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="10"
              >
                <InputSlot>min</InputSlot>
              </Input>
            </div>
          )}
        </form.Field>

        <form.Field name="cookTimeMin">
          {(field) => (
            <div className="flex-1 min-w-0">
              <label
                htmlFor="cookTime"
                className="block text-sm font-medium text-plum mb-2"
              >
                Cook Time
              </label>
              <Input
                id="cookTime"
                type="number"
                min="0"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="30"
              >
                <InputSlot>min</InputSlot>
              </Input>
            </div>
          )}
        </form.Field>

        <form.Field name="servings">
          {(field) => (
            <div className="flex-1 min-w-0">
              <label
                htmlFor="servings"
                className="block text-sm font-medium text-plum mb-2"
              >
                Servings
              </label>
              <Input
                id="servings"
                type="number"
                min="1"
                step="1"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="4"
              />
            </div>
          )}
        </form.Field>
      </div>

      {/* Meal Times */}
      <form.Field name="mealTimes">
        {(field) => (
          <div>
            <label className="block text-sm font-medium text-plum mb-2">
              When do you enjoy eating this?
            </label>
            <div className="flex gap-3">
              {MEAL_TIMES.map((time) => {
                const Icon = MEAL_TIME_ICONS[time];
                const selected = field.state.value.includes(time);
                return (
                  <Button
                    key={time}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    onClick={() => {
                      field.handleChange(
                        selected
                          ? field.state.value.filter((t) => t !== time)
                          : [...field.state.value, time],
                      );
                    }}
                    className="flex-1 gap-2"
                  >
                    <Icon className="size-4 shrink-0" />
                    {time}
                  </Button>
                );
              })}
            </div>
            {field.state.value.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Select at least one
              </p>
            )}
          </div>
        )}
      </form.Field>

      {/* Tags */}
      <form.Field name="tags">
        {(field) => {
          const tagItems: ComboboxItem[] = (existingTags || [])
            .filter((tag) => !field.state.value.some((mt) => mt.id === tag._id))
            .map((tag) => ({ id: tag._id, label: tag.name }));

          return (
            <div>
              <label className="block text-sm font-medium text-plum mb-2">
                Tags
              </label>
              <Combobox
                items={tagItems}
                placeholder="Add tags (e.g., healthy, quick, comfort food)"
                emptyText="No existing tags found."
                onSelect={(item) => {
                  field.handleChange([
                    ...field.state.value,
                    { id: item.id, name: item.label },
                  ]);
                }}
                onCreate={handleCreateTag}
              />
              {field.state.value.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {field.state.value.map((tag, index) => (
                    <Badge key={tag.id} variant="secondary" className="gap-1">
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => {
                          field.handleChange(
                            field.state.value.filter((_, i) => i !== index),
                          );
                        }}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        }}
      </form.Field>

      {/* Pairings — only for meals */}
      <form.Subscribe selector={(state) => state.values.type}>
        {(type) =>
          type === "meal" ? (
            <form.Field name="sideAttachments">
              {(field) => {
                const sideItems: ComboboxItem[] = (availableSides || [])
                  .filter(
                    (s) => !field.state.value.some((a) => a.sideId === s._id),
                  )
                  .map((s) => ({ id: s._id, label: s.name }));

                return (
                  <div>
                    <label className="block text-sm font-medium text-plum mb-2">
                      Pairings
                    </label>
                    <Combobox
                      items={sideItems}
                      placeholder="Attach a pairing..."
                      emptyText="No pairings found. Create one first."
                      onSelect={(item) => {
                        field.handleChange([
                          ...field.state.value,
                          {
                            sideId: item.id,
                            name: item.label,
                            alwaysInclude: false,
                          },
                        ]);
                      }}
                    />
                    {field.state.value.length > 0 && (
                      <div className="flex flex-col gap-2 mt-3">
                        {field.state.value.map((att, index) => (
                          <div
                            key={att.sideId}
                            className="flex items-center gap-3 px-3 py-2 bg-white/60 border border-blush/50 rounded-lg"
                          >
                            <span className="flex-1 text-sm font-medium text-plum truncate">
                              {att.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                field.handleChange(
                                  field.state.value.map((a, i) =>
                                    i === index
                                      ? { ...a, alwaysInclude: !a.alwaysInclude }
                                      : a,
                                  ),
                                );
                              }}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                                att.alwaysInclude
                                  ? "bg-plum text-white border-plum"
                                  : "text-mauve border-blush/50 hover:border-plum/30"
                              }`}
                            >
                              <Repeat className="size-3" />
                              Always include
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                field.handleChange(
                                  field.state.value.filter((_, i) => i !== index),
                                );
                              }}
                              className="text-mauve hover:text-destructive transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            </form.Field>
          ) : null
        }
      </form.Subscribe>
    </>
  );
}
