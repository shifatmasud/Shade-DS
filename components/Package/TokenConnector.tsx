/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';
import { useTheme } from '../../Theme';
import { FeedbackVariant } from '../../types';

interface TokenConnectorProps {
  variant: FeedbackVariant;
  x: MotionValue<number>;
  y: MotionValue<number>;
  targetX: number;
  targetY: number;
  delay: number;
  width: number;
}

const TokenConnector: React.FC<TokenConnectorProps> = ({ variant, x, y, targetX, targetY, delay, width }) => {
  const { theme } = useTheme();
  const colors = theme.Color[variant];
  const strokeColor = colors.Content[1];
  const fillColor = colors.Surface[1];

  const path = useTransform([x, y], ([latestX, latestY]) => {
    const numX = latestX as number;
    const numY = latestY as number;
    const startX = numX + width / 2;
    const startY = numY + 10; // Badge height is 20, so center is 10
    const cp1x = startX;
    const cp1y = targetY;
    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${targetX} ${startY}, ${targetX} ${targetY}`;
  });

  return (
    <g>
      <motion.path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="4 2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: delay + 0.2, duration: 0.4 }}
      />
      <motion.circle
        cx={targetX}
        cy={targetY}
        r="3"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.5, type: 'spring' }}
      />
    </g>
  );
};

export default TokenConnector;

