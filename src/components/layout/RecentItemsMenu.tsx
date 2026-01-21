import { useState } from "react";
import { useRecentItems, FavoriteItem, RecentItem } from "@/hooks/useRecentItems";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, User, Calendar, FileText, CreditCard, Trash2, StarOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface RecentItemsMenuProps {
  onItemClick: (type: string, id: string) => void;
  collapsed?: boolean;
}

const typeConfig = {
  contact: { icon: User, label: "Contact", color: "bg-blue-500" },
  session: { icon: Calendar, label: "Session", color: "bg-green-500" },
  facture: { icon: CreditCard, label: "Facture", color: "bg-amber-500" },
  document: { icon: FileText, label: "Document", color: "bg-purple-500" },
};

export function RecentItemsMenu({ onItemClick, collapsed }: RecentItemsMenuProps) {
  const { recentItems, favorites, clearRecent, removeFavorite } = useRecentItems();
  const [activeTab, setActiveTab] = useState<"recent" | "favorites">("recent");

  const displayItems = activeTab === "recent" ? recentItems : favorites;
  const hasItems = displayItems.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "sidebar-item w-full justify-start gap-2",
            collapsed && "justify-center px-0"
          )}
        >
          <Clock className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Récents</span>}
          {!collapsed && (recentItems.length > 0 || favorites.length > 0) && (
            <Badge variant="secondary" className="ml-auto">
              {favorites.length > 0 ? `★${favorites.length}` : recentItems.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("recent")}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "recent"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="inline h-4 w-4 mr-1" />
            Récents ({recentItems.length})
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "favorites"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Star className="inline h-4 w-4 mr-1" />
            Favoris ({favorites.length})
          </button>
        </div>

        {/* Items List */}
        <div className="max-h-80 overflow-y-auto">
          {!hasItems ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {activeTab === "recent" 
                ? "Aucun élément récent" 
                : "Aucun favori. Cliquez sur ★ pour ajouter."}
            </div>
          ) : (
            displayItems.map((item) => {
              const config = typeConfig[item.type];
              const Icon = config.icon;
              const time = "timestamp" in item 
                ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: fr })
                : formatDistanceToNow(new Date((item as FavoriteItem).addedAt), { addSuffix: true, locale: fr });

              return (
                <DropdownMenuItem
                  key={`${item.type}-${item.id}`}
                  className="flex items-start gap-3 p-3 cursor-pointer"
                  onClick={() => onItemClick(item.type, item.id)}
                >
                  <div className={cn("p-2 rounded-lg", config.color, "text-white")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{time}</p>
                  </div>
                  {activeTab === "favorites" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(item.id, item.type as FavoriteItem["type"]);
                      }}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <StarOff className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        {/* Clear action for recent */}
        {activeTab === "recent" && recentItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={clearRecent}
              className="text-muted-foreground justify-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Effacer l'historique
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
