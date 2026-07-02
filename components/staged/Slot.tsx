/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { forwardRef } from 'react';
import Scene3D from '../3D/scene.tsx';

interface SlotProps {
  // Add any props if needed later
}

const Slot = forwardRef<HTMLDivElement, SlotProps>((props, ref) => {
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
      <Scene3D showSky={true} />
    </div>
  );
});

Slot.displayName = 'Slot';

export default Slot;
