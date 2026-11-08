import React from "react";
import type { SearchError } from "@/hooks/useMediaSearch";
import { PixelSpinner } from "@/components/pixel/PixelSpinner";
import { PixelIcon } from "@/components/pixel/PixelIcon";

const PANE =
  "h-full min-h-40 flex flex-col items-center justify-center gap-2 px-6 text-center";

export const SearchLoadingPane: React.FC = () => (
  <div className={`${PANE} text-muted`}>
    <PixelSpinner cell={5} label="Searching" />
    <span className="text-footnote">Searching…</span>
  </div>
);

export const SearchErrorPane: React.FC<{
  error: SearchError;
  onRetry: () => void;
}> = ({ error, onRetry }) => {
  const offline = error.kind === "offline";

  return (
    <div className={PANE} title={error.detail}>
      <span className="text-subheadline font-semibold text-text">
        {offline ? "No connection" : "Search is unavailable"}
      </span>
      <span className="max-w-[260px] text-caption-1 text-muted leading-relaxed">
        {offline
          ? "Posters need a connection. Your boards still work offline."
          : "The catalogue did not answer. Try again in a moment."}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 h-8 px-3.5 rounded-full material-thin text-footnote font-semibold
                   text-text active:scale-95 transition-transform duration-150"
      >
        Try again
      </button>
    </div>
  );
};

export const SearchEmptyPane: React.FC<{
  query: string;
  sourceLabel: string;
}> = ({ query, sourceLabel }) => (
  <div className={PANE}>
    <PixelIcon name="search" size={22} className="text-muted opacity-60" />
    <span className="text-subheadline font-semibold text-text">
      Nothing found
    </span>
    <span className="max-w-[260px] text-caption-1 text-muted leading-relaxed">
      No match for <span className="text-text font-medium">“{query}”</span> on{" "}
      {sourceLabel}.
    </span>
  </div>
);

export const SearchIdlePane: React.FC = () => (
  <div className={`${PANE} text-muted select-none`}>
    <PixelIcon name="image" size={26} className="opacity-25" />
    <span className="text-footnote font-medium text-text">Find a poster</span>
    <span className="max-w-[240px] text-caption-1 leading-relaxed">
      Search an anime, a manga or a character, then tap a result to add it to
      the stash.
    </span>
  </div>
);
