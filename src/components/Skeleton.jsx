import React from 'react';

export const SkeletonBlock = ({ height = 60, width = '100%', borderRadius, style = {} }) => (
  <div className="panda-skeleton" style={{ height, width, borderRadius, ...style }} />
);

export const SkeletonList = ({ rows = 3, rowHeight = 60, gap = 12, style = {} }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap, width: '100%', ...style }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="panda-skeleton" style={{ height: rowHeight }} />
    ))}
  </div>
);

export const SkeletonGrid = ({ items = 6, itemHeight = 44, minWidth = 90, gap = 10, style = {} }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap, width: '100%', ...style }}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="panda-skeleton" style={{ height: itemHeight }} />
    ))}
  </div>
);

export default SkeletonList;
