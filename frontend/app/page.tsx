"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApertureLogo } from "@/components/aperture-logo";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { GlassButton } from "@/components/ui/glass-button";
import { createLogger } from "@/lib/logger";

const log = createLogger("landing");

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    log.info("Landing page mounted");
  }, []);

  const handleStart = () => {
    log.debug("Navigating to /canvas");
    router.push("/canvas");
  };

  return (
    <div className="dark">
      <AuroraBackground showRadialGradient={false}>
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 px-6 text-center"
      >
        <ApertureLogo size={56} className="text-white/85" />
        <h1
          className="font-serif text-5xl tracking-tight md:text-7xl lg:text-9xl"
          style={{
            background:
              "linear-gradient(180deg, #fafafa 0%, rgba(250,250,250,0.4) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Aperture
        </h1>

        <p className="max-w-md font-sans text-base text-white/70 md:text-lg lg:text-xl">
          Ask your data anything. See the answer beautifully.
        </p>

        <GlassButton size="lg" onClick={handleStart}>
          Start exploring
        </GlassButton>
        </motion.div>
      </AuroraBackground>
    </div>
  );
}
