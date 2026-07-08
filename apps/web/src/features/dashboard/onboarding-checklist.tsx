"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight, Rocket, Smartphone, X } from "lucide-react";
import { usePlan } from "../../../contexts/PlanContext";

// Primeiros passos de uma igreja recém-cadastrada. Cada passo é medido em
// dados reais (não em cliques): cadastrou membro, o passo fecha sozinho.
// Desaparece quando tudo está feito ou quando o usuário oculta (por org).

interface OnboardingChecklistProps {
  organizationId: string;
  peopleCount: number;
  groupsCount: number;
  eventsCount: number;
  visitorsCount: number;
}

interface Step {
  id: string;
  title: string;
  detail: string;
  href: string;
  done: boolean;
}

function dismissKey(organizationId: string) {
  return `esdras.onboarding.dismissed.${organizationId}`;
}

function appStepKey(organizationId: string) {
  return `esdras.onboarding.app.${organizationId}`;
}

export function OnboardingChecklist({
  organizationId,
  peopleCount,
  groupsCount,
  eventsCount,
  visitorsCount,
}: OnboardingChecklistProps) {
  const { hasFeature, ready } = usePlan();
  const [dismissed, setDismissed] = useState(true);
  const [appStepDone, setAppStepDone] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey(organizationId)) === "1");
    setAppStepDone(localStorage.getItem(appStepKey(organizationId)) === "1");
  }, [organizationId]);

  if (!ready || dismissed) return null;

  const steps: Step[] = [
    {
      id: "members",
      title: "Cadastre seus primeiros membros",
      detail: "Comece pela liderança e pelas famílias mais próximas.",
      href: "/members/new",
      done: peopleCount > 0,
    },
    {
      id: "reception",
      title: "Registre um visitante na recepção",
      detail: "No próximo culto, anote quem chegou pela primeira vez.",
      href: "/reception",
      done: visitorsCount > 0,
    },
    ...(hasFeature("groups")
      ? [{
          id: "groups",
          title: "Crie sua primeira célula",
          detail: "Vincule membros e acompanhe os encontros.",
          href: "/groups",
          done: groupsCount > 0,
        }]
      : []),
    ...(hasFeature("events")
      ? [{
          id: "events",
          title: "Agende o próximo culto ou evento",
          detail: "A agenda aparece automaticamente no app dos membros.",
          href: "/events",
          done: eventsCount > 0,
        }]
      : []),
    {
      id: "app",
      title: "Conheça o app do membro",
      detail: "É por ele que sua igreja vê agenda, células e pedidos de oração.",
      href: "/me",
      done: appStepDone,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  function dismiss() {
    localStorage.setItem(dismissKey(organizationId), "1");
    setDismissed(true);
  }

  function markAppStep() {
    localStorage.setItem(appStepKey(organizationId), "1");
    setAppStepDone(true);
  }

  return (
    <section style={{
      background: "var(--color-background-primary, #fff)",
      border: "0.5px solid var(--color-border-tertiary, #e5e7eb)",
      borderRadius: 16,
      padding: "1.25rem 1.5rem",
      marginBottom: "1.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Rocket size={18} style={{ color: "#7c3aed" }} />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Primeiros passos da sua igreja</h2>
        <span style={{
          fontSize: 12, color: "var(--color-text-secondary, #6b7280)",
          background: "var(--color-background-secondary, #f3f4f6)",
          padding: "2px 10px", borderRadius: 999,
        }}>
          {doneCount} de {steps.length}
        </span>
        <button
          onClick={dismiss}
          title="Ocultar primeiros passos"
          style={{
            marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-tertiary, #9ca3af)", padding: 4, display: "flex",
          }}
        >
          <X size={16} />
        </button>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>
        Complete estes passos e sua igreja já estará operando na plataforma.
      </p>

      <div style={{
        height: 6, borderRadius: 999, background: "var(--color-background-secondary, #f3f4f6)",
        marginBottom: 16, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 999, background: "#7c3aed",
          width: `${Math.round((doneCount / steps.length) * 100)}%`,
          transition: "width 0.4s ease",
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            onClick={step.id === "app" ? markAppStep : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "0.6rem 0.75rem", borderRadius: 10, textDecoration: "none",
              color: "inherit",
              opacity: step.done ? 0.55 : 1,
              background: step.done ? "transparent" : "var(--color-background-secondary, #f9fafb)",
            }}
          >
            {step.done
              ? <CheckCircle2 size={19} style={{ color: "#1b8a4a", flexShrink: 0 }} />
              : step.id === "app"
                ? <Smartphone size={19} style={{ color: "#7c3aed", flexShrink: 0 }} />
                : <Circle size={19} style={{ color: "var(--color-text-tertiary, #9ca3af)", flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 500,
                textDecoration: step.done ? "line-through" : "none",
              }}>
                {step.title}
              </div>
              {!step.done && (
                <div style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7280)" }}>
                  {step.detail}
                </div>
              )}
            </div>
            {!step.done && <ChevronRight size={16} style={{ color: "var(--color-text-tertiary, #9ca3af)", flexShrink: 0 }} />}
          </Link>
        ))}
      </div>
    </section>
  );
}
