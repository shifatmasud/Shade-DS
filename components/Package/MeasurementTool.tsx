import React from 'react';

interface MeasurementToolProps {
  buttonWidth: number;
  paddingLeft: number;
  paddingRight: number;
}

export const MeasurementTool: React.FC<MeasurementToolProps> = ({
  buttonWidth,
  paddingLeft,
  paddingRight,
}) => {
  const contentWidth = buttonWidth - paddingLeft - paddingRight;

  return (
    <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Measurement Tool</h3>
      <p>Button Width: {buttonWidth}px</p>
      <p>Padding: {paddingLeft}px (left), {paddingRight}px (right)</p>
      <p>Correct Content Width: {contentWidth}px</p>
    </div>
  );
};
