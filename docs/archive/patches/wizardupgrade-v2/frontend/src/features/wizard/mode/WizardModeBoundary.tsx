'use client';
import React from 'react';

export default class WizardModeBoundary extends React.Component<{ fallback: React.ReactNode }, { hasError: boolean }>{ 
  constructor(props:any){ super(props); this.state={ hasError:false }; }
  static getDerivedStateFromError(){ return { hasError:true }; }
  componentDidCatch(error:any, info:any){ console.error('[WizardModeBoundary]', error, info); }
  render(){ return this.state.hasError ? <>{this.props.fallback}</> : <>{this.props.children}</>; }
}
