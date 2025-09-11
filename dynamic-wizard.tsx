```typescript
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { fetchDocumentConfig } from '../api/registry'; // Hypothetical API to get doc_types.py configs

export default function DynamicWizard() {
  const { wizardState, setWizardState } = useStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    // Fetch config for selected document type (e.g., Grant Deed)
    fetchDocumentConfig(wizardState.docType || 'grant-deed-ca').then(config => {
      setSteps(config.steps); // From doc_types.py (e.g., 5 steps for Grant)
    });
  }, [wizardState.docType]);

  const renderStep = () => {
    const step = steps[currentStep - 1];
    if (!step) return <div>Loading...</div>;
    switch (step.id) {
      case 'request_details':
        return <StepRequestDetails />;
      case 'tax':
        return <StepDeclarationsTax />;
      case 'parties_property':
        return <StepPartiesProperty />;
      case 'review':
        return <StepReview />;
      case 'generate':
        return <StepGenerate />;
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div>
      <h1>DeedPro Wizard: {wizardState.docType}</h1>
      {renderStep()}
      <button onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 1}>Back</button>
      <button onClick={() => setCurrentStep(currentStep + 1)} disabled={currentStep === steps.length}>Next</button>
    </div>
  );
}

// Placeholder components (implement based on grant-deed/page.tsx)
const StepRequestDetails = () => <div>Request Details Form</div>;
const StepDeclarationsTax = () => <div>Tax Declaration Form</div>;
const StepPartiesProperty = () => <div>Parties/Property Form</div>;
const StepReview = () => <div>Review Form</div>;
const StepGenerate = () => <div>Generate PDF</div>;