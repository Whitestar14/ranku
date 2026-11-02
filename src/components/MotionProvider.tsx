import React from "react";
import { MotionConfig } from "motion/react";

/** `a11y.css` can only shorten CSS motion; this hands the same preference to
 *  the JS springs that drive most of the interface. */
export const MotionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <MotionConfig reducedMotion="user">{children}</MotionConfig>;