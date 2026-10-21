import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftOutcome } from "./config";
import { MAX_SLIDES } from "./config";
import type { ProviderResult } from "./provider";
import type { Presentation } from "@/lib/presentation/types";

vi.mock("./gate", () => ({ admitRequest: vi.fn<(clientIp: string | null) => Promise<DraftOutcome | null>>() }));
vi.mock("./provider", () => ({
  generateDraft: vi.fn<(brief: string, signal: AbortSignal) => Promise<ProviderResult>>(),
  repairDraft: vi.fn<(originalText: string, signal: AbortSignal) => Promise<ProviderResult>>(),
}));
vi.mock("@/lib/presentation", () => ({ parsePresentation: vi.fn<(source: string) => Presentation>() }));

import { admitRequest } from "./gate";
import { generateDraft, repairDraft } from "./provider";
import { parsePresentation } from "@/lib/presentation";
import { generateFreeDraft } from "./generate";

const signal = new AbortController().signal;

function wrapSource(source: string): string {
  return `<presentation>${source}</presentation>`;
}

function makeSlides(n: number): { heading: string }[] {
  return Array.from({ length: n }, (_, i) => ({ heading: `Slide ${i + 1}` }));
}

const validSource = "# Hello\n\nWorld";
const validText = wrapSource(validSource);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parsePresentation).mockReturnValue({ slides: makeSlides(1) } as any);
});

describe("gate rejection", () => {
  it("returns the gate outcome and makes no provider call when gate rejects", async () => {
    const limitOutcome: DraftOutcome = { kind: "limit", reason: "disabled" };
    vi.mocked(admitRequest).mockResolvedValue(limitOutcome);

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual(limitOutcome);
    expect(generateDraft).not.toHaveBeenCalled();
  });

  it("returns limit:already-used when gate says already-used", async () => {
    vi.mocked(admitRequest).mockResolvedValue({ kind: "limit", reason: "already-used" });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "limit", reason: "already-used" });
    expect(generateDraft).not.toHaveBeenCalled();
  });
});

describe("provider failure on first attempt", () => {
  it("returns provider-failure when generateDraft returns refused", async () => {
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({ kind: "refused" });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "provider-failure" });
    expect(repairDraft).not.toHaveBeenCalled();
  });

  it("returns provider-failure when generateDraft returns error", async () => {
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({ kind: "error", message: "timeout" });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "provider-failure" });
    expect(repairDraft).not.toHaveBeenCalled();
  });
});

describe("valid first attempt", () => {
  it("returns presentation when first attempt is valid", async () => {
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: validText,
      inputTokens: 10,
      outputTokens: 20,
    });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "presentation", source: validSource });
    expect(repairDraft).not.toHaveBeenCalled();
  });

  it("uses the last <presentation> tag when there are multiple", async () => {
    const firstSource = "# First";
    const secondSource = "# Second\n\nBetter";
    const text = `<presentation>${firstSource}</presentation> extra <presentation>${secondSource}</presentation>`;
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text,
      inputTokens: 10,
      outputTokens: 20,
    });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "presentation", source: secondSource });
  });
});

describe("sanitisation rejection — no repair", () => {
  it("returns invalid-output and skips repair when source contains http://", async () => {
    const unsafeSource = "# Title\n\nSee http://example.com";
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: wrapSource(unsafeSource),
      inputTokens: 10,
      outputTokens: 20,
    });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "invalid-output" });
    expect(repairDraft).not.toHaveBeenCalled();
  });

  it("returns invalid-output and skips repair when source contains https://", async () => {
    const unsafeSource = "# Title\n\nSee https://example.com";
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: wrapSource(unsafeSource),
      inputTokens: 10,
      outputTokens: 20,
    });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "invalid-output" });
    expect(repairDraft).not.toHaveBeenCalled();
  });

  it("returns invalid-output and skips repair when source contains image widget", async () => {
    const unsafeSource = "# Title\n\n![alt](image.png)";
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: wrapSource(unsafeSource),
      inputTokens: 10,
      outputTokens: 20,
    });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "invalid-output" });
    expect(repairDraft).not.toHaveBeenCalled();
  });
});

describe("slide count exceeded — no repair", () => {
  it("returns invalid-output and skips repair when slide count exceeds MAX_SLIDES", async () => {
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: validText,
      inputTokens: 10,
      outputTokens: 20,
    });
    vi.mocked(parsePresentation).mockReturnValue({
      slides: makeSlides(MAX_SLIDES + 1),
    } as any);

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "invalid-output" });
    expect(repairDraft).not.toHaveBeenCalled();
  });
});

describe("parse failure triggers repair", () => {
  it("calls repairDraft when first attempt has missing presentation tags", async () => {
    const noTagsText = "Some text without tags";
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: noTagsText,
      inputTokens: 10,
      outputTokens: 20,
    });
    vi.mocked(repairDraft).mockResolvedValue({
      kind: "ok",
      text: validText,
      inputTokens: 10,
      outputTokens: 20,
    });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(repairDraft).toHaveBeenCalledOnce();
    expect(result).toEqual({ kind: "presentation", source: validSource });
  });

  it("calls repairDraft when parsePresentation throws on first attempt", async () => {
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: validText,
      inputTokens: 10,
      outputTokens: 20,
    });
    vi.mocked(parsePresentation)
      .mockImplementationOnce(() => {
        throw new Error("parse error");
      })
      .mockReturnValue({ slides: makeSlides(1) } as any);
    vi.mocked(repairDraft).mockResolvedValue({
      kind: "ok",
      text: wrapSource("# Repaired"),
      inputTokens: 10,
      outputTokens: 20,
    });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(repairDraft).toHaveBeenCalledOnce();
    expect(result).toEqual({ kind: "presentation", source: "# Repaired" });
  });
});

describe("repair failure", () => {
  it("returns provider-failure when repairDraft returns error", async () => {
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: "no tags",
      inputTokens: 10,
      outputTokens: 20,
    });
    vi.mocked(repairDraft).mockResolvedValue({ kind: "error", message: "timeout" });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "provider-failure" });
  });

  it("returns provider-failure when repairDraft returns refused", async () => {
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: "no tags",
      inputTokens: 10,
      outputTokens: 20,
    });
    vi.mocked(repairDraft).mockResolvedValue({ kind: "refused" });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "provider-failure" });
  });

  it("returns invalid-output when repair output is also invalid", async () => {
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: "no tags",
      inputTokens: 10,
      outputTokens: 20,
    });
    vi.mocked(repairDraft).mockResolvedValue({
      kind: "ok",
      text: "still no tags",
      inputTokens: 10,
      outputTokens: 20,
    });

    const result = await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(result).toEqual({ kind: "invalid-output" });
  });
});

describe("at most two provider calls", () => {
  it("never calls repairDraft more than once", async () => {
    vi.mocked(admitRequest).mockResolvedValue(null);
    vi.mocked(generateDraft).mockResolvedValue({
      kind: "ok",
      text: "no tags",
      inputTokens: 10,
      outputTokens: 20,
    });
    vi.mocked(repairDraft).mockResolvedValue({
      kind: "ok",
      text: "still no tags",
      inputTokens: 10,
      outputTokens: 20,
    });

    await generateFreeDraft("my brief", "1.2.3.4", signal);

    expect(generateDraft).toHaveBeenCalledOnce();
    expect(repairDraft).toHaveBeenCalledOnce();
  });
});
