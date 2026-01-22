import React from 'react';
import './Badge.css';

const Badge = ({ badge, unlocked = false, size = 'medium' }) => {
  const rarityColors = {
    common: '#94a3b8',
    rare: '#3b82f6',
    epic: '#8b5cf6',
    legendary: '#f59e0b'
  };

  return (
    <div className={`badge badge--${size} ${unlocked ? 'badge--unlocked' : 'badge--locked'}`}>
      <div 
        className="badge__icon-wrapper"
        style={{ 
          borderColor: unlocked ? rarityColors[badge.rarity] : 'var(--border-color)',
          boxShadow: unlocked ? `0 0 20px ${rarityColors[badge.rarity]}40` : 'none'
        }}
      >
        <span className="badge__icon">{badge.icon}</span>
      </div>
      <div className="badge__info">
        <h4 className="badge__name">{badge.name}</h4>
        <p className="badge__description">{badge.description}</p>
        {unlocked && badge.unlockedAt && (
          <p className="badge__unlocked-date">
            {new Date(badge.unlockedAt).toLocaleDateString('tr-TR')}
          </p>
        )}
        <span 
          className="badge__rarity"
          style={{ color: rarityColors[badge.rarity] }}
        >
          {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
        </span>
      </div>
    </div>
  );
};

export default Badge;
