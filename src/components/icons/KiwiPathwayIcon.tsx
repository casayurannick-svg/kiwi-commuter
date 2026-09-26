import React from 'react';

export interface KiwiPathwayIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export default function KiwiPathwayIcon({
  className = 'h-8 w-8 text-emerald-500',
  ...props
}: KiwiPathwayIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      className={className}
      {...props}
    >
      {/* 
        Kiwi Commuter Logo - Concept 1: The Kiwi Pathway
        Color matches the active transit/EV state in the UI. 
      */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Main transit line: Back -> Head -> Beak */}
        <path d="M30,85 C10,85 10,45 35,35 C55,27 65,40 80,45 C95,50 105,55 110,58" />

        {/* Arrowhead at the end of the beak to signify forward momentum/routing */}
        <path d="M98,48 L110,58 L98,66" />

        {/* Inner transit route connecting the body */}
        <path d="M30,85 C45,85 55,55 75,60" />

        {/* Destination Node (Internal route) */}
        <circle cx="75" cy="60" r="4" fill="currentColor" stroke="none" />

        {/* Eye Node (Transit Stop) */}
        <circle cx="82" cy="42" r="4" fill="currentColor" stroke="none" />

        {/* Forward Leg / Transit Branch */}
        <path d="M60,56 L65,95 L75,95" />

        {/* Back Leg / Transit Branch */}
        <path d="M45,67 L45,95 L55,95" />
      </g>
    </svg>
  );
}
