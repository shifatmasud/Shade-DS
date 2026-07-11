/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import Home from '../Page/Home.tsx';
import CustomScrollbar from '../Core/CustomScrollbar.tsx';
import { useTheme } from '../../Theme.tsx';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const { themeName, theme } = useTheme();

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      position: 'relative', 
      overflow: 'hidden', 
      backgroundColor: theme.Color.Base.Surface[1],
      transition: 'background-color 800ms ease-in-out'
    }}>
      <div style={{ position: 'relative', zIndex: 1, height: '100%', width: '100%', backgroundColor: 'transparent' }}>
        <CustomScrollbar>
          <Home />
        </CustomScrollbar>
      </div>
    </div>
  );
};

export default App;
