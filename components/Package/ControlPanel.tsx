/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { type MotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { MetaButtonProps } from '../../types/index.tsx';
import Input from '../Core/Input.tsx';
import Select from '../Core/Select.tsx';
import RangeSlider from '../Core/RangeSlider.tsx';
import ColorPicker from '../Core/ColorPicker.tsx';
import Toggle from '../Core/Toggle.tsx';
import Accordion from '../Core/Accordion.tsx';
import ApiInput from '../Core/ApiInput.tsx';

interface ControlPanelProps {
  btnProps: MetaButtonProps;
  onPropChange: (keyOrObj: string | Partial<MetaButtonProps>, value?: any) => void;
  radiusMotionValue: MotionValue<number>;
  onRadiusCommit: (value: number) => void;
  showMeasurements: boolean;
  onToggleMeasurements: () => void;
  showTokens: boolean;
  onToggleTokens: () => void;
  showStyles: boolean;
  onToggleStyles: () => void;
  showSystemSpec: boolean;
  onToggleSystemSpec: () => void;
  // 3D View Props
  view3D: boolean;
  onToggleView3D: () => void;
  layerSpacing: MotionValue<number>;
  viewRotateX: MotionValue<number>;
  viewRotateZ: MotionValue<number>;
  uiMode: 'default' | 'lean';
    onToggleUIMode: () => void;
  showThemeToggle: boolean;
  onToggleThemeButton: () => void;
  isAIControlEnabled: boolean;
  onToggleAIControl: () => void;
  geminiApiKey: string;
  onGeminiApiKeyChange: (key: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  btnProps, 
  onPropChange, 
  radiusMotionValue, 
  onRadiusCommit, 
  showMeasurements, 
  onToggleMeasurements, 
  showTokens,
  onToggleTokens,
  showStyles,
  onToggleStyles,
  showSystemSpec,
  onToggleSystemSpec,
  view3D,
  onToggleView3D,
  layerSpacing,
  viewRotateX,
  viewRotateZ,
  uiMode,
    onToggleUIMode,
  showThemeToggle,
  onToggleThemeButton,
  isAIControlEnabled,
  onToggleAIControl,
  geminiApiKey,
  onGeminiApiKeyChange
}) => {
  const { theme, themeName, setThemeName } = useTheme();

  // Helper to determine current interaction state
  const currentInteraction = btnProps.disabled ? 'disabled' 
    : btnProps.forcedActive ? 'active'
    : btnProps.forcedFocus ? 'focus'
    : btnProps.forcedHover ? 'hover'
    : 'default';

  const handleInteractionChange = (e: any) => {
    const val = e.target.value;
    const updates: Partial<MetaButtonProps> = {
      disabled: false,
      forcedHover: false,
      forcedFocus: false,
      forcedActive: false,
    };
    if (val !== 'default') {
        if (val === 'disabled') updates.disabled = true;
        else if (val === 'hover') updates.forcedHover = true;
        else if (val === 'focus') updates.forcedFocus = true;
        else if (val === 'active') updates.forcedActive = true;
    }
    onPropChange(updates);
  };

  const isButton = btnProps.componentType === 'button';
  const isTertiary = isButton && btnProps.variant === 'tertiary';

  return (
    <>
      <Accordion title="Global" defaultOpen>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
          <Toggle
            label="Lean UI Mode"
            isOn={uiMode === 'lean'}
            onToggle={onToggleUIMode}
          />
          <Toggle
            label="Dark Mode"
            isOn={themeName === 'dark'}
            onToggle={() => setThemeName(themeName === 'dark' ? 'light' : 'dark')}
          />
          <Toggle
            label="Show Theme Toggle"
            isOn={showThemeToggle}
            onToggle={onToggleThemeButton}
          />
        </div>
      </Accordion>

      <Accordion title="Component">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.L'] }}>
          <Select
            label="Component Type"
            value={btnProps.componentType}
            onChange={(e) => onPropChange({ 
                componentType: e.target.value,
                customRadius: e.target.value === 'card' ? '40px' : '56px',
                variant: e.target.value === 'card' ? 'secondary' : 'primary'
            })}
            options={[
              { value: 'button', label: 'Button (Core)' },
              { value: 'card', label: 'Card (Package)' },
            ]}
          />

          <Input
            label={isButton ? "Label" : "Title"}
            value={btnProps.label}
            onChange={(e) => onPropChange('label', e.target.value)}
          />

          {isButton && (
            <div style={{ display: 'flex', gap: theme.spacing['Space.M'] }}>
              <div style={{ flex: 1 }}>
                <Select
                  label="Variant"
                  value={btnProps.variant}
                  onChange={(e) => onPropChange('variant', e.target.value)}
                  options={[
                    { value: 'primary', label: 'Primary' },
                    { value: 'secondary', label: 'Secondary' },
                    { value: 'tertiary', label: 'Tertiary' },
                    { value: 'outline', label: 'Outline' },
                  ]}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Size"
                  value={btnProps.size}
                  onChange={(e) => onPropChange('size', e.target.value)}
                  options={[
                    { value: 'S', label: 'Small (S)' },
                    { value: 'M', label: 'Medium (M)' },
                    { value: 'L', label: 'Large (L)' },
                  ]}
                />
              </div>
            </div>
          )}

          {isButton && (
            <Select
              label="Icon (Phosphor)"
              value={btnProps.icon || ''}
              onChange={(e) => onPropChange('icon', e.target.value)}
              options={[
                  { value: '', label: 'None' },
                  { value: 'ph-sparkle', label: 'Sparkle' },
                  { value: 'ph-heart', label: 'Heart' },
                  { value: 'ph-bell', label: 'Bell' },
                  { value: 'ph-rocket', label: 'Rocket' },
                  { value: 'ph-gear', label: 'Gear' },
              ]}
            />
          )}
        </div>
      </Accordion>

      <Accordion title="Appearance">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.L'] }}>
          <RangeSlider
            label="Corner Radius"
            motionValue={radiusMotionValue}
            onCommit={onRadiusCommit}
            min={0}
            max={56}
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'], width: '100%' }}>
            {!isTertiary && (
              <ColorPicker
                label="Fill Color"
                value={btnProps.customFill || (btnProps.variant === 'primary' ? (themeName === 'dark' ? '#ffffff' : '#111111') : (btnProps.componentType === 'card' ? theme.Color.Base.Surface[1] : 'transparent'))}
                onChange={(e) => onPropChange('customFill', e.target.value)}
              />
            )}
            <ColorPicker
              label="Text Color"
              value={btnProps.customColor || (btnProps.variant === 'primary' ? (themeName === 'dark' ? '#000000' : '#ffffff') : (themeName === 'dark' ? '#ffffff' : '#111111'))}
              onChange={(e) => onPropChange('customColor', e.target.value)}
            />
          </div>
        </div>
      </Accordion>

      <Accordion title="State">
        <div style={{ width: '100%' }}>
          <Select 
              label="Interaction State"
              value={currentInteraction}
              onChange={handleInteractionChange}
              options={[
                  { value: 'default', label: 'Default' },
                  { value: 'hover', label: 'Hover' },
                  { value: 'focus', label: 'Focus' },
                  { value: 'active', label: 'Click' },
                  { value: 'disabled', label: 'Disabled' },
              ]}
          />
        </div>
      </Accordion>

      <Accordion title="Agent">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
          <Toggle
            label="AI Control"
            isOn={isAIControlEnabled}
            onToggle={onToggleAIControl}
          />
          <ApiInput
            label="Gemini API Key"
            value={geminiApiKey}
            onChange={onGeminiApiKeyChange}
            onSave={onGeminiApiKeyChange}
            placeholder="Enter your API key"
          />
        </div>
      </Accordion>

      <Accordion title="Inspector">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
          <Toggle
            label="Show Measurements"
            isOn={showMeasurements}
            onToggle={onToggleMeasurements}
          />
          <Toggle
            label="Show Tokens"
            isOn={showTokens}
            onToggle={onToggleTokens}
          />
          <Toggle
            label="Show Styles"
            isOn={showStyles}
            onToggle={onToggleStyles}
          />
          <Toggle
            label="System Spec"
            isOn={showSystemSpec}
            onToggle={onToggleSystemSpec}
          />
          <Toggle
            label="3D Layer View"
            isOn={view3D}
            onToggle={onToggleView3D}
          />
          
          {view3D && (
            <div style={{ 
              marginTop: theme.spacing['Space.S'], 
              padding: theme.spacing['Space.M'], 
              backgroundColor: theme.Color.Base.Surface[2], 
              borderRadius: theme.radius['Radius.M'],
              border: `1px solid ${theme.Color.Base.Surface[3]}`,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing['Space.M']
            }}>
               <RangeSlider
                label="Layer Spacing"
                motionValue={layerSpacing}
                onCommit={() => {}}
                min={0}
                max={150}
              />
              <RangeSlider
                label="Rotate X"
                motionValue={viewRotateX}
                onCommit={() => {}}
                min={0}
                max={90}
              />
              <RangeSlider
                label="Rotate Z"
                motionValue={viewRotateZ}
                onCommit={() => {}}
                min={0}
                max={360}
              />
            </div>
          )}
        </div>
      </Accordion>
    </>
  );
};

export default ControlPanel;