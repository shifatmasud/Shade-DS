/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import TextArea from '../Core/TextArea.tsx';
import { MetaButtonProps } from '../../types/index.tsx';
import { AnimatedCopyIcon } from '../Core/AnimatedCopyIcon.tsx';
import { useShaderStore, ShaderParams } from '../../services/shaderStore';

interface CodePanelProps {
  codeText: string;
  onCodeChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCopyCode: () => void;
  onFocus: () => void;
  onBlur: () => void;
  stagedProps: MetaButtonProps;
}

const CodePanel: React.FC<CodePanelProps> = ({ codeText, onCodeChange, onCopyCode, onFocus, onBlur, stagedProps }) => {
  const { theme } = useTheme();
  const [isCopied, setIsCopied] = useState(false);

  // Shader parameters direct JSON editing and syncing
  const shaderParams = useShaderStore((state) => state.params);
  const setParams = useShaderStore((state) => state.setParams);

  const [shaderCodeText, setShaderCodeText] = useState('');
  const [isShaderCodeFocused, setIsShaderCodeFocused] = useState(false);
  const [isShaderCopied, setIsShaderCopied] = useState(false);

  useEffect(() => {
    if (!isShaderCodeFocused) {
      setShaderCodeText(JSON.stringify(shaderParams, null, 2));
    }
  }, [shaderParams, isShaderCodeFocused]);

  const handleCopyClick = () => {
    onCopyCode();
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleCopyShaderCode = () => {
    navigator.clipboard.writeText(JSON.stringify(shaderParams, null, 2));
    setIsShaderCopied(true);
    setTimeout(() => {
      setIsShaderCopied(false);
    }, 2000);
  };

  const handleShaderCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setShaderCodeText(val);
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object') {
        const cleaned: Partial<ShaderParams> = {};
        const validKeys: Array<keyof ShaderParams> = [
          'radius', 'strength', 'dissipation', 'curlStrength', 'curlFreq',
          'refractStrength', 'dispersionScale', 'blurRadius', 'jitterStrength'
        ];
        validKeys.forEach(key => {
          if (typeof parsed[key] === 'number') {
            cleaned[key] = parsed[key] as number;
          }
        });
        if (Object.keys(cleaned).length > 0) {
          setParams(cleaned);
        }
      }
    } catch (err) {
      // Ignore syntax errors while typing
    }
  };

  const getReactUsageSnippet = () => {
    switch (stagedProps.componentType) {
      case 'button':
        return `<StagedButton\n  label="${stagedProps.label}"\n  variant="${stagedProps.variant}"\n  size="${stagedProps.size}"\n  icon="${stagedProps.icon}"\n  customRadius="${stagedProps.customRadius}"\n/>`;
      case 'card':
        return `<StagedCard\n  title="${stagedProps.label}"\n  subtitle="${stagedProps.cardSubtitle || ''}"\n  bodyText="${stagedProps.cardBodyText || ''}"\n  showMedia={${stagedProps.showCardMedia !== false}}\n  mediaHeight={${stagedProps.cardMediaHeight || 200}}\n  hoverTilt={${stagedProps.cardHoverTilt !== false}}\n  customRadius="${stagedProps.customRadius}"\n/>`;
      case 'slider':
        return `<FillSlider\n  label="${stagedProps.label}"\n  min={${stagedProps.sliderMin !== undefined ? stagedProps.sliderMin : 0}}\n  max={${stagedProps.sliderMax !== undefined ? stagedProps.sliderMax : 100}}\n  step={${stagedProps.sliderStep !== undefined ? stagedProps.sliderStep : 1}}\n  defaultValue={${stagedProps.sliderDefaultValue !== undefined ? stagedProps.sliderDefaultValue : 70}}\n  showCounter={${stagedProps.sliderShowCounter !== false}}\n  customRadius="${stagedProps.customRadius}"\n/>`;
      case 'nametag':
        return `<NameTag\n  headerText="${stagedProps.tagHeaderText || 'HELLO'}"\n  subHeaderText="${stagedProps.tagSubHeaderText || 'my name is'}"\n  name="${stagedProps.tagName || 'DESIGN AGENT'}"\n  role="${stagedProps.tagRole || 'Senior Design Engineer'}"\n  level="${stagedProps.tagLevel || 'LVL 99'}"\n  badgeText="${stagedProps.tagBadgeText || 'PROTOTYPER'}"\n  punchHole={${stagedProps.tagPunchHole !== false}}\n/>`;
      case 'slot':
        return `<ViewportSlot\n  cubeSpeed={${stagedProps.slotCubeSpeed !== undefined ? stagedProps.slotCubeSpeed : 1}}\n  cubeColor="${stagedProps.slotCubeColor || '#4f46e5'}"\n  cubeScale={${stagedProps.slotCubeScale !== undefined ? stagedProps.slotCubeScale : 2}}\n  ambientIntensity={${stagedProps.slotAmbientIntensity !== undefined ? stagedProps.slotAmbientIntensity : 0.25}}\n  enableSky={${stagedProps.slotEnableSky !== false}}\n  showFps={${stagedProps.slotShowFps !== false}}\n/>`;
      case 'custom':
      default:
        return `<CustomComponent />`;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space['Space.M'], padding: `${theme.space['Space.M']} ${theme.space['Space.M']}` }}>
      <div>
        <p style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2], marginBottom: theme.space['Space.S'], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Component Props JSON
        </p>
        <div style={{ position: 'relative' }}>
          <TextArea value={codeText} onChange={onCodeChange} onFocus={onFocus} onBlur={onBlur} />
          <motion.button
            onClick={handleCopyClick}
            style={{
              position: 'absolute',
              top: theme.space['Space.S'],
              right: theme.space['Space.S'],
              background: theme.Color.Base.Surface[1],
              ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
              borderRadius: theme.radius['Radius.S'],
              padding: theme.space['Space.XS'],
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.Color.Base.Content[1],
            }}
            whileHover={{ scale: 1.1, backgroundColor: theme.Color.Accent.Surface[1], color: theme.Color.Accent.Content[1] }}
            whileTap={{ scale: 0.9 }}
            aria-label={isCopied ? 'Copied!' : 'Copy Props JSON'}
          >
            <AnimatedCopyIcon isCopied={isCopied} />
          </motion.button>
        </div>
      </div>

      <div>
        <p style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2], marginBottom: theme.space['Space.S'], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Shader Optics Params JSON
        </p>
        <div style={{ position: 'relative' }}>
          <TextArea 
            value={shaderCodeText} 
            onChange={handleShaderCodeChange} 
            onFocus={() => setIsShaderCodeFocused(true)} 
            onBlur={() => setIsShaderCodeFocused(false)} 
          />
          <motion.button
            onClick={handleCopyShaderCode}
            style={{
              position: 'absolute',
              top: theme.space['Space.S'],
              right: theme.space['Space.S'],
              background: theme.Color.Base.Surface[1],
              ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
              borderRadius: theme.radius['Radius.S'],
              padding: theme.space['Space.XS'],
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.Color.Base.Content[1],
            }}
            whileHover={{ scale: 1.1, backgroundColor: theme.Color.Accent.Surface[1], color: theme.Color.Accent.Content[1] }}
            whileTap={{ scale: 0.9 }}
            aria-label={isShaderCopied ? 'Copied!' : 'Copy Shader JSON'}
          >
            <AnimatedCopyIcon isCopied={isShaderCopied} />
          </motion.button>
        </div>
      </div>

      <div style={{ marginTop: theme.space['Space.XS'], paddingBottom: theme.space['Space.L'] }}>
        <p style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2], marginBottom: theme.space['Space.S'], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          React Usage
        </p>
        <pre style={{ ...theme.Type.Expressive.Data, fontSize: theme.Type.Readable.Label.S.fontSize, color: theme.Color.Base.Content[2], backgroundColor: 'transparent', padding: 0, margin: 0, whiteSpace: 'pre-wrap' }}>
          {getReactUsageSnippet()}
        </pre>
      </div>
    </div>
  );
};

export default React.memo(CodePanel);
