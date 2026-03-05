/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import Home from '../Page/Home.tsx';
import CustomScrollbar from '../Core/CustomScrollbar.tsx';

const App = () => {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <CustomScrollbar>
        <Home />
      </CustomScrollbar>
    </div>
  );
};

export default App;
