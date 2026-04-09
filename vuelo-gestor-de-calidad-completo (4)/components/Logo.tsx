import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex flex-col items-center ${className}`} style={{ minWidth: '150px' }}>
      <div className="flex items-center gap-1">
        <span className="text-4xl font-black tracking-tighter" style={{ color: '#4B2E83', fontFamily: 'Arial Black, sans-serif', lineHeight: '0.8' }}>
          VUELO
        </span>
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase tracking-tighter" 
                style={{ 
                  color: '#4B2E83', 
                  writingMode: 'vertical-rl', 
                  textOrientation: 'mixed',
                  lineHeight: '1',
                  height: '28px'
                }}>
            PHARMA
          </span>
        </div>
      </div>
      <div className="w-full mt-1 bg-[#00E5FF] py-0.5 flex justify-center items-center">
        <span className="text-[10px] font-black text-white tracking-[0.4em] uppercase">
          COLOMBIA
        </span>
      </div>
    </div>
  );
};

export default Logo;