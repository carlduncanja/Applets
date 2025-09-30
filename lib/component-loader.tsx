import React from 'react';
import { ComponentRegistry } from './component-registry';

/**
 * Safely loads and executes a React component from string code
 * This is a client-side utility for executing AI-generated components
 * The code MUST use React.createElement() instead of JSX
 */
export function loadComponentFromCode(code: string): React.ComponentType<any> {
  // Get React and hooks
  const { useState, useEffect, useCallback, useMemo, useRef, createElement } = React;
  
  // Destructure shadcn components
  const {
    Button,
    Input,
    Label,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Badge,
    Textarea,
  } = ComponentRegistry;
  
  // Helper function to trigger file input click reliably
  const triggerFileInput = (ref: any) => {
    if (ref && ref.current) {
      // Force click event
      const input = ref.current as HTMLInputElement;
      input.click();
    }
  };
  
  try {
    // Clean the code - remove any import statements since we're providing dependencies
    let cleanCode = code
      .replace(/^import\s+.*?\s+from\s+['"]react['"];?\s*$/gm, '')
      .replace(/^import\s+.*?;?\s*$/gm, '')
      .trim();
    
    // Check if code contains JSX (which we can't execute)
    if (/<[A-Z][a-zA-Z]*|<[a-z]+[\s>]/.test(cleanCode)) {
      throw new Error('Component contains JSX syntax. Please regenerate the app - it should use React.createElement() instead.');
    }
    
    // Extract component name from the code
    // Look for patterns like: const ComponentName = () => { or const ComponentName = function() {
    const componentNameMatch = cleanCode.match(/(?:const|let|var|function)\s+([A-Z][a-zA-Z0-9]*)\s*=/);
    const componentName = componentNameMatch ? componentNameMatch[1] : null;
    
    // Wrap the code to ensure it returns the component
    const wrappedCode = `
      'use strict';
      ${cleanCode}
      
      // Try to return the detected component name first
      ${componentName ? `if (typeof ${componentName} !== 'undefined') return ${componentName};` : ''}
      
      // Fallback: Try common component names
      if (typeof Component !== 'undefined') return Component;
      if (typeof Calculator !== 'undefined') return Calculator;
      if (typeof Browser !== 'undefined') return Browser;
      if (typeof App !== 'undefined') return App;
      if (typeof TodoList !== 'undefined') return TodoList;
      if (typeof Dashboard !== 'undefined') return Dashboard;
      if (typeof Counter !== 'undefined') return Counter;
      if (typeof Form !== 'undefined') return Form;
      if (typeof Timer !== 'undefined') return Timer;
      if (typeof Weather !== 'undefined') return Weather;
      if (typeof Chat !== 'undefined') return Chat;
      if (typeof Game !== 'undefined') return Game;
      
      throw new Error('No React component found. Detected name: ${componentName || 'none'}. Expected a const/let/var starting with capital letter.');
    `;
    
    // Create a function that executes the code with React dependencies and shadcn components
    const ComponentFactory = new Function(
      'React',
      'useState',
      'useEffect', 
      'useCallback',
      'useMemo',
      'useRef',
      'createElement',
      'triggerFileInput',
      // shadcn components
      'Button',
      'Input',
      'Label',
      'Card',
      'CardContent',
      'CardDescription',
      'CardHeader',
      'CardTitle',
      'Badge',
      'Textarea',
      wrappedCode
    );
    
    // Execute and get the component with all dependencies
    const Component = ComponentFactory(
      React,
      useState,
      useEffect,
      useCallback,
      useMemo,
      useRef,
      React.createElement,
      triggerFileInput,
      // shadcn components
      Button,
      Input,
      Label,
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
      Badge,
      Textarea
    );
    
    if (typeof Component !== 'function') {
      throw new Error('Generated code did not return a valid React component function');
    }
    
    return Component;
  } catch (error: any) {
    console.error('Component loading error:', error);
    console.error('Code that failed:', code);
    throw error;
  }
}

/**
 * Error boundary component for catching component rendering errors
 */
export class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 border border-destructive rounded-lg bg-destructive/10">
            <h3 className="font-semibold text-destructive mb-2">
              Component Error
            </h3>
            <p className="text-sm text-destructive/80 mb-2">
              {this.state.error?.message || 'An error occurred while rendering the component'}
            </p>
            <details className="text-xs text-destructive/60">
              <summary className="cursor-pointer hover:text-destructive/80">View details</summary>
              <pre className="mt-2 p-2 bg-destructive/5 rounded overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        )
      );
    }

    return this.props.children;
  }
}