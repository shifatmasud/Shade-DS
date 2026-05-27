/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';
import { type MotionValue, useMotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { MetaButtonProps } from '../../types/index.tsx';
import Input from '../Core/Input.tsx';
import Select from '../Core/Select.tsx';
import RangeSlider from '../Core/RangeSlider.tsx';
import ColorPicker from './ColorPicker.tsx';
import Toggle from '../Core/Toggle.tsx';
import Accordion from '../Core/Accordion.tsx';
import ApiInput from '../Core/ApiInput.tsx';

// SAFETY: Track error logs and wrap dynamic control loads
import { ControlType } from '../framer-shims.ts';
import Button from '../Core/Button.tsx';
import Card from './Card.tsx';
import NameTag from './NameTag.tsx';
import Slot from './Slot.tsx';

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

interface RangeSliderControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
}

const RangeSliderControl: React.FC<RangeSliderControlProps> = React.memo(({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange
}) => {
  const mValue = useMotionValue(value);
  
  useEffect(() => {
    mValue.set(value);
  }, [value, mValue]);

  return (
    <RangeSlider
      label={label}
      motionValue={mValue}
      min={min}
      max={max}
      onChange={(v) => {
        const s = step || 1;
        const steppedValue = Math.round(v / s) * s;
        mValue.set(steppedValue);
      }}
      onCommit={(v) => {
        const s = step || 1;
        const steppedValue = Math.round(v / s) * s;
        onChange(steppedValue);
      }}
    />
  );
});

RangeSliderControl.displayName = 'RangeSliderControl';

const getComponent = (type: string): any => {
  if (type === 'button') return Button;
  if (type === 'card') return Card;
  if (type === 'nametag') return NameTag;
  if (type === 'slot') return Slot;
  return null;
};

export const getDefaultProps = (propertyControls: any) => {
  const defaults: any = {};
  if (!propertyControls) return defaults;
  for (const [key, control] of Object.entries<any>(propertyControls)) {
    if (control.type === 'object' || control.type === ControlType.Object) {
      defaults[key] = getDefaultProps(control.controls);
    } else if (control.defaultValue !== undefined) {
      defaults[key] = control.defaultValue;
    }
  }
  return defaults;
};

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

  const activeComponent = getComponent(btnProps.componentType);
  const propertyControls = activeComponent?.propertyControls || {};

  // Render a specific property control element mapping to Core structures
  const renderControl = (key: string, control: any, parentKey?: string) => {
    try {
      const value = parentKey 
        ? (btnProps[parentKey]?.[key] !== undefined ? btnProps[parentKey][key] : control.defaultValue)
        : (btnProps[key] !== undefined ? btnProps[key] : control.defaultValue);

      const handleChange = (newVal: any) => {
        if (parentKey) {
          const parentVal = btnProps[parentKey] || {};
          onPropChange(parentKey, {
            ...parentVal,
            [key]: newVal
          });
        } else {
          onPropChange(key, newVal);
        }
      };

      switch (control.type) {
        case 'string':
        case ControlType.String:
          return (
            <Input
              key={parentKey ? `${parentKey}.${key}` : key}
              label={control.title || key}
              value={value ?? ''}
              onChange={(e) => handleChange(e.target.value)}
            />
          );

        case 'boolean':
        case ControlType.Boolean:
          return (
            <Toggle
              key={parentKey ? `${parentKey}.${key}` : key}
              label={control.title || key}
              isOn={Boolean(value)}
              onToggle={() => handleChange(!value)}
            />
          );

        case 'number':
        case ControlType.Number:
          return (
            <RangeSliderControl
              key={parentKey ? `${parentKey}.${key}` : key}
              label={control.title || key}
              value={value ?? control.defaultValue ?? 0}
              min={control.min ?? 0}
              max={control.max ?? 100}
              step={control.step ?? 1}
              onChange={handleChange}
            />
          );

        case 'color':
        case ControlType.Color:
          return (
            <ColorPicker
              key={parentKey ? `${parentKey}.${key}` : key}
              label={control.title || key}
              value={value ?? ''}
              onChange={(e) => handleChange(e.target.value)}
            />
          );

        case 'enum':
        case ControlType.Enum:
          const options = (control.options || []).map((opt: any, idx: number) => ({
            value: opt,
            label: control.optionTitles ? control.optionTitles[idx] || opt : opt
          }));
          return (
            <Select<any>
              key={parentKey ? `${parentKey}.${key}` : key}
              label={control.title || key}
              value={value ?? ''}
              onChange={(e) => handleChange(e.target.value)}
              options={options}
            />
          );

        case 'object':
        case ControlType.Object:
          // SHADE DSL COMPLIANT REWRITE: ControlType.Object is mapped to Accordion 
          return (
            <Accordion 
              key={key} 
              title={control.title || key} 
              defaultOpen={true}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.L'] }}>
                {Object.entries(control.controls || {}).map(([subKey, subControl]) => 
                  renderControl(subKey, subControl, key)
                )}
              </div>
            </Accordion>
          );

        default:
          return null;
      }
    } catch (err) {
      console.error(`Error rendering property control ${key}:`, err);
      return null;
    }
  };

  // Divide controls between simple controls (render inside Component block) and objects (render as separate Accordions)
  const topLevelControls: Array<[string, any]> = [];
  const objectLevelControls: Array<[string, any]> = [];

  Object.entries(propertyControls).forEach(([key, control]: [string, any]) => {
    if (control.type === 'object' || control.type === ControlType.Object) {
      objectLevelControls.push([key, control]);
    } else {
      topLevelControls.push([key, control]);
    }
  });

  return (
    <>
      <Accordion title="Global" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
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

      <Accordion title="Component" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.L'] }}>
          <Select<any>
            label="Component Type"
            value={btnProps.componentType}
            onChange={(e) => {
              const nextType = e.target.value;
              const component = getComponent(nextType);
              const defaults = component && component.propertyControls ? getDefaultProps(component.propertyControls) : {};
              onPropChange({ 
                componentType: nextType,
                ...defaults
              });
            }}
            options={[
              { value: 'button', label: 'Button (Core)' },
              { value: 'card', label: 'Card (Package)' },
              { value: 'nametag', label: 'Name Tag (Package)' },
              { value: 'slot', label: 'Slot (Viewport)' },
            ]}
          />

          {topLevelControls.map(([key, control]) => renderControl(key, control))}
        </div>
      </Accordion>

      {/* Render each nested dynamic object control as an Accordion! */}
      {objectLevelControls.map(([key, control]) => renderControl(key, control))}

      <Accordion title="State">
        <div style={{ width: '100%' }}>
          <Select<any> 
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
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
              marginTop: theme.space['Space.S'], 
              padding: theme.space['Space.M'], 
              backgroundColor: theme.Color.Base.Surface[2], 
              borderRadius: theme.radius['Radius.M'],
              border: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[3]}`,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.space['Space.M']
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
