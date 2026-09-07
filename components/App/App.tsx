/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '../Page/Home.tsx';
import TerminalPage from '../Page/Terminal.tsx';
import CustomScrollbar from '../Core/CustomScrollbar.tsx';
import { useTheme } from '../../Theme.tsx';

const App = () => {
  const { theme } = useTheme();

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      position: 'relative', 
      overflow: 'hidden', 
      backgroundColor: theme.Color.Base.Surface[1],
    }}>
      <div style={{ position: 'relative', zIndex: 1, height: '100%', width: '100%', backgroundColor: 'transparent' }}>
        <Routes>
          <Route path="/terminal/*" element={<TerminalPage />} />
          <Route path="/tui/*" element={<TerminalPage />} />
          <Route
            path="*"
            element={
              <CustomScrollbar>
                <Home />
              </CustomScrollbar>
            }
          />
        </Routes>
      </div>
    </div>
  );
};

export default App;
