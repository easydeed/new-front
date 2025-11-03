import React from 'react';

type Props = {
  children: React.ReactNode;
  currentStep?: number; // Optional: Current step number for header
  totalSteps?: number; // Optional: Total steps for header
  stepTitle?: string; // Optional: Title for this step
  stepDescription?: string; // Optional: Description for this step
};

/**
 * StepShell - Modern container component for wizard steps
 * Provides consistent spacing, layout, and step header for Q&A UI
 * 
 * ✅ Phase 24-F: Enhanced with V0 UI styling (spacious max-w-5xl layout)
 */
export default function StepShell({ children, currentStep, totalSteps, stepTitle, stepDescription }: Props) {
  const showHeader = currentStep && totalSteps && stepTitle;

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-6 lg:px-8 py-8 md:py-12">
      {showHeader ? (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          {/* Step Header */}
          <div className="border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white px-6 md:px-8 py-6">
            <div className="flex items-center gap-4">
              {/* Step Badge */}
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-[#7C4DFF] to-[#6a3de8] flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-xl md:text-2xl font-bold text-white">{currentStep}</span>
              </div>

              {/* Step Title */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-500 font-medium">
                  Step {currentStep} of {totalSteps}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 truncate">{stepTitle}</h2>
                {stepDescription && <p className="text-sm text-slate-600 mt-1">{stepDescription}</p>}
              </div>
            </div>
          </div>

          {/* Step Body */}
          <div className="p-6 md:p-8 lg:p-10">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
