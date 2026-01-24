import * as XLSX from "xlsx";
import { QuestionAnswer } from "@/hooks/useLmsQuizzes";

export interface QuizCSVRow {
  quiz_titre: string;
  quiz_description?: string;
  quiz_nb_questions?: number;
  quiz_temps_limite_min?: number;
  quiz_seuil_reussite_pct?: number;
  question_enonce: string;
  question_type: string;
  question_niveau: string;
  question_points: number;
  question_explication?: string;
  reponse_1: string;
  reponse_1_correcte: string;
  reponse_2: string;
  reponse_2_correcte: string;
  reponse_3?: string;
  reponse_3_correcte?: string;
  reponse_4?: string;
  reponse_4_correcte?: string;
  reponse_5?: string;
  reponse_5_correcte?: string;
  reponse_6?: string;
  reponse_6_correcte?: string;
}

export interface ParsedQuizData {
  quizzes: Map<string, {
    titre: string;
    description: string | null;
    nb_questions: number;
    temps_limite_min: number | null;
    seuil_reussite_pct: number;
    questions: ParsedQuestion[];
  }>;
}

export interface ParsedQuestion {
  enonce: string;
  type: string;
  niveau: string;
  points: number;
  explication: string | null;
  reponses: QuestionAnswer[];
}

/**
 * Parse CSV/Excel content into quiz and question data
 */
export function parseQuizCSV(data: unknown[]): ParsedQuizData {
  const quizzes = new Map<string, {
    titre: string;
    description: string | null;
    nb_questions: number;
    temps_limite_min: number | null;
    seuil_reussite_pct: number;
    questions: ParsedQuestion[];
  }>();

  for (const row of data as QuizCSVRow[]) {
    if (!row.question_enonce || !row.quiz_titre) continue;

    const quizKey = row.quiz_titre.trim();
    
    if (!quizzes.has(quizKey)) {
      quizzes.set(quizKey, {
        titre: quizKey,
        description: row.quiz_description?.trim() || null,
        nb_questions: Number(row.quiz_nb_questions) || 10,
        temps_limite_min: row.quiz_temps_limite_min ? Number(row.quiz_temps_limite_min) : null,
        seuil_reussite_pct: Number(row.quiz_seuil_reussite_pct) || 70,
        questions: [],
      });
    }

    // Parse answers
    const reponses: QuestionAnswer[] = [];
    const rowAny = row as unknown as Record<string, unknown>;
    for (let i = 1; i <= 6; i++) {
      const texte = rowAny[`reponse_${i}`] as string | undefined;
      const correcte = rowAny[`reponse_${i}_correcte`] as string | undefined;
      
      if (texte && texte.trim()) {
        reponses.push({
          id: crypto.randomUUID(),
          texte: texte.trim(),
          is_correct: correcte?.toLowerCase() === "oui" || correcte?.toLowerCase() === "true" || correcte === "1",
        });
      }
    }

    if (reponses.length >= 2) {
      quizzes.get(quizKey)!.questions.push({
        enonce: row.question_enonce.trim(),
        type: row.question_type?.trim() || "qcm",
        niveau: row.question_niveau?.trim() || "moyen",
        points: Number(row.question_points) || 1,
        explication: row.question_explication?.trim() || null,
        reponses,
      });
    }
  }

  return { quizzes };
}

/**
 * Export quizzes and questions to CSV format
 */
export function exportQuizzesToCSV(quizzes: Array<{
  titre: string;
  description: string | null;
  nb_questions: number;
  temps_limite_min: number | null;
  seuil_reussite_pct: number;
  questions: Array<{
    enonce: string;
    type: string;
    niveau: string;
    points: number;
    explication: string | null;
    reponses: QuestionAnswer[];
  }>;
}>): string {
  const rows: QuizCSVRow[] = [];

  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      const row: QuizCSVRow = {
        quiz_titre: quiz.titre,
        quiz_description: quiz.description || "",
        quiz_nb_questions: quiz.nb_questions,
        quiz_temps_limite_min: quiz.temps_limite_min || undefined,
        quiz_seuil_reussite_pct: quiz.seuil_reussite_pct,
        question_enonce: question.enonce,
        question_type: question.type,
        question_niveau: question.niveau,
        question_points: question.points,
        question_explication: question.explication || "",
        reponse_1: question.reponses[0]?.texte || "",
        reponse_1_correcte: question.reponses[0]?.is_correct ? "oui" : "non",
        reponse_2: question.reponses[1]?.texte || "",
        reponse_2_correcte: question.reponses[1]?.is_correct ? "oui" : "non",
        reponse_3: question.reponses[2]?.texte || "",
        reponse_3_correcte: question.reponses[2]?.is_correct ? "oui" : "non",
        reponse_4: question.reponses[3]?.texte || "",
        reponse_4_correcte: question.reponses[3]?.is_correct ? "oui" : "non",
        reponse_5: question.reponses[4]?.texte || "",
        reponse_5_correcte: question.reponses[4]?.is_correct ? "oui" : "non",
        reponse_6: question.reponses[5]?.texte || "",
        reponse_6_correcte: question.reponses[5]?.is_correct ? "oui" : "non",
      };
      rows.push(row);
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ";" });
  return "\uFEFF" + csv; // UTF-8 BOM for Excel compatibility
}

/**
 * Export quizzes to Excel format
 */
export function exportQuizzesToExcel(quizzes: Array<{
  titre: string;
  description: string | null;
  nb_questions: number;
  temps_limite_min: number | null;
  seuil_reussite_pct: number;
  questions: Array<{
    enonce: string;
    type: string;
    niveau: string;
    points: number;
    explication: string | null;
    reponses: QuestionAnswer[];
  }>;
}>): Blob {
  const rows: QuizCSVRow[] = [];

  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      const row: QuizCSVRow = {
        quiz_titre: quiz.titre,
        quiz_description: quiz.description || "",
        quiz_nb_questions: quiz.nb_questions,
        quiz_temps_limite_min: quiz.temps_limite_min || undefined,
        quiz_seuil_reussite_pct: quiz.seuil_reussite_pct,
        question_enonce: question.enonce,
        question_type: question.type,
        question_niveau: question.niveau,
        question_points: question.points,
        question_explication: question.explication || "",
        reponse_1: question.reponses[0]?.texte || "",
        reponse_1_correcte: question.reponses[0]?.is_correct ? "oui" : "non",
        reponse_2: question.reponses[1]?.texte || "",
        reponse_2_correcte: question.reponses[1]?.is_correct ? "oui" : "non",
        reponse_3: question.reponses[2]?.texte || "",
        reponse_3_correcte: question.reponses[2]?.is_correct ? "oui" : "non",
        reponse_4: question.reponses[3]?.texte || "",
        reponse_4_correcte: question.reponses[3]?.is_correct ? "oui" : "non",
        reponse_5: question.reponses[4]?.texte || "",
        reponse_5_correcte: question.reponses[4]?.is_correct ? "oui" : "non",
        reponse_6: question.reponses[5]?.texte || "",
        reponse_6_correcte: question.reponses[5]?.is_correct ? "oui" : "non",
      };
      rows.push(row);
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 20),
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz");
  
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * Generate a template CSV for quiz import
 */
export function generateQuizTemplate(): string {
  const templateRows: QuizCSVRow[] = [
    {
      quiz_titre: "Quiz Réglementation VTC",
      quiz_description: "Questions sur la réglementation du transport VTC",
      quiz_nb_questions: 10,
      quiz_temps_limite_min: 15,
      quiz_seuil_reussite_pct: 70,
      question_enonce: "Quelle est la durée de validité d'une carte professionnelle VTC ?",
      question_type: "qcm",
      question_niveau: "moyen",
      question_points: 1,
      question_explication: "La carte VTC est valable 5 ans et doit être renouvelée.",
      reponse_1: "3 ans",
      reponse_1_correcte: "non",
      reponse_2: "5 ans",
      reponse_2_correcte: "oui",
      reponse_3: "10 ans",
      reponse_3_correcte: "non",
      reponse_4: "Illimitée",
      reponse_4_correcte: "non",
    },
    {
      quiz_titre: "Quiz Réglementation VTC",
      quiz_description: "Questions sur la réglementation du transport VTC",
      quiz_nb_questions: 10,
      quiz_temps_limite_min: 15,
      quiz_seuil_reussite_pct: 70,
      question_enonce: "Quels documents doivent être présents dans le véhicule VTC ?",
      question_type: "qcm_multi",
      question_niveau: "difficile",
      question_points: 2,
      question_explication: "Plusieurs documents sont obligatoires à bord du véhicule.",
      reponse_1: "Carte grise",
      reponse_1_correcte: "oui",
      reponse_2: "Assurance",
      reponse_2_correcte: "oui",
      reponse_3: "Carte professionnelle",
      reponse_3_correcte: "oui",
      reponse_4: "Diplôme de conduite",
      reponse_4_correcte: "non",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ";" });
  return "\uFEFF" + csv;
}

/**
 * Read and parse a CSV/Excel file
 * Uses ArrayBuffer to properly handle UTF-8 encoding
 */
export async function readQuizFile(file: File): Promise<ParsedQuizData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Use ArrayBuffer type for proper UTF-8 handling
        const workbook = XLSX.read(data, { type: "array", codepage: 65001 });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        resolve(parseQuizCSV(jsonData));
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
    // Use ArrayBuffer instead of binary string for proper UTF-8 support
    reader.readAsArrayBuffer(file);
  });
}
