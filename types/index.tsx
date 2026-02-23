/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ButtonVariant, ButtonSize } from '../components/Core/Button.tsx';

// --- Window Management ---
export type WindowId = 'control' | 'code' | 'console' | 'styles' | 'systemSpec' | 'ai';

export interface WindowState {
  id: WindowId;
  title: string;
  isOpen: boolean;
  zIndex: number;
  x: number;
  y: number;
  height: number;
}

// --- Console Logging ---
export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
}

// --- Feedback Variant ---
export type FeedbackVariant = 'Success' | 'Warning' | 'Error' | 'Focus' | 'Signal';

// --- Component Type ---
export type ComponentType = 'button' | 'card' | 'custom';

// --- Props for Meta Prototype ---
export interface MetaComponentProps {
    componentType: ComponentType;
    label: string;
    variant: ButtonVariant;
    size: ButtonSize;
    icon: string;
    customFill: string;
    customColor: string;
    customRadius: string;
    customCode?: string;
    // States
    disabled: boolean;
    forcedHover: boolean;
    forcedFocus: boolean;
    forcedActive: boolean;
}

export type MetaButtonProps = MetaComponentProps; // Alias for backward compatibility
