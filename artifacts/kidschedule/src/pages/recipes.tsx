import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Plus, Pencil, Trash2, Timer, Users, Clock, BookOpen, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getApiUrl } from "@/lib/api";

type Recipe = {
  id: number;
  name: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  steps: string[];
  tip?: string | null;
  createdAt: string;
};

type RecipeFormData = {
  name: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string;
  steps: string;
  tip: string;
};

const EMPTY_FORM: RecipeFormData = {
  name: "",
  prepTime: "10 min",
  cookTime: "15 min",
  servings: "1 child",
  ingredients: "",
  steps: "",
  tip: "",
};

function recipeToForm(r: Recipe): RecipeFormData {
  return {
    name: r.name,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    ingredients: r.ingredients.join("\n"),
    steps: r.steps.join("\n"),
    tip: r.tip ?? "",
  };
}

function formToPayload(f: RecipeFormData) {
  return {
    name: f.name.trim(),
    prepTime: f.prepTime.trim() || "10 min",
    cookTime: f.cookTime.trim() || "15 min",
    servings: f.servings.trim() || "1 child",
    ingredients: f.ingredients.split("\n").map(s => s.trim()).filter(Boolean),
    steps: f.steps.split("\n").map(s => s.trim()).filter(Boolean),
    tip: f.tip.trim() || undefined,
  };
}

export default function RecipesPage() {
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [form, setForm] = useState<RecipeFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ["custom-recipes"],
    queryFn: async () => {
      const res = await authFetch("/api/recipes");
      if (!res.ok) throw new Error("Failed to load recipes");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: RecipeFormData) => {
      const payload = formToPayload(data);
      const url = editing ? `/api/recipes/${editing.id}` : "/api/recipes";
      const method = editing ? "PUT" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to save recipe");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-recipes"] });
      toast({ title: editing ? "Recipe updated" : "Recipe saved", description: editing ? "Your recipe has been updated." : "Your custom recipe has been saved." });
      closeDialog();
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await authFetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-recipes"] });
      toast({ title: "Recipe deleted", description: "The recipe has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete recipe.", variant: "destructive" });
    },
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(r: Recipe) {
    setEditing(r);
    setForm(recipeToForm(r));
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setFormError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) { setFormError("Recipe name is required"); return; }
    if (!form.ingredients.trim()) { setFormError("At least one ingredient is required"); return; }
    if (!form.steps.trim()) { setFormError("At least one step is required"); return; }
    saveMutation.mutate(form);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ChefHat className="h-6 w-6 text-orange-500" />
              <h1 className="text-2xl font-black text-foreground">My Recipes</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Save your family recipes. When a meal name matches, the routine will show your recipe instead of the default one.
            </p>
          </div>
          <Button onClick={openAdd} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-md">
            <Plus className="h-4 w-4" />
            Add Recipe
          </Button>
        </div>

        {/* Empty state */}
        {!isLoading && recipes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">No recipes saved yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Add your family's favourite recipes and they'll appear automatically in routines when the meal name matches.
              </p>
            </div>
            <Button onClick={openAdd} variant="outline" className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50">
              <Plus className="h-4 w-4" />
              Add your first recipe
            </Button>
          </div>
        )}

        {/* Recipe list */}
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {recipes.map(recipe => (
              <Card key={recipe.id} className="overflow-hidden border border-orange-100 dark:border-orange-900/30 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <ChefHat className="h-4 w-4 text-orange-500 shrink-0" />
                        <h3 className="font-bold text-base text-foreground leading-tight" style={{ wordBreak: "break-word" }}>
                          {recipe.name}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Timer className="h-3.5 w-3.5" />
                          Prep: {recipe.prepTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Cook: {recipe.cookTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {recipe.servings}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{recipe.ingredients.length}</span> ingredients · <span className="font-medium text-foreground">{recipe.steps.length}</span> steps
                        {recipe.tip && <span className="ml-2">· 💡 Has tip</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(recipe)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete recipe?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{recipe.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(recipe.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-orange-500" />
              {editing ? "Edit Recipe" : "Add Recipe"}
            </DialogTitle>
            <DialogDescription>
              Name it to match meals in routines — e.g. "Idli" will match any routine meal containing "Idli".
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-semibold">Recipe Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Idli, Paneer Paratha, Egg Bhurji"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">This name will be matched against meal names in generated routines.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prepTime" className="font-semibold">Prep Time</Label>
                <Input
                  id="prepTime"
                  value={form.prepTime}
                  onChange={e => setForm(f => ({ ...f, prepTime: e.target.value }))}
                  placeholder="10 min"
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cookTime" className="font-semibold">Cook Time</Label>
                <Input
                  id="cookTime"
                  value={form.cookTime}
                  onChange={e => setForm(f => ({ ...f, cookTime: e.target.value }))}
                  placeholder="15 min"
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="servings" className="font-semibold">Servings</Label>
                <Input
                  id="servings"
                  value={form.servings}
                  onChange={e => setForm(f => ({ ...f, servings: e.target.value }))}
                  placeholder="1 child"
                  maxLength={60}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ingredients" className="font-semibold">Ingredients <span className="text-destructive">*</span></Label>
              <Textarea
                id="ingredients"
                value={form.ingredients}
                onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))}
                placeholder={"1 cup rice\n1/2 cup dal\n1 tsp ghee"}
                rows={5}
                className="text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">One ingredient per line.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="steps" className="font-semibold">Steps <span className="text-destructive">*</span></Label>
              <Textarea
                id="steps"
                value={form.steps}
                onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                placeholder={"Wash and soak the rice.\nPressure cook for 2 whistles.\nServe hot with ghee."}
                rows={6}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">One step per line.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tip" className="font-semibold">Parent Tip (optional)</Label>
              <Input
                id="tip"
                value={form.tip}
                onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}
                placeholder="e.g. Add ghee at the end for extra flavour"
                maxLength={300}
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <X className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{formError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving…" : editing ? "Update Recipe" : "Save Recipe"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
