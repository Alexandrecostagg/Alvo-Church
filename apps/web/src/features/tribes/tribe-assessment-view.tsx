"use client";

import { useState, useMemo } from "react";
import { 
  ChevronRight, 
  ArrowLeft, 
  Tent, 
  CheckCircle2, 
  Trophy,
  UsersRound,
  Waypoints,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { 
  tribeQuestionnaireV1, 
  calculateTribeQuestionnaireResult,
  getTribeDisplayLabel
} from "@alvo/domain";
import type { TribeAnswer, TribeCode } from "@alvo/types";
import { saveTribeAssessment, isFirebaseWebRuntimeConfigured } from "@alvo/firebase";
import { useAppAuth } from "../../../app/providers";

export function TribeAssessmentView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<TribeAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const questions = tribeQuestionnaireV1.questions;
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  const handleSelectOption = async (optionCode: string) => {
    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex(a => a.questionCode === currentQuestion.code);
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = { questionCode: currentQuestion.code, optionCode };
    } else {
      newAnswers.push({ questionCode: currentQuestion.code, optionCode });
    }
    
    setAnswers(newAnswers);

    if (isLastStep) {
      await handleSubmit(newAnswers);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async (finalAnswers: TribeAnswer[]) => {
    setIsSubmitting(true);
    try {
      const questionnaireResult = calculateTribeQuestionnaireResult(finalAnswers);
      const primaryTribeCode = questionnaireResult.primaryTribeCode;
      
      if (isFirebaseWebRuntimeConfigured(firebaseConfig)) {
        const assessmentId = `assessment_${Date.now()}`;
        const assessment = {
          id: assessmentId,
          organizationId,
          personId: user?.uid || "anonymous",
          assessmentType: "initial" as const,
          status: "validated" as const,
          primaryTribeCode: primaryTribeCode,
          confidenceLevel: "high" as const,
          validationStatus: "validated" as const,
          submittedAt: new Date().toISOString()
        };

        const scores = questionnaireResult.scores.map((s, idx) => ({
          id: `score_${assessmentId}_${idx}`,
          organizationId,
          tribeAssessmentId: assessmentId,
          tribeCode: s.tribeCode,
          scoreRaw: s.scoreRaw,
          rankPosition: idx + 1
        }));

        await saveTribeAssessment(firebaseConfig, { organizationId }, assessment, scores);
      }

      setResult(questionnaireResult);
    } catch (error) {
      console.error("Failed to save assessment:", error);
      // Fallback to local result if firebase fails
      const questionnaireResult = calculateTribeQuestionnaireResult(finalAnswers);
      setResult(questionnaireResult);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    const tribeCode = result.primaryTribeCode;
    const accent = getTribeAccent(tribeCode);
    const label = getTribeDisplayLabel(tribeCode);

    return (
      <main className="assessment-page">
        <div className="assessment-container">
          <div className="result-screen">
            <div className="result-tribe-icon" style={{ backgroundColor: accent.soft, color: accent.dark }}>
              <Tent size={64} />
            </div>
            <p className="eyebrow" style={{ color: accent.main }}>Sua Tribo Principal e</p>
            <h1 style={{ color: accent.dark }}>{label}</h1>
            <p className="result-description">
              Voce possui um perfil pastoral voltado para {getTribeDescription(tribeCode)}.
            </p>
            <div className="result-actions">
              <Link href="/me" className="primary-button" style={{ backgroundColor: accent.dark }}>
                Ver meu perfil
              </Link>
              <Link href="/tribes" className="icon-button ghost">
                Explorar ecossistema <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="assessment-page">
      <header className="topbar">
        <button onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)} className="icon-button ghost">
          <ArrowLeft size={20} />
        </button>
        <div className="assessment-progress">
          <span>Questao {currentStep + 1} de {questions.length}</span>
        </div>
      </header>

      <div className="assessment-container">
        <div className="assessment-card animate-entrance">
          <div className="assessment-step-indicator">
            {questions.map((_, idx) => (
              <div key={idx} className={`step-dot ${idx <= currentStep ? 'active' : ''}`} />
            ))}
          </div>

          <div className="assessment-question">
            <p className="eyebrow">Teste de Dons Esdras</p>
            <h2>{currentQuestion.prompt}</h2>
          </div>

          <div className="assessment-options">
            {currentQuestion.options.map((option) => (
              <button 
                key={option.code} 
                className="assessment-option"
                onClick={() => handleSelectOption(option.code)}
                disabled={isSubmitting}
              >
                <div className="option-letter">{option.code.toUpperCase()}</div>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          
          {isSubmitting && (
            <div className="assessment-loading">
              <Sparkles className="spinner" size={24} />
              <p>Calculando seu destino pastoral...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function getTribeAccent(code?: TribeCode) {
  const accents: Record<string, { main: string; soft: string; dark: string }> = {
    ASHER: { main: "#10b981", soft: "#ecfdf5", dark: "#065f46" },
    LEVI: { main: "#3b82f6", soft: "#eff6ff", dark: "#1e3a8a" },
    JUDAH: { main: "#f97316", soft: "#fff7ed", dark: "#7c2d12" },
    ISSACHAR: { main: "#8b5cf6", soft: "#f5f3ff", dark: "#4c1d95" },
    JOSEPH: { main: "#06b6d4", soft: "#ecfeff", dark: "#083344" },
    NAPHTALI: { main: "#ec4899", soft: "#fdf2f8", dark: "#831843" },
    ZEBULUN: { main: "#f59e0b", soft: "#fffbeb", dark: "#78350f" },
    GAD: { main: "#64748b", soft: "#f8fafc", dark: "#0f172a" },
    MANASSEH: { main: "#14b8a6", soft: "#f0fdfa", dark: "#134e4a" },
    EPHRAIM: { main: "#84cc16", soft: "#f7fee7", dark: "#365314" },
    BENJAMIN: { main: "#6366f1", soft: "#f5f3ff", dark: "#1e1b4b" },
    REUBEN: { main: "#ef4444", soft: "#fef2f2", dark: "#7f1d1d" },
    default: { main: "#94a3b8", soft: "#f1f5f9", dark: "#334155" }
  };

  return accents[code as string] || accents.default;
}

function getTribeDescription(code: TribeCode) {
  const descriptions: Record<string, string> = {
    LEVI: "adoracao, louvor e criacao de ambientes espirituais para o culto.",
    JUDAH: "lideranca, governo ministerial e conducao de equipes.",
    ASHER: "hospitalidade, acolhimento de novas pessoas e cuidado familiar.",
    ISSACHAR: "entendimento de tempos e epocas, estrategia e planejamento.",
    JOSEPH: "organizacao, gestao de recursos e suporte administrativo.",
    NAPHTALI: "comunicacao criativa, expressao de boas noticias e alegria.",
    ZEBULUN: "mobilizacao missionaria, expansao e projetos externos.",
    GAD: "acao pratica imediata, servico de prontidao e resposta rapida.",
    MANASSEH: "restauracao emocional, cura e cuidado profundo com o proximo.",
    EPHRAIM: "multiplicacao de celulas, crescimento e abertura de frentes.",
    BENJAMIN: "protecao, suporte de seguranca e operacao vigilante.",
    REUBEN: "iniciativa, pioneirismo e descoberta de novas frentes ministeriais."
  };
  return descriptions[code] || "servico e dedicacao ao Reino.";
}
