/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CustomScrollbarProps {
  children: React.ReactNode;
}

const CustomScrollbar = React.forwardRef<HTMLDivElement, CustomScrollbarProps>(({ children }, ref) => {
  return (
    <div ref={ref} style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: '100%', overflowY: 'hidden' }}>
        {children}
      </div>
    </div>
  );
});

export default CustomScrollbar;
