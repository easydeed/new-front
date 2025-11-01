'use client';

import React from 'react';
import { WizardShellV0 } from './_v0/components/WizardShellV0';

// This page is a thin mount that wraps your existing modern wizard engine UI
// with the V0 presentational shell. Keep your existing engine import & usage
// exactly as-is; slot it into <WizardShellV0> children.
export default function CreateDeedV0Page({ children }: { children?: React.ReactNode }) {
  return <WizardShellV0>{children}</WizardShellV0>;
}
