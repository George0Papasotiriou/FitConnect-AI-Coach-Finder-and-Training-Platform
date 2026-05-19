"use client";
import React from "react";
import { motion } from "framer-motion";

export interface TestimonialItem {
  text: string;
  image: string;
  name: string;
  role: string;
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: TestimonialItem[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 15,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div 
                  className="p-6 rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md shadow-2xl max-w-[280px] w-full text-text-primary" 
                  key={i}
                >
                  <div className="text-xs leading-relaxed opacity-90 font-medium font-sans">"{text}"</div>
                  <div className="flex items-center gap-3 mt-4">
                    <img
                      width={36}
                      height={36}
                      src={image}
                      alt={name}
                      className="h-9 w-9 rounded-full object-cover border border-white/20"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="font-bold text-xs tracking-tight leading-4 truncate text-text-primary">{name}</div>
                      <div className="text-[10px] leading-4 opacity-60 tracking-tight truncate text-text-secondary">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};
