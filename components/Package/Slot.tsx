/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { forwardRef, useState } from 'react';
import { useTheme } from '../../Theme.tsx';
import Scene3D from '../3D/scene.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Copy, Check } from 'phosphor-react';

interface SlotProps {
  // Add any props if needed later
}

const Slot = forwardRef<HTMLDivElement, SlotProps>((props, ref) => {
  const { theme } = useTheme();
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const instructionText = 'Render a [scene/component] in the slot and map the controls, code, and console outputs to the panel.';

  const handleCopy = () => {
    navigator.clipboard.writeText(instructionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 3D Scene Background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 1 }}>
        <Scene3D showSky={true} />
      </div>

      {/* Info Trigger */}
      <button
        onClick={() => setShowDialog(true)}
        style={{
          position: 'absolute',
          top: theme.spacing['Space.M'],
          right: theme.spacing['Space.M'],
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: theme.Color.Base.Surface[1],
          border: `1px solid ${theme.Color.Base.Content[3]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          color: theme.Color.Base.Content[1],
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <Info size={20} />
      </button>

      {/* Dialog Overlay */}
      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: theme.spacing['Space.L'],
            }}
            onClick={() => setShowDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{
                backgroundColor: theme.Color.Base.Surface[1],
                borderRadius: theme.radius['Radius.L'],
                padding: theme.spacing['Space.L'],
                maxWidth: '400px',
                width: '100%',
                position: 'relative',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: `1px solid ${theme.Color.Base.Content[3]}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  position: 'absolute',
                  top: theme.spacing['Space.M'],
                  right: theme.spacing['Space.M'],
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.Color.Base.Content[2],
                }}
              >
                <X size={20} />
              </button>

              <h2 style={{ ...theme.Type.Expressive.Headline.M, color: theme.Color.Base.Content[1], marginBottom: theme.spacing['Space.M'] }}>
                Viewport Slot
              </h2>
              
              <div style={{ 
                backgroundColor: theme.Color.Base.Surface[2], 
                padding: theme.spacing['Space.M'], 
                borderRadius: theme.radius['Radius.M'],
                marginBottom: theme.spacing['Space.L'],
                border: `1px dashed ${theme.Color.Base.Content[3]}`,
              }}>
                <p style={{ ...theme.Type.Readable.Body.M, color: theme.Color.Base.Content[2], lineHeight: 1.5 }}>
                  {instructionText}
                </p>
              </div>

              <button
                onClick={handleCopy}
                style={{
                  width: '100%',
                  padding: theme.spacing['Space.M'],
                  borderRadius: theme.radius['Radius.M'],
                  backgroundColor: theme.Color.Active.Surface[1],
                  color: theme.Color.Active.Content[1],
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing['Space.S'],
                  cursor: 'pointer',
                  ...theme.Type.Readable.Body.M,
                  fontWeight: 600,
                }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy Instructions'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback View (if scene fails or for context) */}
      {!showDialog && (
        <div style={{ 
          position: 'absolute', 
          bottom: theme.spacing['Space.M'], 
          left: theme.spacing['Space.M'],
          pointerEvents: 'none',
          opacity: 0.6
        }}>
          <p style={{ ...theme.Type.Readable.Body.S, color: theme.Color.Base.Content[2] }}>
            3D Viewport Active
          </p>
        </div>
      )}
    </div>
  );
});

Slot.displayName = 'Slot';

export default Slot;
