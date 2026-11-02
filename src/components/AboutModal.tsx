import React from "react";
import { Modal } from "./ui/Modal";
import { SettingButtonGroup, SettingRow } from "./ui/SettingCard";
import { ExternalLink } from "lucide-react";
import { PixelWordmark } from "./app/PixelWordmark";
import { BRAND_PALETTE, APP_VERSION } from "@/constants/brand";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    className="max-w-75"
    contentClassName="p-0 overflow-hidden"
    aria-labelledby="about-modal-title"
  >
    <div className="relative flex flex-col">
      <h2 id="about-modal-title" className="sr-only">
        About Ranku
      </h2>

      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-36 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-conic-gradient(var(--color-text) 0% 25%, transparent 0% 50%)",
          backgroundSize: "6px 6px",
          maskImage:
            "radial-gradient(ellipse 80% 100% at 50% 0%, #000 0%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 100% at 50% 0%, #000 0%, transparent 78%)",
        }}
      />

      <div className="relative flex flex-col items-center px-6 pt-8 pb-6">
        <span aria-hidden>
          <PixelWordmark height={21} className="text-text" />
        </span>

        <span aria-hidden className="flex items-center gap-1 mt-4">
          {BRAND_PALETTE.map((color, i) => (
            <span
              key={i}
              className="block w-1 h-1 rounded-[1px]"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>

        <p className="text-caption-1 text-muted mt-3 text-center leading-snug">
          Anime posters and rankings
        </p>
        <p className="text-caption-2 text-faint mt-1 tabular-nums">
          Version {APP_VERSION}
        </p>
      </div>

      <div className="relative px-4 pb-4">
        <SettingButtonGroup className="material-card rounded-card overflow-hidden">
          <SettingRow
            as="div"
            label="Developer"
            right={
              <span className="text-subheadline text-muted">xijibomi</span>
            }
            className="min-h-11.5 py-0"
          />
          <SettingRow
            as="div"
            label="License"
            right={<span className="text-subheadline text-muted">MIT</span>}
            className="min-h-11.5 py-0"
          />
          <SettingRow
            as="a"
            href="https://github.com/Whitestar14/anigrid"
            target="_blank"
            rel="noopener noreferrer"
            label="Source"
            right={
              <>
                <ExternalLink size={13} className="text-muted/60" aria-hidden />
                <span className="sr-only"> (opens in a new tab)</span>
              </>
            }
            className="min-h-11.5 py-0"
          />
        </SettingButtonGroup>
      </div>

      <p className="relative px-7 pb-6 text-caption-1 text-muted/70 text-center leading-relaxed">
        The easiest and sleekest way to make 3×3s, tier grids and beautiful
        anime posters.
      </p>

      <div className="relative border-t border-hairline">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 text-body font-semibold text-primary
                     hover:bg-hover active:bg-black/5 dark:active:bg-white/5
                     transition-colors duration-150"
        >
          Done
        </button>
      </div>
    </div>
  </Modal>
);
