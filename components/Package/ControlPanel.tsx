/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion, type MotionValue, useMotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { MetaButtonProps } from '../../types/index.tsx';
import Input from '../Core/Input.tsx';
import Select from '../Core/Select.tsx';
import RangeSlider from '../Core/RangeSlider.tsx';
import ColorPicker from './ColorPicker.tsx';
import Toggle from '../Core/Toggle.tsx';
import Accordion from '../Core/Accordion.tsx';
import ApiInput from './ApiInput.tsx';

interface ControlPanelProps {
  stagedProps: MetaButtonProps;
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
  showConfetti: boolean;
  onToggleConfetti: () => void;
  enableSound: boolean;
  onToggleSound: () => void;
}

// Removed custom PropSlider component, using core RangeSlider component instead

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  stagedProps, 
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
  onGeminiApiKeyChange,
  showConfetti,
  onToggleConfetti,
  enableSound,
  onToggleSound,
}) => {
  const { theme, themeName, setThemeName } = useTheme();

  // Stable MotionValues for control properties
  const cardMediaHeightMV = useMotionValue(stagedProps.cardMediaHeight ?? 200);
  const sliderMinMV = useMotionValue(stagedProps.sliderMin ?? 0);
  const sliderMaxMV = useMotionValue(stagedProps.sliderMax ?? 100);
  const sliderStepMV = useMotionValue(stagedProps.sliderStep ?? 1);
  const sliderDefaultValueMV = useMotionValue(stagedProps.sliderDefaultValue ?? 70);
  const slotCubeSpeedMV = useMotionValue(stagedProps.slotCubeSpeed ?? 1);
  const slotCubeScaleMV = useMotionValue(stagedProps.slotCubeScale ?? 2);
  const slotAmbientIntensityMV = useMotionValue(stagedProps.slotAmbientIntensity ?? 0.25);

  React.useEffect(() => {
    cardMediaHeightMV.set(stagedProps.cardMediaHeight ?? 200);
  }, [stagedProps.cardMediaHeight, cardMediaHeightMV]);

  React.useEffect(() => {
    sliderMinMV.set(stagedProps.sliderMin ?? 0);
  }, [stagedProps.sliderMin, sliderMinMV]);

  React.useEffect(() => {
    sliderMaxMV.set(stagedProps.sliderMax ?? 100);
  }, [stagedProps.sliderMax, sliderMaxMV]);

  React.useEffect(() => {
    sliderStepMV.set(stagedProps.sliderStep ?? 1);
  }, [stagedProps.sliderStep, sliderStepMV]);

  React.useEffect(() => {
    sliderDefaultValueMV.set(stagedProps.sliderDefaultValue ?? 70);
  }, [stagedProps.sliderDefaultValue, sliderDefaultValueMV]);

  React.useEffect(() => {
    slotCubeSpeedMV.set(stagedProps.slotCubeSpeed ?? 1);
  }, [stagedProps.slotCubeSpeed, slotCubeSpeedMV]);

  React.useEffect(() => {
    slotCubeScaleMV.set(stagedProps.slotCubeScale ?? 2);
  }, [stagedProps.slotCubeScale, slotCubeScaleMV]);

  React.useEffect(() => {
    slotAmbientIntensityMV.set(stagedProps.slotAmbientIntensity ?? 0.25);
  }, [stagedProps.slotAmbientIntensity, slotAmbientIntensityMV]);

  // Helper to determine current interaction state
  const currentInteraction = stagedProps.disabled ? 'disabled' 
    : stagedProps.forcedActive ? 'active'
    : stagedProps.forcedFocus ? 'focus'
    : stagedProps.forcedHover ? 'hover'
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

  const isButton = stagedProps.componentType === 'button';
  const isTertiary = isButton && stagedProps.variant === 'tertiary';

  return (
    <>
      <Accordion title="Global" defaultOpen>
        <motion.div layout="position" style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
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
          <Toggle
            label="Show Confetti"
            isOn={showConfetti}
            onToggle={onToggleConfetti}
          />
          <Toggle
            label="Trigger Sound"
            isOn={enableSound}
            onToggle={onToggleSound}
          />
        </motion.div>
      </Accordion>

      <Accordion title="Component">
        <motion.div layout="position" style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.L'] }}>
          <Select<any>
            label="Component Type"
            value={stagedProps.componentType}
            onChange={(e) => onPropChange({ 
                componentType: e.target.value,
                /* 
                 * SHADE DSL CARDS CORNER RADIUS REWRITE:
                 * - Preset Cards corner radius to 40px on type switch.
                 * - To undo: change '40px' back to theme.radius['Radius.XL'] || theme.radius['Radius.XL'].
                 */
                customRadius: e.target.value === 'nametag' ? theme.radius['Radius.L'] : e.target.value === 'card' ? '40px' : e.target.value === 'slot' ? '0px' : e.target.value === 'custom' ? theme.radius['Radius.M'] : theme.height['Height.L'],
                variant: e.target.value === 'nametag' || e.target.value === 'card' ? 'secondary' : 'primary'
            })}
            options={[
              { value: 'button', label: 'Button (Core)' },
              { value: 'card', label: 'Card (Package)' },
              { value: 'slider', label: 'Fill Slider (Staged)' },
              { value: 'nametag', label: 'Name Tag (Package)' },
              { value: 'custom', label: 'Custom (Code)' },
              { value: 'slot', label: 'Slot (Viewport)' },
            ]}
          />

          {/* 1. Button Core Props */}
          {stagedProps.componentType === 'button' && (
            <>
              <Input
                label="Label"
                value={stagedProps.label}
                onChange={(e) => onPropChange('label', e.target.value)}
              />
              <div style={{ display: 'flex', gap: theme.space['Space.M'] }}>
                <div style={{ flex: 1 }}>
                  <Select<any>
                    label="Variant"
                    value={stagedProps.variant}
                    onChange={(e) => onPropChange('variant', e.target.value)}
                    options={[
                      { value: 'primary', label: 'Primary' },
                      { value: 'secondary', label: 'Secondary' },
                      { value: 'tertiary', label: 'Tertiary' },
                      { value: 'outline', label: 'Outline' },
                      { value: 'destructive', label: 'Destructive' },
                    ]}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Select<any>
                    label="Size"
                    value={stagedProps.size}
                    onChange={(e) => onPropChange('size', e.target.value)}
                    options={[
                      { value: 'S', label: 'Small (S)' },
                      { value: 'M', label: 'Medium (M)' },
                      { value: 'L', label: 'Large (L)' },
                    ]}
                  />
                </div>
              </div>
              <Select<any>
                label="Icon (Phosphor)"
                value={stagedProps.icon || ''}
                onChange={(e) => onPropChange('icon', e.target.value)}
                variant="icon-grid"
                options={[
                    { value: '', label: 'None', icon: 'ph-prohibit' },
                    { value: 'ph-sparkle', label: 'Sparkle', icon: 'ph-sparkle' },
                    { value: 'ph-heart', label: 'Heart', icon: 'ph-heart' },
                    { value: 'ph-bell', label: 'Bell', icon: 'ph-bell' },
                    { value: 'ph-rocket', label: 'Rocket', icon: 'ph-rocket' },
                    { value: 'ph-gear', label: 'Gear', icon: 'ph-gear' },
                    { value: 'ph-star', label: 'Star', icon: 'ph-star' },
                    { value: 'ph-cloud', label: 'Cloud', icon: 'ph-cloud' },
                    { value: 'ph-moon', label: 'Moon', icon: 'ph-moon' },
                    { value: 'ph-sun', label: 'Sun', icon: 'ph-sun' },
                    { value: 'ph-leaf', label: 'Leaf', icon: 'ph-leaf' },
                    { value: 'ph-fire', label: 'Fire', icon: 'ph-fire' },
                ]}
              />
            </>
          )}

          {/* 2. Card Package Props */}
          {stagedProps.componentType === 'card' && (
            <>
              <Input
                label="Card Title"
                value={stagedProps.label}
                onChange={(e) => onPropChange('label', e.target.value)}
              />
              <Input
                label="Card Subtitle"
                value={stagedProps.cardSubtitle || ''}
                onChange={(e) => onPropChange('cardSubtitle', e.target.value)}
              />
              <Input
                label="Body Text"
                value={stagedProps.cardBodyText || ''}
                onChange={(e) => onPropChange('cardBodyText', e.target.value)}
              />
              <RangeSlider
                label="Media Height (px)"
                motionValue={cardMediaHeightMV}
                onChange={(v) => onPropChange('cardMediaHeight', v)}
                onCommit={(v) => onPropChange('cardMediaHeight', v)}
                min={100}
                max={400}
                step={10}
              />
              <Toggle
                label="Show Card Media"
                isOn={stagedProps.showCardMedia !== false}
                onToggle={() => onPropChange('showCardMedia', stagedProps.showCardMedia === false)}
              />
              <Toggle
                label="Hover-Tilt Interactive Feedback"
                isOn={stagedProps.cardHoverTilt !== false}
                onToggle={() => onPropChange('cardHoverTilt', stagedProps.cardHoverTilt === false)}
              />
            </>
          )}

          {/* 3. Slider Staged Props */}
          {stagedProps.componentType === 'slider' && (
            <>
              <Input
                label="Slider Label"
                value={stagedProps.label}
                onChange={(e) => onPropChange('label', e.target.value)}
              />
              <RangeSlider
                label="Min Range"
                motionValue={sliderMinMV}
                onChange={(v) => onPropChange('sliderMin', v)}
                onCommit={(v) => onPropChange('sliderMin', v)}
                min={0}
                max={500}
                step={1}
              />
              <RangeSlider
                label="Max Range"
                motionValue={sliderMaxMV}
                onChange={(v) => onPropChange('sliderMax', v)}
                onCommit={(v) => onPropChange('sliderMax', v)}
                min={10}
                max={1000}
                step={1}
              />
              <RangeSlider
                label="Step Increment"
                motionValue={sliderStepMV}
                onChange={(v) => onPropChange('sliderStep', v)}
                onCommit={(v) => onPropChange('sliderStep', v)}
                min={0.1}
                max={50}
                step={0.1}
              />
              <RangeSlider
                label="Default Value"
                motionValue={sliderDefaultValueMV}
                onChange={(v) => onPropChange('sliderDefaultValue', v)}
                onCommit={(v) => onPropChange('sliderDefaultValue', v)}
                min={stagedProps.sliderMin !== undefined ? stagedProps.sliderMin : 0}
                max={stagedProps.sliderMax !== undefined ? stagedProps.sliderMax : 100}
                step={stagedProps.sliderStep !== undefined ? stagedProps.sliderStep : 1}
              />
              <Toggle
                label="Show Live Counter"
                isOn={stagedProps.sliderShowCounter !== false}
                onToggle={() => onPropChange('sliderShowCounter', stagedProps.sliderShowCounter === false)}
              />
            </>
          )}

          {/* 4. NameTag Package Props */}
          {stagedProps.componentType === 'nametag' && (
            <>
              <Input
                label="Header Label"
                value={stagedProps.tagHeaderText || 'HELLO'}
                onChange={(e) => onPropChange('tagHeaderText', e.target.value)}
              />
              <Input
                label="Subheader Label"
                value={stagedProps.tagSubHeaderText || 'my name is'}
                onChange={(e) => onPropChange('tagSubHeaderText', e.target.value)}
              />
              <Input
                label="Display Name"
                value={stagedProps.tagName || 'DESIGN AGENT'}
                onChange={(e) => onPropChange('tagName', e.target.value)}
              />
              <Input
                label="Professional Role"
                value={stagedProps.tagRole || 'Senior Design Engineer & AI Collaborator'}
                onChange={(e) => onPropChange('tagRole', e.target.value)}
              />
              <Input
                label="Level Identifier"
                value={stagedProps.tagLevel || 'LVL 99'}
                onChange={(e) => onPropChange('tagLevel', e.target.value)}
              />
              <Input
                label="Badge Text"
                value={stagedProps.tagBadgeText || 'PROTOTYPER'}
                onChange={(e) => onPropChange('tagBadgeText', e.target.value)}
              />
              <ColorPicker
                label="Header Color Override"
                value={stagedProps.tagHeaderColor || '#ef4444'}
                onChange={(e) => onPropChange('tagHeaderColor', e.target.value)}
              />
              <Toggle
                label="Show Badge Lanyard Punch Hole"
                isOn={stagedProps.tagPunchHole !== false}
                onToggle={() => onPropChange('tagPunchHole', stagedProps.tagPunchHole === false)}
              />
            </>
          )}

          {/* 5. Slot Viewport Props */}
          {stagedProps.componentType === 'slot' && (
            <>
              <RangeSlider
                label="Cube Rotation Speed"
                motionValue={slotCubeSpeedMV}
                onChange={(v) => onPropChange('slotCubeSpeed', v)}
                onCommit={(v) => onPropChange('slotCubeSpeed', v)}
                min={0}
                max={10}
                step={0.1}
              />
              <RangeSlider
                label="Cube Mesh Scale"
                motionValue={slotCubeScaleMV}
                onChange={(v) => onPropChange('slotCubeScale', v)}
                onCommit={(v) => onPropChange('slotCubeScale', v)}
                min={0.5}
                max={5}
                step={0.1}
              />
              <ColorPicker
                label="Cube Material Color"
                value={stagedProps.slotCubeColor || '#4f46e5'}
                onChange={(e) => onPropChange('slotCubeColor', e.target.value)}
              />
              <RangeSlider
                label="Ambient Light Intensity"
                motionValue={slotAmbientIntensityMV}
                onChange={(v) => onPropChange('slotAmbientIntensity', v)}
                onCommit={(v) => onPropChange('slotAmbientIntensity', v)}
                min={0}
                max={2}
                step={0.05}
              />
              <Toggle
                label="Enable Sky Environment"
                isOn={stagedProps.slotEnableSky !== false}
                onToggle={() => onPropChange('slotEnableSky', stagedProps.slotEnableSky === false)}
              />
              <Toggle
                label="Show Viewport FPS Overlay"
                isOn={stagedProps.slotShowFps !== false}
                onToggle={() => onPropChange('slotShowFps', stagedProps.slotShowFps === false)}
              />
            </>
          )}

          {/* 6. Custom Props */}
          {stagedProps.componentType === 'custom' && (
            <Input
              label="Custom Title"
              value={stagedProps.label}
              onChange={(e) => onPropChange('label', e.target.value)}
            />
          )}
        </motion.div>
      </Accordion>

      {stagedProps.componentType !== 'slot' && (
        <Accordion title="Appearance">
          <motion.div layout="position" style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.L'] }}>
            <RangeSlider
              label="Corner Radius"
              motionValue={radiusMotionValue}
              onCommit={onRadiusCommit}
              min={0}
              max={56}
            />
            
            <motion.div layout="position" style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'], width: '100%' }}>
              {!isTertiary && (
                <ColorPicker
                  label="Fill Color"
                  value={stagedProps.customFill || (stagedProps.variant === 'primary' ? (themeName === 'dark' ? '#ffffff' : '#111111') : (stagedProps.componentType === 'card' ? theme.Color.Base.Surface[1] : 'transparent'))}
                  onChange={(e) => onPropChange('customFill', e.target.value)}
                />
              )}
              <ColorPicker
                label="Text Color"
                value={stagedProps.customColor || (stagedProps.variant === 'primary' ? (themeName === 'dark' ? '#000000' : '#ffffff') : (themeName === 'dark' ? '#ffffff' : '#111111'))}
                onChange={(e) => onPropChange('customColor', e.target.value)}
              />
            </motion.div>
          </motion.div>
        </Accordion>
      )}

      {(stagedProps.componentType === 'button' || stagedProps.componentType === 'card') && (
        <Accordion title="State">
          <motion.div layout="position" style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'], width: '100%' }}>
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
            <Toggle
              label="Enable Success State"
              isOn={!!stagedProps.enableSuccess}
              onToggle={() => onPropChange('enableSuccess', !stagedProps.enableSuccess)}
            />
          </motion.div>
        </Accordion>
      )}

      <Accordion title="Agent">
        <motion.div layout="position" style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
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
        </motion.div>
      </Accordion>

      <Accordion title="Inspector">
        <motion.div layout="position" style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
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
            <motion.div 
              layout="position"
              style={{ 
              marginTop: theme.space['Space.S'], 
              padding: theme.space['Space.M'], 
              backgroundColor: theme.Color.Base.Surface[2], 
              borderRadius: theme.radius['Radius.M'],
              ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
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
            </motion.div>
          )}
        </motion.div>
      </Accordion>
    </>
  );
};

export default ControlPanel;