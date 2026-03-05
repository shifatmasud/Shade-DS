/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { forwardRef } from 'react';
import { useTheme } from '../../Theme.tsx';

interface SlotProps {
  // Add any props if needed later
}

const Slot = forwardRef<HTMLDivElement, SlotProps>((props, ref) => {
  const { theme } = useTheme();
  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.Color.Signal.Surface[1],
        border: `2px solid ${theme.Color.Signal.Content[1]}`,
        pointerEvents: 'auto',
        opacity: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing['Space.L'],
        textAlign: 'center',
      }}
    >
      <div style={{ color: theme.Color.Signal.Content[1], maxWidth: '380px', position: 'relative' }}>
        <p style={{ ...theme.Type.Expressive.Headline.M, marginBottom: theme.spacing['Space.S'] }}>Viewport Slot</p>
        <p style={{ ...theme.Type.Readable.Body.L, maxWidth: '380px', overflowWrap: 'break-word', width: '100%' }}>
          Ask the AI: "Render a [scene/component] in the slot and map the controls, code, and console outputs to the panel."
        </p>
      </div>
    </div>
  );
});

Slot.displayName = 'Slot';

export default Slot;
