import React, { useEffect, useState } from 'react';
import type { CrestStyle } from '../../types';

interface SchoolCrestProps {
  logoDataUrl?: string;
  crestStyle: CrestStyle;
  schoolName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SchoolCrest: React.FC<SchoolCrestProps> = ({
  logoDataUrl,
  crestStyle,
  schoolName,
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [logoDataUrl]);

  const dims =
    size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';

  if (logoDataUrl && !imgFailed) {
    return (
      <div
        className={`${dims} rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 ${className}`}
      >
        <img
          src={logoDataUrl}
          alt={`${schoolName} crest`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain p-0.5"
        />
      </div>
    );
  }

  return (
    <div
      className={`${dims} rounded-xl brand-bg text-white flex items-center justify-center shrink-0 shadow-xs ${className}`}
      aria-label={`${schoolName} emblem`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3/5 h-3/5">
        {crestStyle === 'shield' && (
          <>
            <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
            <path d="M9 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {crestStyle === 'book' && (
          <>
            <path d="M4 5.5A2.5 2.5 0 016.5 3H12v17H6.5A2.5 2.5 0 004 22V5.5z" strokeLinejoin="round" />
            <path d="M20 5.5A2.5 2.5 0 0017.5 3H12v17h5.5a2.5 2.5 0 012.5 2V5.5z" strokeLinejoin="round" />
          </>
        )}
        {crestStyle === 'pillars' && (
          <>
            <path d="M3 9l9-5 9 5H3z" strokeLinejoin="round" />
            <path d="M6 12v6M10 12v6M14 12v6M18 12v6" strokeLinecap="round" />
            <path d="M4 20h16" strokeLinecap="round" />
          </>
        )}
        {crestStyle === 'compass' && (
          <>
            <circle cx="12" cy="12" r="9" />
            <polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
};

export default SchoolCrest;
