import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, BookOpen, Keyboard, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HELP_CATEGORIES, type HelpArticle } from "./helpArticles";
import { useContextualHelp } from "./useContextualHelp";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpCenterDrawer({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HelpArticle | null>(null);
  const { contextual, other, filtered } = useContextualHelp(query);
  const navigate = useNavigate();

  const close = () => {
    onOpenChange(false);
    setTimeout(() => setSelected(null), 200);
  };

  const renderList = (articles: HelpArticle[]) => (
    <div className="flex flex-col gap-1.5">
      {articles.map((a) => (
        <button
          key={a.id}
          onClick={() => setSelected(a)}
          className="flex items-start gap-3 rounded-md border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-accent/50"
        >
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground">{a.title}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {HELP_CATEGORIES.find((c) => c.id === a.category)?.label}
              </Badge>
            </div>
          </div>
        </button>
      ))}
      {articles.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">Aucun article.</p>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            {selected ? (
              <>
                <Button variant="ghost" size="sm" className="-ml-2 h-7 px-2" onClick={() => setSelected(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="truncate">{selected.title}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-primary" />
                Centre d'aide
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        {!selected && (
          <div className="border-b border-border bg-muted/30 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher dans l'aide…"
                className="h-9 pl-8"
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="px-4 py-4">
            {selected ? (
              <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:text-sm prose-li:text-sm">
                <ReactMarkdown>{selected.body}</ReactMarkdown>
              </article>
            ) : filtered ? (
              <>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
                </h3>
                {renderList(filtered)}
              </>
            ) : (
              <div className="space-y-5">
                {contextual.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Sur cette page
                    </h3>
                    {renderList(contextual)}
                  </section>
                )}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {contextual.length > 0 ? "Tous les articles" : "Articles d'aide"}
                  </h3>
                  {renderList(other)}
                </section>
              </div>
            )}
          </div>
        </ScrollArea>

        {!selected && (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                close();
                navigate("/aide");
              }}
            >
              <Keyboard className="h-4 w-4" />
              Mémo, raccourcis & glossaire
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
