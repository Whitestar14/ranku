import { describe, expect, it } from "vitest";
import {
  formatAdded,
  formatBytes,
  imageFileName,
  imageFormatLabel,
  imageSourceLabel,
  inlineImageBytes,
  isInlineImage,
} from "./imageInfo";

const ANILIST_POSTER =
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1-K7f9F.jpg?width=460";

describe("isInlineImage", () => {
  it("recognises data and blob sources", () => {
    expect(isInlineImage("data:image/png;base64,AAAA")).toBe(true);
    expect(isInlineImage("blob:http://localhost/abc")).toBe(true);
    expect(isInlineImage("https://example.com/a.jpg")).toBe(false);
  });
});

describe("imageFileName", () => {
  it("uses the last path segment and ignores the query", () => {
    expect(imageFileName(ANILIST_POSTER)).toBe("bx1-K7f9F.jpg");
  });

  it("decodes escaped names", () => {
    expect(imageFileName("https://example.com/a%20poster.png")).toBe(
      "a poster.png",
    );
  });

  it("labels inline sources by how they arrived", () => {
    expect(imageFileName("data:image/png;base64,AAAA")).toBe("Inline image");
    expect(imageFileName("blob:http://localhost/abc")).toBe("Pasted image");
  });

  it("falls back when the URL has no path", () => {
    expect(imageFileName("https://example.com")).toBe("Remote image");
    expect(imageFileName("not a url")).toBe("Remote image");
  });
});

describe("imageSourceLabel", () => {
  it("names the providers behind their CDNs", () => {
    expect(imageSourceLabel(ANILIST_POSTER)).toBe("AniList");
    expect(
      imageSourceLabel("https://cdn.myanimelist.net/images/anime/1/1.jpg"),
    ).toBe("MyAnimeList");
  });

  it("shows an unknown host verbatim", () => {
    expect(imageSourceLabel("https://images.example.org/a.jpg")).toBe(
      "images.example.org",
    );
  });

  it("distinguishes uploads from pastes", () => {
    expect(imageSourceLabel("data:image/png;base64,AAAA")).toBe("Local upload");
    expect(imageSourceLabel("blob:http://localhost/abc")).toBe("Local paste");
  });
});

describe("imageFormatLabel", () => {
  it("reads the data URL's mime type", () => {
    expect(imageFormatLabel("data:image/webp;base64,AAAA")).toBe("WEBP");
  });

  it("reads the extension of a remote file", () => {
    expect(imageFormatLabel(ANILIST_POSTER)).toBe("JPG");
    expect(imageFormatLabel("https://example.com/a.jpeg")).toBe("JPEG");
  });

  it("reports unknown instead of guessing", () => {
    expect(imageFormatLabel("https://example.com/poster")).toBe("Unknown");
  });
});

describe("inlineImageBytes", () => {
  it("decodes the base64 payload length", () => {
    expect(inlineImageBytes("data:image/png;base64,AAAA")).toBe(3);
    expect(inlineImageBytes("data:image/png;base64,AAA=")).toBe(2);
    expect(inlineImageBytes("data:image/png;base64,AA==")).toBe(1);
  });

  it("refuses remote and non-base64 sources", () => {
    expect(inlineImageBytes(ANILIST_POSTER)).toBeNull();
    expect(inlineImageBytes("data:image/svg+xml,<svg/>")).toBeNull();
  });
});

describe("formatBytes", () => {
  it("scales through the units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024)).toBe("10 KB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});

describe("formatAdded", () => {
  it("shows a readable date", () => {
    const at = new Date(2026, 0, 2, 15, 4).getTime();
    expect(formatAdded(at)).toContain("2026");
  });

  it("does not invent a date for older items", () => {
    expect(formatAdded(undefined)).toBe("Unknown");
    expect(formatAdded(Number.NaN)).toBe("Unknown");
  });
});
