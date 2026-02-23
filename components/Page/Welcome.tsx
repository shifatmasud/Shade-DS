/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import MetaPrototype from '../App/MetaPrototype.tsx';
import CustomScrollbar from '../Core/CustomScrollbar.tsx';

const Welcome = () => {
    return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <CustomScrollbar>
        <MetaPrototype />
      </CustomScrollbar>
    </div>
  );
};

export default Welcome;
