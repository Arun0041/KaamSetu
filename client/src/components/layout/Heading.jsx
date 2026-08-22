import React from 'react';

/**
 * Page-level heading with eyebrow label, title, description,
 * and an optional action slot (buttons, etc.).
 */
export default function Heading({ eyebrow, title, copy, children }) {
  return (
    <div className="view-heading fade-in">
      <div>
        <div className="eyebrow">
          {eyebrow}
          <span className="eyebrow-line" />
        </div>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {children}
    </div>
  );
}
