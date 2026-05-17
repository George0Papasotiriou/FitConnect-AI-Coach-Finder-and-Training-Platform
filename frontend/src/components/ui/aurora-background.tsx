"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <style>{`
        .aurora-container {
          --white: #ffffff;
          --black: #000000;
          --transparent: transparent;
          --blue-500: #0c1a30;   /* Deep metallic blue */
          --indigo-300: #38bdf8; /* Saturated sky blue */
          --blue-300: #1d4ed8;   /* Pure royal blue */
          --violet-200: #a16207; /* Burnished gold / bronze */
          --blue-400: #1c1d24;   /* Metallic dark slate */
        }

        .animate-aurora-custom {
          animation: aurora-base-anim 160s linear infinite;
        }

        .animate-aurora-custom::after {
          animation: aurora-after-anim 100s linear infinite;
        }

        @keyframes aurora-base-anim {
          0% {
            background-position: 50% 50%, 50% 50%;
          }
          50% {
            background-position: 150% 50%, 100% 50%;
          }
          100% {
            background-position: 250% 50%, 50% 50%;
          }
        }

        @keyframes aurora-after-anim {
          0% {
            background-position: 50% 50%, 50% 50%;
          }
          50% {
            background-position: -50% 50%, 150% 50%;
          }
          100% {
            background-position: -150% 50%, 50% 50%;
          }
        }

        /* High-fidelity film grain texture */
        .grain-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
        }

        /* Ambient light vignette overlay */
        .vignette-overlay {
          background: radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.6) 100%);
        }

        /* Sleek metallic glassmorphism typography */
        .glass-title-text {
          background: linear-gradient(
            135deg,
            #ffffff 0%,
            rgba(255, 255, 255, 0.85) 35%,
            rgba(255, 255, 255, 0.3) 60%,
            rgba(255, 255, 255, 0.9) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 25px rgba(255, 255, 255, 0.12));
          -webkit-text-fill-color: transparent;
        }

        /* Frosted glass keys */
        .glass-key-button {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow: 
            inset 0 1px 0 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 0 0 rgba(0, 0, 0, 0.15),
            0 10px 30px -10px rgba(0, 0, 0, 0.6),
            0 1px 2px rgba(255, 255, 255, 0.05);
          transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .glass-key-button:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: 
            inset 0 1px 0 0 rgba(255, 255, 255, 0.35),
            0 15px 35px -8px rgba(0, 0, 0, 0.7),
            0 0 25px rgba(255, 255, 255, 0.1);
          transform: scale(1.04) translateY(-1px);
        }

        .glass-key-button:active {
          transform: scale(0.97) translateY(0);
        }
      `}</style>
      <div
        className={cn(
          "relative flex flex-col h-[100vh] w-full items-center justify-center bg-[#0d0f12] text-slate-950 transition-bg overflow-hidden aurora-container",
          className
        )}
        {...props}
      >
        {/* Background Lights layer */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              "animate-aurora-custom",
              `
            [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
            [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]
            [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)]
            [background-image:var(--white-gradient),var(--aurora)]
            dark:[background-image:var(--dark-gradient),var(--aurora)]
            [background-size:250%,_180%]
            [background-position:50%_50%,50%_50%]
            filter blur-[8px] invert dark:invert-0
            after:content-[""] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] 
            after:dark:[background-image:var(--dark-gradient),var(--aurora)]
            after:[background-size:180%,_100%] 
            after:animate-aurora-custom after:[background-attachment:fixed] after:mix-blend-difference
            pointer-events-none
            absolute -inset-[10px] opacity-[0.6] will-change-transform`,

              showRadialGradient &&
                `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`
            )}
          ></div>
        </div>

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 vignette-overlay pointer-events-none z-10" />

        {/* Cinematic Film Grain Overlay */}
        <div className="absolute inset-0 grain-overlay pointer-events-none z-10" />

        {/* Content Wrapper */}
        <div className="relative z-20 w-full h-full flex flex-col items-center justify-center">
          {children}
        </div>
      </div>
    </main>
  );
};
