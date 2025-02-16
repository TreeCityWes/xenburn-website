import React from 'react';
import FireParticles from './FireParticles'; // Import FireParticles

const Header = () => {
  return (
    <header>
      <FireParticles width={520} height={200} intensity={0.3} type="xburn" /> {/* Add FireParticles here */}
      <h1>Your Header Title</h1>
      {/* Other header content */}
    </header>
  );
};

export default Header; 