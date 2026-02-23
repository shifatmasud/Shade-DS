/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, MotionValue } from 'framer-motion';
import { useTheme } from '../../Theme';
import { FeedbackVariant } from '../../types';

interface TokenBadgeProps {
  label: string;
  variant: FeedbackVariant;
  x: MotionValue<number>;
  y: MotionValue<number>;
  delay: number;
}

const TokenBadge: React.FC<TokenBadgeProps> = ({ label, variant, x, y, delay }) => {
  const { theme } = useTheme();
  const colors = theme.Color[variant];
  const strokeColor = colors.Content[1];
  const fillColor = colors.Surface[1];

  return (
    <motion.div
      drag
      dragMomentum={false}
      style={{ 
        x, y,
        position: 'absolute',
        top: 0,
        left: 0,
        padding: '0 8px',
        height: '20px',
        borderRadius: '10px',
        backgroundColor: fillColor,
        border: `1px solid ${strokeColor}`,
        color: strokeColor,
        fontSize: '10px',
        fontFamily: theme.Type.Expressive.Data.fontFamily,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: theme.effects['Effect.Shadow.Drop.1'],
        zIndex: 12,
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: 'spring' }}
      whileDrag={{ cursor: 'grabbing', scale: 1.1 }}
    >
      {label}
    </motion.div>
  );
};

export default TokenBadge;

