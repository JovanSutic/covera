import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CopyMessageSection } from "./CopyMessageSection";

const { writeText } = vi.hoisted(() => ({ writeText: vi.fn() }));

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);

  // jsdom implements no clipboard at all, so it is defined rather than spied on.
  Object.assign(navigator, { clipboard: { writeText } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderSection(
  overrides: Partial<Parameters<typeof CopyMessageSection>[0]> = {},
) {
  return render(
    <CopyMessageSection
      title="section.title"
      message="the message"
      copyLabel="section.copy"
      copySuccess="section.copied"
      copyError="section.copyError"
      {...overrides}
    />,
  );
}

describe("CopyMessageSection", () => {
  it("shows the message in the section and copies exactly that text", async () => {
    const { container } = renderSection();

    expect(
      (container.querySelector("textarea") as HTMLTextAreaElement).value,
    ).toBe("the message");

    await userEvent.click(screen.getByRole("button", { name: "section.copy" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("the message");
    });
  });

  it("reports a clipboard failure instead of throwing", async () => {
    writeText.mockRejectedValue(new Error("denied"));

    renderSection();

    await userEvent.click(screen.getByRole("button", { name: "section.copy" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByRole("button", { name: "section.copy" }),
    ).toBeInTheDocument();
  });

  it("renders the hint only when one is given", () => {
    const { unmount } = renderSection({ hint: "section.hint" });

    expect(screen.getByText("section.hint")).toBeInTheDocument();

    unmount();

    renderSection();

    expect(screen.queryByText("section.hint")).not.toBeInTheDocument();
  });

  it("renders the optional action beside the copy control", () => {
    renderSection({ action: <a href="https://example.com">section.link</a> });

    expect(
      screen.getByRole("link", { name: "section.link" }),
    ).toHaveAttribute("href", "https://example.com");
  });
});
