/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ButtonVariant, ButtonSize } from '../components/Core/Button.tsx';

// --- Window Management ---
export type WindowId = 'control' | 'code' | 'console' | 'styles' | 'systemSpec' | 'ai' | 'settings';

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
export type FeedbackVariant = 'Success' | 'Warning' | 'Error' | 'Focus' | 'Active';

// --- Component Type ---
export type ComponentType = 'button' | 'card' | 'custom' | 'slot' | 'nametag' | 'slider';

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
    enableSuccess?: boolean;
    
    // Card Staged Component Props
    cardSubtitle?: string;
    cardBodyText?: string;
    showCardMedia?: boolean;
    cardMediaHeight?: number;
    cardHoverTilt?: boolean;

    // Slider Staged Component Props
    sliderMin?: number;
    sliderMax?: number;
    sliderStep?: number;
    sliderDefaultValue?: number;
    sliderShowCounter?: boolean;

    // NameTag Staged Component Props
    tagName?: string;
    tagRole?: string;
    tagHeaderText?: string;
    tagSubHeaderText?: string;
    tagLevel?: string;
    tagBadgeText?: string;
    tagHeaderColor?: string;
    tagPunchHole?: boolean;

    // Slot Staged Component Props
    slotCubeSpeed?: number;
    slotCubeColor?: string;
    slotCubeScale?: number;
    slotAmbientIntensity?: number;
    slotEnableSky?: boolean;
    slotShowFps?: boolean;
}

export type MetaButtonProps = MetaComponentProps; // Alias for backward compatibility
