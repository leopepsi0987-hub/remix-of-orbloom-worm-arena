import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoundEnd } from "@/components/RoundEnd";

describe("Round-end screen", () => {
  it("shows final length, longest length, and placement out of the field", () => {
    render(<RoundEnd score={120} longest={150} place={3} total={21} best={200} onRetry={() => {}} onHome={() => {}} />);

    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("/ 21")).toBeInTheDocument();
  });

  it("celebrates a new best only when the run beats the record", () => {
    const { rerender } = render(
      <RoundEnd score={250} longest={250} place={1} total={21} best={200} onRetry={() => {}} onHome={() => {}} />,
    );
    expect(screen.getByText("New best!")).toBeInTheDocument();

    rerender(<RoundEnd score={120} longest={150} place={3} total={21} best={200} onRetry={() => {}} onHome={() => {}} />);
    expect(screen.queryByText("New best!")).not.toBeInTheDocument();
  });
});
