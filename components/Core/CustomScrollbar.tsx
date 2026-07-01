/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CustomScrollbarProps {
  children: React.ReactNode;
}

const CustomScrollbar: React.FC<CustomScrollbarProps> = ({ children }) => {
  return (
    <div 
      className="custom-scrollbar-viewport"
      style={{ 
        position: 'relative', 
        height: '100%', 
        width: '100%', 
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {children}
    </div>
  );
};

export default CustomScrollbar;
