"use client";

import { useRouter } from "next/navigation";
import { useWizardStore, WIZARD_STEPS, type WizardStep } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { StepConcept } from "./StepConcept";
import { StepAppearance } from "./StepAppearance";
import { StepAnimations } from "./StepAnimations";
import { StepSettings } from "./StepSettings";
import { StepGenerate } from "./StepGenerate";
import { StepComplete } from "./StepComplete";
import {
  ArrowLeft,
  ArrowRight,
  Swords,
  X,
  Lightbulb,
  Palette,
  Film,
  Settings,
  Sparkles,
  CheckCircle,
} from "lucide-react";

const STEP_META: Record<WizardStep, { label: string; icon: React.ElementType }> = {
  concept: { label: "Concept", icon: Lightbulb },
  appearance: { label: "Appearance", icon: Palette },
  animations: { label: "Animations", icon: Film },
  settings: { label: "Settings", icon: Settings },
  generate: { label: "Generate", icon: Sparkles },
  complete: { label: "Complete", icon: CheckCircle },
};

function StepContent({ step }: { step: WizardStep }) {
  switch (step) {
    case "concept":
      return <StepConcept />;
    case "appearance":
      return <StepAppearance />;
    case "animations":
      return <StepAnimations />;
    case "settings":
      return <StepSettings />;
    case "generate":
      return <StepGenerate />;
    case "complete":
      return <StepComplete />;
  }
}

export function CharacterWizard() {
  const router = useRouter();
  const currentStep = useWizardStore((s) => s.currentStep);
  const nextStep = useWizardStore((s) => s.nextStep);
  const prevStep = useWizardStore((s) => s.prevStep);
  const setStep = useWizardStore((s) => s.setStep);
  const reset = useWizardStore((s) => s.reset);

  // Validation for current step
  const characterName = useWizardStore((s) => s.characterName);
  const characterDescription = useWizardStore((s) => s.characterDescription);
  const selectedAnimations = useWizardStore((s) => s.selectedAnimations);
  const isGenerating = useWizardStore((s) => s.isGenerating);
  const animationProgress = useWizardStore((s) => s.animationProgress);

  const currentIdx = WIZARD_STEPS.indexOf(currentStep);
  const isFirst = currentIdx === 0;
  const isLast = currentStep === "complete";

  const canProceed = (() => {
    switch (currentStep) {
      case "concept":
        return characterName.trim().length > 0 && characterDescription.trim().length > 0;
      case "appearance":
        return true; // base sprite is optional
      case "animations":
        return selectedAnimations.length > 0;
      case "settings":
        return true;
      case "generate": {
        const doneCount = animationProgress.filter(
          (ap) => ap.status === "done" || ap.status === "error"
        ).length;
        return !isGenerating && doneCount === animationProgress.length && animationProgress.length > 0;
      }
      case "complete":
        return false; // no "next" from complete
      default:
        return true;
    }
  })();

  function handleClose() {
    reset();
    router.push("/");
  }

  function handleStepClick(step: WizardStep) {
    const targetIdx = WIZARD_STEPS.indexOf(step);
    // Only allow navigating to completed or current steps, and not during generation
    if (targetIdx <= currentIdx && !isGenerating) {
      setStep(step);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Swords className="h-6 w-6 text-accent" />
          <h1 className="text-lg font-bold">Character Wizard</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      {/* Step indicators */}
      <nav className="border-b border-border px-6 py-3 shrink-0">
        <div className="flex items-center justify-center gap-1 max-w-3xl mx-auto">
          {WIZARD_STEPS.map((step, idx) => {
            const meta = STEP_META[step];
            const Icon = meta.icon;
            const isActive = step === currentStep;
            const isCompleted = idx < currentIdx;
            const isClickable = idx <= currentIdx && !isGenerating;

            return (
              <div key={step} className="flex items-center">
                {idx > 0 && (
                  <div
                    className={`w-8 h-px mx-1 ${
                      isCompleted ? "bg-indigo-500" : "bg-zinc-700"
                    }`}
                  />
                )}
                <button
                  onClick={() => handleStepClick(step)}
                  disabled={!isClickable}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50"
                      : isCompleted
                        ? "bg-green-500/10 text-green-400 border border-green-500/30 cursor-pointer hover:bg-green-500/20"
                        : "text-zinc-500 border border-transparent"
                  } ${!isClickable ? "cursor-default" : ""}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{meta.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <StepContent step={currentStep} />
      </main>

      {/* Footer */}
      {currentStep !== "complete" && (
        <footer className="border-t border-border px-6 py-3 shrink-0">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isFirst || isGenerating}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {currentStep !== "generate" && (
              <Button onClick={nextStep} disabled={!canProceed}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
