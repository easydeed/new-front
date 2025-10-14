'use client';
import { useState } from 'react';
export function usePromptValidation(){
  const [error, setError] = useState<string|null>(null);
  function run(validate?: (v:any, s:any)=>string|null, value?: any, state?: any){
    if (!validate) { setError(null); return true; }
    const msg = validate(value, state);
    setError(msg);
    return !msg;
  }
  return { error, run, setError };
}
