'use client';

import React, { useState, useEffect } from 'react';

interface WizardFlowManagerProps {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  formData: any;
  validation: any;
  onAutoSave: () => void;
  lastSaved?: string | null;
}

export default function WizardFlowManager({
  currentStep,
  totalSteps,
  onStepChange,
  formData,
  validation,
  onAutoSave,
  lastSaved
}: WizardFlowManagerProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepProgress, setStepProgress] = useState<Record<number, number>>({});

  // Calculate step completion
  useEffect(() => {
    const newProgress: Record<number, number> = {};
    const completed: number[] = [];

    // Step 1: Deed Type
    if (formData.deedType) {
      newProgress[1] = 100;
      completed.push(1);
    } else {
      newProgress[1] = 0;
    }

    // Step 2: Property Information
    const step2Fields = ['propertySearch', 'county', 'apn'];
    const step2Completed = step2Fields.filter(field => formData[field]?.trim()).length;
    newProgress[2] = Math.round((step2Completed / step2Fields.length) * 100);
    if (newProgress[2] >= 67) completed.push(2); // At least 2/3 fields

    // Step 3: Parties & Recording
    const step3Fields = ['grantorName', 'granteeName', 'recordingRequestedBy'];
    const step3Completed = step3Fields.filter(field => formData[field]?.trim()).length;
    newProgress[3] = Math.round((step3Completed / step3Fields.length) * 100);
    if (newProgress[3] >= 67) completed.push(3);

    // Step 4: Transfer Tax
    const step4Fields = ['salesPrice', 'documentaryTax'];
    const step4Completed = step4Fields.filter(field => formData[field]?.trim()).length;
    newProgress[4] = step4Completed > 0 ? 100 : 0; // At least one field
    if (newProgress[4] > 0) completed.push(4);

    // Step 5: Notary (optional but recommended)
    const step5Fields = ['notaryName', 'notaryCounty'];
    const step5Completed = step5Fields.filter(field => formData[field]?.trim()).length;
    newProgress[5] = Math.round((step5Completed / step5Fields.length) * 100);
    if (newProgress[5] >= 50) completed.push(5);

    setStepProgress(newProgress);
    setCompletedSteps(completed);
  }, [formData]);

  // Auto-save trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      onAutoSave();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [formData, onAutoSave]);

  const getStepStatus = (step: number) => {
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'current';
    if (step < currentStep) return 'visited';
    return 'upcoming';
  };

  const getStepIcon = (step: number) => {
    const status = getStepStatus(step);
    const progress = stepProgress[step] || 0;

    if (status === 'completed') return '✅';
    if (status === 'current') return '📝';
    if (status === 'visited' && progress > 0) return '⏳';
    return '⭕';
  };

  const canNavigateToStep = (step: number) => {
    // Can always go back to previous steps
    if (step <= currentStep) return true;
    
    // Can go forward if previous step is reasonably complete
    if (step === currentStep + 1) {
      const prevProgress = stepProgress[currentStep] || 0;
      return prevProgress >= 50; // At least 50% complete
    }
    
    return false;
  };

  const handleStepClick = (step: number) => {
    if (canNavigateToStep(step)) {
      onStepChange(step);
    }
  };

  const getNextStepSuggestion = () => {
    const currentProgress = stepProgress[currentStep] || 0;
    
    if (currentProgress < 50) {
      return `Complete more fields in this step to continue`;
    }
    
    if (currentStep < totalSteps) {
      return `Ready for Step ${currentStep + 1}`;
    }
    
    return `Ready to preview your deed`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg mb-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Step {currentStep} of {totalSteps}
          </h3>
          <p className="text-sm text-gray-600">
            {getNextStepSuggestion()}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Auto-save indicator */}
          {lastSaved && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Saved {lastSaved}</span>
            </div>
          )}
          
          {/* Overall progress */}
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">
              {Math.round((completedSteps.length / totalSteps) * 100)}% Complete
            </div>
            <div className="text-xs text-gray-500">
              {completedSteps.length} of {totalSteps} steps
            </div>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200">
          <div 
            className="h-full bg-tertiary transition-all duration-500 ease-out"
            style={{ 
              width: `${(completedSteps.length / totalSteps) * 100}%` 
            }}
          />
        </div>

        {/* Step Circles */}
        <div className="relative flex justify-between">
          {Array.from({ length: totalSteps }, (_, index) => {
            const step = index + 1;
            const status = getStepStatus(step);
            const progress = stepProgress[step] || 0;
            const canNavigate = canNavigateToStep(step);

            return (
              <div key={step} className="flex flex-col items-center">
                {/* Step Circle */}
                <button
                  onClick={() => handleStepClick(step)}
                  disabled={!canNavigate}
                  className={`
                    relative w-12 h-12 rounded-full border-2 transition-all duration-300 
                    flex items-center justify-center text-lg font-bold
                    ${status === 'completed' 
                      ? 'bg-tertiary border-tertiary text-white shadow-lg' 
                      : status === 'current'
                      ? 'bg-white border-tertiary text-tertiary shadow-lg ring-4 ring-blue-100'
                      : status === 'visited'
                      ? 'bg-gray-100 border-gray-300 text-gray-600'
                      : 'bg-white border-gray-200 text-gray-400'
                    }
                    ${canNavigate ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                  `}
                  title={`Step ${step}${!canNavigate ? ' (complete current step first)' : ''}`}
                >
                  <span className="text-sm">{getStepIcon(step)}</span>
                  
                  {/* Progress Ring for current step */}
                  {status === 'current' && progress > 0 && progress < 100 && (
                    <div className="absolute inset-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                        <circle
                          cx="24"
                          cy="24"
                          r="22"
                          fill="none"
                          stroke="rgba(59, 130, 246, 0.2)"
                          strokeWidth="2"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="22"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          strokeDasharray={`${progress * 1.38} 138`}
                          className="transition-all duration-500"
                        />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <div className={`text-xs font-medium ${
                    status === 'current' ? 'text-tertiary' : 'text-gray-600'
                  }`}>
                    Step {step}
                  </div>
                  {progress > 0 && progress < 100 && (
                    <div className="text-xs text-gray-500">
                      {progress}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-3">
          <button
            onClick={() => onStepChange(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ← Previous
          </button>
          
          {currentStep < totalSteps && (
            <button
              onClick={() => onStepChange(currentStep + 1)}
              disabled={!canNavigateToStep(currentStep + 1)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                canNavigateToStep(currentStep + 1)
                  ? 'bg-tertiary text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Next →
            </button>
          )}
        </div>

        {/* Step-specific help */}
        <div className="text-xs text-gray-500 max-w-xs text-right">
          {currentStep === 1 && "Choose the type of deed you need to create"}
          {currentStep === 2 && "Search by address to auto-populate property details"}
          {currentStep === 3 && "Enter the parties involved and recording information"}
          {currentStep === 4 && "Specify the transfer tax and consideration details"}
          {currentStep === 5 && "Add notary information and review your deed"}
        </div>
      </div>
    </div>
  );
}
