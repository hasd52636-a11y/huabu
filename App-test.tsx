import React from 'react';

const AppTest: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>App Test - React is Working</h1>
      <p>If you can see this, React is rendering correctly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
};

export default AppTest;