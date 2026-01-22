'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, Circle, ChevronDown } from 'lucide-react';

export type SectionStatus = 'complete' | 'warning' | 'empty' | 'error';

interface InputSectionProps {
  id: string;
  title: string;
  status: SectionStatus;
  preview: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: ReactNode;
}

const STATUS_CONFIG = {
  complete: {
    icon: Check,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-200',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
  },
  empty: {
    icon: Circle,
    iconColor: 'text-gray-300',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  error: {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
  },
};

export function InputSection({
  id,
  title,
  status,
  preview,
  isExpanded,
  onToggle,
  badge,
  children,
}: InputSectionProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div
      id={id}
      className={`
        rounded-xl border-2 overflow-hidden transition-all duration-200
        ${isExpanded ? 'border-brand-400 shadow-lg' : config.borderColor}
      `}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between p-4
          transition-colors duration-150
          ${isExpanded ? 'bg-brand-50' : 'bg-white hover:bg-gray-50'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{title}</span>
              {badge && (
                <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {!isExpanded && preview && (
              <p className="text-sm text-gray-500 truncate max-w-[280px] mt-0.5">
                {preview}
              </p>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="p-4 pt-2 border-t border-gray-100 bg-white overflow-visible">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

