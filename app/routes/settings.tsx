import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  MapPinned,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const STARTER_SECTIONS = [
  "Produce",
  "Bakery",
  "Grains & pantry",
  "Meat & seafood",
  "Dairy & eggs",
  "Frozen",
  "Household",
];

type StoreSection = { id: string; name: string };

function createSection(name: string): StoreSection {
  return { id: crypto.randomUUID(), name };
}

export function meta() {
  return [
    { title: "Settings - Emille" },
    { name: "description", content: "Manage your Emille settings" },
  ];
}

function StoreLayoutSettings() {
  const savedSections = useQuery(api.users.getStoreLayout);
  const updateStoreLayout = useMutation(api.users.updateStoreLayout);
  const [draftSections, setDraftSections] = useState<StoreSection[] | null>(null);
  const [newSection, setNewSection] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = draftSections ?? savedSections ?? [];
  const hasChanges =
    draftSections !== null &&
    JSON.stringify(draftSections) !== JSON.stringify(savedSections ?? []);

  const updateSections = (next: StoreSection[]) => {
    setDraftSections(next);
    setError(null);
  };

  const addSection = () => {
    const name = newSection.trim();
    if (!name) return;
    updateSections([...sections, createSection(name)]);
    setNewSection("");
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= sections.length) return;
    const next = [...sections];
    [next[index], next[destination]] = [next[destination], next[index]];
    updateSections(next);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateStoreLayout({ sections });
      setDraftSections(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your store layout.");
    } finally {
      setIsSaving(false);
    }
  };

  if (savedSections === undefined) {
    return <div className="h-56 animate-pulse rounded-2xl bg-blush/20" />;
  }

  return (
    <section aria-labelledby="store-layout-heading">
      <h2
        id="store-layout-heading"
        className="text-sm font-semibold text-mauve uppercase tracking-wider mb-3"
      >
        Shopping
      </h2>
      <div className="bg-white/60 backdrop-blur-sm border border-blush/40 rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="size-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center shrink-0">
            <MapPinned className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-plum">Store layout</h3>
            <p className="text-sm text-mauve mt-1 leading-6">
              Put sections in the order you walk through your store. We’ll use
              this sequence when organizing your shopping list.
            </p>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-blush/70 px-4 py-5 text-center">
            <p className="text-sm text-mauve mb-3">No store sections yet.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateSections(STARTER_SECTIONS.map(createSection))}
            >
              Use starter sections
            </Button>
          </div>
        ) : (
          <ol className="space-y-2">
            {sections.map((section, index) => (
              <li
                key={section.id}
                className="flex items-center gap-2 rounded-xl border border-blush/40 bg-white/60 p-2"
              >
                <span className="w-6 text-center text-xs font-semibold text-mauve/60">
                  {index + 1}
                </span>
                <Input
                  value={section.name}
                  onChange={(event) =>
                    updateSections(
                      sections.map((current) =>
                        current.id === section.id
                          ? { ...current, name: event.target.value }
                          : current,
                      ),
                    )
                  }
                  aria-label={`Store section ${index + 1}`}
                  className="border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                />
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={index === 0}
                    onClick={() => moveSection(index, -1)}
                    aria-label={`Move ${section.name} earlier`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={index === sections.length - 1}
                    onClick={() => moveSection(index, 1)}
                    aria-label={`Move ${section.name} later`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-mauve hover:text-destructive"
                    onClick={() => updateSections(sections.filter((current) => current.id !== section.id))}
                    aria-label={`Remove ${section.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="flex gap-2 mt-4">
          <Input
            value={newSection}
            onChange={(event) => setNewSection(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addSection()}
            placeholder="Add a section"
            maxLength={60}
          />
          <Button type="button" variant="outline" onClick={addSection} disabled={!newSection.trim()}>
            <Plus className="size-4 mr-1" />
            Add
          </Button>
        </div>

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        {hasChanges && (
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={() => setDraftSections(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save layout"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const currentUser = useQuery(api.users.getMe);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center">
            <Settings className="size-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-plum">Settings</h1>
            <p className="text-sm text-mauve mt-1">Personalize how Emille works for you.</p>
          </div>
        </div>
      </div>

      {currentUser?.pro === true && <StoreLayoutSettings />}
    </div>
  );
}
