const fs = require('fs');
const path = require('path');

const frontSvg = fs.readFileSync(path.join(__dirname, 'MMM-Hevy/public/body-front.svg'), 'utf8');
const backSvg = fs.readFileSync(path.join(__dirname, 'MMM-Hevy/public/body-back.svg'), 'utf8');

// We need to convert standard HTML SVG to React JSX (class -> className, transform -> transform, etc)
// And we need to inject the color function
let formatSvg = (svgStr, viewStr) => {
    let s = svgStr;
    // Remove xml declaration and svg start/end tags
    s = s.replace(/<svg[\s\S]*?>/, `<svg viewBox="0 0 277.49 495.07" className="w-full h-full">`);
    s = s.replace(/<defs>[\s\S]*?<\/defs>/, ''); // remove inline styles
    s = s.replace(/class=/g, 'className=');
    
    // Map class names to muscles
    // Classes contain "muscle " and then the actual name like "chest", "abdominals", "quadriceps"
    // So we can replace <path className="..." d="..." /> with <path className="..." fill={getColor("chest")} ... />
    
    // We will parse with regex for simplicity
    s = s.replace(/<path\s+className="([^"]+)"([\s\S]*?)\/>/g, (match, className, rest) => {
        let muscle = "";
        if (className.includes("chest")) muscle = "chest";
        else if (className.includes("abdominals")) muscle = "core";
        else if (className.includes("quadriceps") || className.includes("calves") || className.includes("hamstrings") || className.includes("glutes") || className.includes("abductors")) muscle = "legs";
        else if (className.includes("triceps") || className.includes("biceps") || className.includes("forearms")) muscle = "arms";
        else if (className.includes("shoulders") || className.includes("delts")) muscle = "shoulders";
        else if (className.includes("lats") || className.includes("traps") || className.includes("lower-back")) muscle = "back";
        
        let fillProp = `fill="#3f3f46"`;
        if (className.includes("body-part")) {
            fillProp = `fill="rgba(255,255,255,0.05)"`;
        } else if (muscle) {
            fillProp = `fill={getColor('${muscle}')} stroke={getHoverOpacity('${muscle}') ? getColor('${muscle}') : 'rgba(255,255,255,0.1)'} strokeWidth="1" style={{ opacity: Math.max(getHoverOpacity('${muscle}') ? 1 : 0.8), transition: 'all 0.3s' }} onMouseEnter={() => setHoveredMuscle('${muscle}')} onMouseLeave={() => setHoveredMuscle(null)}`;
        }
        
        return `<path className="${className}" ${fillProp} ${rest} />`;
    });
    
    return s;
};

const finalTsx = `
import React from 'react';
type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core';
interface AnatomyProps {
  getColor: (muscle: MuscleGroup) => string;
  setHoveredMuscle: (m: MuscleGroup | null) => void;
  hoveredMuscle: MuscleGroup | null;
}
export function AnatomyFront({ getColor, setHoveredMuscle, hoveredMuscle }: AnatomyProps) {
  const getHoverOpacity = (m: string) => hoveredMuscle === m;
  return (
    ${formatSvg(frontSvg, 'front')}
  );
}

export function AnatomyBack({ getColor, setHoveredMuscle, hoveredMuscle }: AnatomyProps) {
  const getHoverOpacity = (m: string) => hoveredMuscle === m;
  return (
    ${formatSvg(backSvg, 'back')}
  );
}
`;

fs.writeFileSync(path.join(__dirname, '../frontend/src/components/ai/AnatomyModel.tsx'), finalTsx);
console.log('Saved AnatomyModel.tsx');
