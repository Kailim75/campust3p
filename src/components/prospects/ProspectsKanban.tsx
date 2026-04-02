import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProspects, useUpdateProspect, type Prospect, type ProspectStatus } from "@/hooks/useProspects";
import { ProspectFormDialog } from "./ProspectFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, GraduationCap, MoreHorizontal, Pencil, UserCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteProspect } from "@/hooks/useProspects";
import { SmartConversionDialog } from "@/components/workflow/SmartConversionDialog";

const COLUMNS: { id: ProspectStatus; label: string; color: string }[] = [
  { id: "nouveau", label: "Nouveau", color: "bg-blue-500" },
  { id: "contacte", label: "Contacté", color: "bg-yellow-500" },
  { id: "relance", label: "À relancer", color: "bg-orange-500" },
  { id: "converti", label: "Converti", color: "bg-green-500" },
  { id: "perdu", label: "Perdu", color: "bg-gray-500" },
];

interface ProspectsKanbanProps {
  onViewDetail?: (prospect: Prospect) => void;
}

export function ProspectsKanban({ onViewDetail }: ProspectsKanbanProps) {
  const { data: prospects = [], isLoading } = useProspects();
  const updateProspect = useUpdateProspect();
  const deleteProspect = useDeleteProspect();
  
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const prospectId = result.draggableId;
    const newStatus = result.destination.droppableId as ProspectStatus;
    
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect || prospect.statut === newStatus) return;

    updateProspect.mutate({
      id: prospectId,
      updates: { statut: newStatus },
    });
  };

  const handleEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setFormOpen(true);
  };

  const handleDelete = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDeleteDialogOpen(true);
  };

  const handleConvert = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setConvertDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProspect) {
      deleteProspect.mutate(selectedProspect.id);
    }
    setDeleteDialogOpen(false);
    setSelectedProspect(null);
  };

  const confirmConvert = () => {
    setConvertDialogOpen(false);
    setSelectedProspect(null);
  };

  const getProspectsByStatus = (status: ProspectStatus) =>
    prospects.filter((p) => p.statut === status);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="min-w-[280px] flex-shrink-0">
            <Skeleton className="h-10 w-full mb-3" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => {
            const columnProspects = getProspectsByStatus(column.id);
            return (
              <div key={column.id} className="min-w-[280px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <span className="font-medium text-sm">{column.label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {columnProspects.length}
                  </Badge>
                </div>
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <ScrollArea className="h-[calc(100vh-320px)]">
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[200px] p-2 rounded-lg transition-colors ${
                          snapshot.isDraggingOver ? "bg-accent/50" : "bg-background"
                        }`}
                      >
                        {columnProspects.map((prospect, index) => (
                          <Draggable
                            key={prospect.id}
                            draggableId={prospect.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onViewDetail?.(prospect)}
                                className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? "shadow-lg rotate-2" : ""
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-medium text-sm">
                                    {prospect.prenom} {prospect.nom}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEdit(prospect)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Modifier
                                      </DropdownMenuItem>
                                      {prospect.statut !== "converti" && (
                                        <DropdownMenuItem onClick={() => handleConvert(prospect)}>
                                          <UserCheck className="h-4 w-4 mr-2" />
                                          Convertir
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(prospect)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                
                                {prospect.formation_souhaitee && (
                                  <Badge variant="outline" className="mb-2 text-xs">
                                    <GraduationCap className="h-3 w-3 mr-1" />
                                    {prospect.formation_souhaitee}
                                  </Badge>
                                )}
                                
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  {prospect.telephone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {prospect.telephone}
                                    </div>
                                  )}
                                  {prospect.email && (
                                    <div className="flex items-center gap-1 truncate">
                                      <Mail className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{prospect.email}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(prospect.created_at), {
                                    addSuffix: true,
                                    locale: fr,
                                  })}
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </ScrollArea>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <ProspectFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingProspect(null);
        }}
        prospect={editingProspect}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action masquera le prospect "{selectedProspect?.prenom} {selectedProspect?.nom}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SmartConversionDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        prospect={selectedProspect}
      />
    </>
  );
}
