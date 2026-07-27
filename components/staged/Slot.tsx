/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { forwardRef } from 'react';
import Scene3D from './3D/scene.tsx';

interface SlotProps {
  slotCubeSpeed?: number;
  slotCubeColor?: string;
  slotCubeScale?: number;
  slotAmbientIntensity?: number;
  slotEnableSky?: boolean;
  slotShowFps?: boolean;
}

const Slot = forwardRef<HTMLDivElement, SlotProps>(({
  slotCubeSpeed = 1,
  slotCubeColor = '#4f46e5',
  slotCubeScale = 2,
  slotAmbientIntensity = 0.25,
  slotEnableSky = true,
  slotShowFps = true,
}, ref) => {
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
      <Scene3D 
        showSky={slotEnableSky} 
        cubeSpeed={slotCubeSpeed}
        cubeColor={slotCubeColor}
        cubeScale={slotCubeScale}
        ambientIntensity={slotAmbientIntensity}
        showFps={slotShowFps}
      />
    </div>
  );
});

Slot.displayName = 'Slot';

export default Slot;
