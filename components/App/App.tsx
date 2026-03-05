/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import MainPage from '../Page/MainPage.tsx';
import CustomScrollbar from '../Core/CustomScrollbar.tsx';

const App = () => {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <CustomScrollbar>
        <MainPage />
      </CustomScrollbar>
    </div>
  );
};

export default App;
