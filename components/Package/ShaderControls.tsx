/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo } from 'react';
import { useMotionValue, motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import RangeSlider from '../Core/RangeSlider.tsx';
import Accordion from '../Core/Accordion.tsx';
import Button from '../Core/Button.tsx';
import { useShaderStore, DEFAULT_SHADER_PARAMS, ShaderParams } from '../../services/shaderStore';
import { Sliders, ArrowCounterClockwise, Sparkle, Drop, Eye, Waves } from 'phosphor-react';

interface ShaderControlsProps {
  className?: string;
  compact?: boolean;
}

export const ShaderControls: React.FC<ShaderControlsProps> = ({ compact = false }) => {
  const { theme } = useTheme();
  const shaderParams = useShaderStore((state) => state.params);
  const setParam = useShaderStore((state) => state.setParam);
  const resetParams = useShaderStore((state) => state.resetParams);

  // MotionValues for 120fps lag-free slider manipulation without React re-renders
  const radiusMV = useMotionValue(shaderParams.radius);
  const strengthMV = useMotionValue(shaderParams.strength);
  const dissipationMV = useMotionValue(shaderParams.dissipation);
  const curlStrengthMV = useMotionValue(shaderParams.curlStrength);
  const curlFreqMV = useMotionValue(shaderParams.curlFreq);
  const refractStrengthMV = useMotionValue(shaderParams.refractStrength);
  const dispersionScaleMV = useMotionValue(shaderParams.dispersionScale);
  const blurRadiusMV = useMotionValue(shaderParams.blurRadius);
  const jitterStrengthMV = useMotionValue(shaderParams.jitterStrength);

  // Sync MotionValues when store changes (e.g. preset click or reset)
  useEffect(() => {
    radiusMV.set(shaderParams.radius);
    strengthMV.set(shaderParams.strength);
    dissipationMV.set(shaderParams.dissipation);
    curlStrengthMV.set(shaderParams.curlStrength);
    curlFreqMV.set(shaderParams.curlFreq);
    refractStrengthMV.set(shaderParams.refractStrength);
    dispersionScaleMV.set(shaderParams.dispersionScale);
    blurRadiusMV.set(shaderParams.blurRadius);
    jitterStrengthMV.set(shaderParams.jitterStrength);
  }, [shaderParams, radiusMV, strengthMV, dissipationMV, curlStrengthMV, curlFreqMV, refractStrengthMV, dispersionScaleMV, blurRadiusMV, jitterStrengthMV]);

  // Real-time store updater helper (updates Zustand store synchronously on drag for zero-lag WebGL uniform update)
  const createRealtimeHandler = (key: keyof ShaderParams) => (value: number) => {
    useShaderStore.getState().setParam(key, value);
  };

  const PRESETS: Array<{ name: string; icon: React.ReactNode; params: ShaderParams }> = [
    {
      name: 'Default Liquid',
      icon: <Drop size={14} weight="duotone" />,
      params: { ...DEFAULT_SHADER_PARAMS },
    },
    {
      name: 'Heavy Glass',
      icon: <Eye size={14} weight="duotone" />,
      params: {
        radius: 0.085,
        strength: 7.0,
        dissipation: 0.98,
        curlStrength: 0.15,
        curlFreq: 2.5,
        refractStrength: 0.65,
        dispersionScale: 0.28,
        blurRadius: 0.022,
        jitterStrength: 0.008,
      },
    },
    {
      name: 'Vortex Surge',
      icon: <Waves size={14} weight="duotone" />,
      params: {
        radius: 0.11,
        strength: 9.5,
        dissipation: 0.94,
        curlStrength: 0.75,
        curlFreq: 5.5,
        refractStrength: 0.45,
        dispersionScale: 0.22,
        blurRadius: 0.015,
        jitterStrength: 0.007,
      },
    },
    {
      name: 'High Prism',
      icon: <Sparkle size={14} weight="duotone" />,
      params: {
        radius: 0.06,
        strength: 5.0,
        dissipation: 0.97,
        curlStrength: 0.35,
        curlFreq: 4.0,
        refractStrength: 0.55,
        dispersionScale: 0.45,
        blurRadius: 0.028,
        jitterStrength: 0.012,
      },
    },
  ];

  const applyPreset = (presetParams: ShaderParams) => {
    Object.entries(presetParams).forEach(([k, v]) => {
      setParam(k as keyof ShaderParams, v);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'] }}>
      {/* Presets Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.XS'] }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Shader Presets
          </span>
          <button
            onClick={resetParams}
            title="Reset shader controls to default"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme.Color.Base.Content[3],
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: theme.radius['Radius.S'],
              fontSize: '11px',
              fontFamily: 'inherit',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.Color.Base.Content[1])}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.Color.Base.Content[3])}
          >
            <ArrowCounterClockwise size={12} />
            Reset
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.space['Space.XS'] }}>
          {PRESETS.map((preset) => (
            <motion.button
              key={preset.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => applyPreset(preset.params)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: `${theme.space['Space.XS']} ${theme.space['Space.S']}`,
                backgroundColor: theme.Color.Base.Surface[2],
                color: theme.Color.Base.Content[1],
                borderRadius: theme.radius['Radius.M'],
                border: `1px solid ${theme.Color.Base.Surface[3]}`,
                cursor: 'pointer',
                ...theme.Type.Readable.Label.S,
                fontSize: '11px',
                textAlign: 'left',
              }}
            >
              <span style={{ color: theme.Color.Base.Content[2] }}>{preset.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Fluid Simulation Controls */}
      <Accordion title="Fluid Simulation" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'], paddingTop: theme.space['Space.XS'] }}>
          <RangeSlider
            label="Splat Radius"
            motionValue={radiusMV}
            min={0.01}
            max={0.20}
            step={0.005}
            onChange={createRealtimeHandler('radius')}
            onCommit={(v) => setParam('radius', v)}
          />
          <RangeSlider
            label="Impulse Force"
            motionValue={strengthMV}
            min={0.5}
            max={15.0}
            step={0.1}
            onChange={createRealtimeHandler('strength')}
            onCommit={(v) => setParam('strength', v)}
          />
          <RangeSlider
            label="Fluid Dissipation"
            motionValue={dissipationMV}
            min={0.85}
            max={0.99}
            step={0.005}
            onChange={createRealtimeHandler('dissipation')}
            onCommit={(v) => setParam('dissipation', v)}
          />
        </div>
      </Accordion>

      {/* Curl Turbulence Controls */}
      <Accordion title="Curl Noise & Turbulence">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'], paddingTop: theme.space['Space.XS'] }}>
          <RangeSlider
            label="Curl Turbulence"
            motionValue={curlStrengthMV}
            min={0.0}
            max={1.0}
            step={0.01}
            onChange={createRealtimeHandler('curlStrength')}
            onCommit={(v) => setParam('curlStrength', v)}
          />
          <RangeSlider
            label="Curl Frequency"
            motionValue={curlFreqMV}
            min={1.0}
            max={10.0}
            step={0.1}
            onChange={createRealtimeHandler('curlFreq')}
            onCommit={(v) => setParam('curlFreq', v)}
          />
        </div>
      </Accordion>

      {/* Liquid Refraction & Optics Controls */}
      <Accordion title="Liquid Optics & Refraction">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'], paddingTop: theme.space['Space.XS'] }}>
          <RangeSlider
            label="Refraction Force"
            motionValue={refractStrengthMV}
            min={0.0}
            max={1.0}
            step={0.01}
            onChange={createRealtimeHandler('refractStrength')}
            onCommit={(v) => setParam('refractStrength', v)}
          />
          <RangeSlider
            label="Chromatic Dispersion"
            motionValue={dispersionScaleMV}
            min={0.0}
            max={0.50}
            step={0.01}
            onChange={createRealtimeHandler('dispersionScale')}
            onCommit={(v) => setParam('dispersionScale', v)}
          />
          <RangeSlider
            label="Edge Gaussian Blur"
            motionValue={blurRadiusMV}
            min={0.0}
            max={0.04}
            step={0.001}
            onChange={createRealtimeHandler('blurRadius')}
            onCommit={(v) => setParam('blurRadius', v)}
          />
          <RangeSlider
            label="Blue Noise Jitter"
            motionValue={jitterStrengthMV}
            min={0.0}
            max={0.02}
            step={0.001}
            onChange={createRealtimeHandler('jitterStrength')}
            onCommit={(v) => setParam('jitterStrength', v)}
          />
        </div>
      </Accordion>
    </div>
  );
};

export default ShaderControls;
