/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import TextArea from '../Core/TextArea.tsx';
import { MetaButtonProps } from '../../types/index.tsx';
import { AnimatedCopyIcon } from '../Core/AnimatedCopyIcon.tsx';

interface CodePanelProps {
  codeText: string;
  onCodeChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCopyCode: () => void;
  onFocus: () => void;
  onBlur: () => void;
  btnProps: MetaButtonProps;
}

const CodePanel: React.FC<CodePanelProps> = ({ codeText, onCodeChange, onCopyCode, onFocus, onBlur, btnProps }) => {
  const { theme } = useTheme();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = () => {
    onCopyCode();
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <>
      <div style={{ position: 'relative' }}>
        <TextArea value={codeText} onChange={onCodeChange} onFocus={onFocus} onBlur={onBlur} />
        <motion.button
          onClick={handleCopyClick}
          style={{
            position: 'absolute',
            top: theme.space['Space.S'],
            right: theme.space['Space.S'],
            background: theme.Color.Base.Surface[1],
            border: `${theme.border['Border.Width.Main']} solid ${theme.Color.Base.Surface[3]}`,
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
          aria-label={isCopied ? 'Copied!' : 'Copy JSON'}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <AnimatedCopyIcon isCopied={isCopied} />
        </motion.button>
      </div>
      <div style={{ marginTop: theme.space['Space.L'] }}>
        <p style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[2], marginBottom: theme.space['Space.S'] }}>REACT USAGE</p>
        <pre style={{ ...theme.Type.Expressive.Data, fontSize: theme.Type.Readable.Label.S.fontSize, color: theme.Color.Base.Content[2], backgroundColor: 'transparent', padding: 0, margin: 0, whiteSpace: 'pre-wrap' }}>
          {`<Button\n  label="${btnProps.label}"\n  variant="${btnProps.variant}"\n  size="${btnProps.size}"\n  icon="${btnProps.icon}"\n  customRadius="${btnProps.customRadius}"\n/>`}
        </pre>
      </div>
    </>
  );
};

export default CodePanel;
