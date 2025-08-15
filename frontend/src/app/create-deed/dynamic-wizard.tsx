import { motion } from 'framer-motion';
import PropertySearchComponent from '../../components/PropertySearchComponent';

interface DynamicWizardProps {
  currentStep: number;
  docType: string;
  formData: any;
  customPrompt: string;
  loading: boolean;
  errors: any;
  onPropertyVerified: (data: any) => void;
  onDocTypeChange: (type: string) => void;
  onButtonPrompt: (type: string) => void;
  onCustomPrompt: () => void;
  onCustomPromptChange: (value: string) => void;
  onStepChange: (step: number) => void;
  onInputChange: (e: any) => void;
  onGenerate: () => void;
}

const DOC_TYPES = {
  grant_deed: {
    label: 'Grant Deed',
    fields: ['consideration'],
    buttons: ['vesting', 'grant_deed', 'tax_roll'],
    required: ['granteeName', 'consideration']
  },
  quit_claim: {
    label: 'Quitclaim Deed', 
    fields: [],
    buttons: ['vesting'],
    required: ['granteeName']
  },
  interspousal_transfer: {
    label: 'Interspousal Transfer',
    fields: ['spouse'],
    buttons: ['vesting'],
    required: ['spouse']
  },
  warranty_deed: {
    label: 'Warranty Deed',
    fields: ['covenants'],
    buttons: ['grant_deed'],
    required: ['granteeName', 'covenants']
  },
  tax_deed: {
    label: 'Tax Deed',
    fields: ['buyer'],
    buttons: ['tax_roll'],
    required: ['buyer']
  },
  property_profile: {
    label: 'Property Profile Report',
    fields: [],
    buttons: ['vesting', 'grant_deed', 'tax_roll'],
    required: []
  }
};

export default function DynamicWizard({
  currentStep,
  docType,
  formData,
  customPrompt,
  loading,
  errors,
  onPropertyVerified,
  onDocTypeChange,
  onButtonPrompt,
  onCustomPrompt,
  onCustomPromptChange,
  onStepChange,
  onInputChange,
  onGenerate
}: DynamicWizardProps) {

  return (
    <>
      {/* Step 1: Address Verification */}
      {currentStep === 1 && (
        <motion.div
          key="step1"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h2 className="text-2xl font-bold mb-6">Property Address</h2>
          <PropertySearchComponent onVerified={onPropertyVerified} />
        </motion.div>
      )}

      {/* Step 2: Document Type & Data Prompts */}
      {currentStep === 2 && (
        <motion.div
          key="step2"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h2 className="text-2xl font-bold mb-6">Document Type & Data</h2>
          
          {/* Document Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => onDocTypeChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select document type...</option>
              {Object.entries(DOC_TYPES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Button Prompts */}
          {docType && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">
                Quick Data Pulls
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DOC_TYPES[docType as keyof typeof DOC_TYPES].buttons.map((buttonType) => (
                  <button
                    key={buttonType}
                    onClick={() => onButtonPrompt(buttonType)}
                    disabled={loading}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {buttonType === 'vesting' && 'Pull Vesting'}
                    {buttonType === 'grant_deed' && 'Pull Grant History'}
                    {buttonType === 'tax_roll' && 'Pull Tax Roll'}
                    {buttonType === 'all' && 'Pull All Data'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Prompt */}
          {docType && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Custom Request
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => onCustomPromptChange(e.target.value)}
                  placeholder="e.g., 'pull chain of title'"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={onCustomPrompt}
                  disabled={loading || !customPrompt.trim()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Pull
                </button>
              </div>
              {errors.custom && (
                <p className="text-red-600 text-sm mt-2">{errors.custom}</p>
              )}
            </div>
          )}

          {/* Errors */}
          {errors.prompt && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.prompt}</p>
            </div>
          )}

          {/* Continue Button */}
          {docType && (
            <button
              onClick={() => onStepChange(3)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue to Review
            </button>
          )}
        </motion.div>
      )}

      {/* Step 3: Dynamic Fields & Review */}
      {currentStep === 3 && (
        <motion.div
          key="step3"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h2 className="text-2xl font-bold mb-6">Review & Generate</h2>
          
          {/* Dynamic Fields based on doc type */}
          {docType && DOC_TYPES[docType as keyof typeof DOC_TYPES].fields.map((field) => (
            <div key={field} className="mb-4">
              <label className="block text-sm font-medium mb-2 capitalize">
                {field.replace('_', ' ')}
              </label>
              <input
                type="text"
                name={field}
                value={formData[field] || ''}
                onChange={onInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          {/* Standard fields that all deeds need */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Grantor (Seller)</label>
            <input
              type="text"
              name="grantorName"
              value={formData.grantorName || ''}
              onChange={onInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Grantee (Buyer)</label>
            <input
              type="text"
              name="granteeName"
              value={formData.granteeName || ''}
              onChange={onInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Generate {DOC_TYPES[docType as keyof typeof DOC_TYPES]?.label}
          </button>
        </motion.div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Fetching data...</p>
          </div>
        </div>
      )}
    </>
  );
}
