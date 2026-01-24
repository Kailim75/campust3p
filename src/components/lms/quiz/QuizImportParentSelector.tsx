import { useEffect, useMemo, useState } from "react";
import { useLmsLessons } from "@/hooks/useLmsLessons";
import { useLmsModules } from "@/hooks/useLmsModules";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type QuizParentSelection =
  | { type: "module"; moduleId: string }
  | { type: "lesson"; lessonId: string };

const NONE = "__none__";
const ALL = "__all__";

interface QuizImportParentSelectorProps {
  value: QuizParentSelection | null;
  onChange: (value: QuizParentSelection | null) => void;
  disabled?: boolean;
}

export function QuizImportParentSelector({
  value,
  onChange,
  disabled,
}: QuizImportParentSelectorProps) {
  const initialMode = value?.type ?? "module";
  const [mode, setMode] = useState<"module" | "lesson">(initialMode);

  const [moduleId, setModuleId] = useState(
    value?.type === "module" ? value.moduleId : NONE
  );
  const [lessonModuleFilter, setLessonModuleFilter] = useState(ALL);
  const [lessonId, setLessonId] = useState(
    value?.type === "lesson" ? value.lessonId : NONE
  );

  const { data: modules = [] } = useLmsModules();
  const { data: lessons = [] } = useLmsLessons(
    lessonModuleFilter === ALL ? undefined : lessonModuleFilter
  );

  const hasAnyParent = modules.length > 0 || lessons.length > 0;

  const moduleOptions = useMemo(
    () => modules.map((m) => ({ id: m.id, titre: m.titre })),
    [modules]
  );
  const lessonOptions = useMemo(
    () => lessons.map((l) => ({ id: l.id, titre: l.titre })),
    [lessons]
  );

  // Sync to parent selection output
  useEffect(() => {
    if (!hasAnyParent) {
      onChange(null);
      return;
    }

    if (mode === "module") {
      onChange(moduleId !== NONE ? { type: "module", moduleId } : null);
      return;
    }

    onChange(lessonId !== NONE ? { type: "lesson", lessonId } : null);
  }, [hasAnyParent, lessonId, mode, moduleId, onChange]);

  // If switching modes, clear the irrelevant selection
  useEffect(() => {
    if (mode === "module") {
      setLessonId(NONE);
    } else {
      setModuleId(NONE);
    }
  }, [mode]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Rattacher les quiz importés à</Label>
        {!hasAnyParent && (
          <span className="text-xs text-muted-foreground">
            Créez d’abord un module ou une leçon
          </span>
        )}
      </div>

      <RadioGroup
        value={mode}
        onValueChange={(v) => setMode(v as "module" | "lesson")}
        className="flex gap-4"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="module" id="import-parent-module" />
          <Label htmlFor="import-parent-module">Module</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="lesson" id="import-parent-lesson" />
          <Label htmlFor="import-parent-lesson">Leçon</Label>
        </div>
      </RadioGroup>

      {mode === "module" ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Module</Label>
          <Select value={moduleId} onValueChange={setModuleId} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sélectionner…</SelectItem>
              {moduleOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.titre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Filtrer par module</Label>
            <Select
              value={lessonModuleFilter}
              onValueChange={(v) => {
                setLessonModuleFilter(v);
                setLessonId(NONE);
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les modules</SelectItem>
                {moduleOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Leçon</Label>
            <Select value={lessonId} onValueChange={setLessonId} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une leçon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sélectionner…</SelectItem>
                {lessonOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
