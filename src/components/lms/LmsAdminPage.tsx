import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LmsFormationsTab } from "./LmsFormationsTab";
import { LmsContentTab } from "./LmsContentTab";
import { LmsQuizzesTab } from "./quiz/LmsQuizzesTab";
import { BookOpen, Layers, ClipboardCheck } from "lucide-react";

export function LmsAdminPage() {
  const [activeTab, setActiveTab] = useState("formations");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">E-Learning</h1>
        <p className="text-muted-foreground">
          Gérez les formations, modules, contenus et évaluations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="formations" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Formations
          </TabsTrigger>
          <TabsTrigger value="contenu" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Contenu
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Quiz & QCM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formations" className="mt-6">
          <LmsFormationsTab />
        </TabsContent>

        <TabsContent value="contenu" className="mt-6">
          <LmsContentTab />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-6">
          <LmsQuizzesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
