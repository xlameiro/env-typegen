import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

describe("Card", () => {
  it("should render a div element", () => {
    render(<Card data-testid="card">content</Card>);
    expect(screen.getByTestId("card").tagName).toBe("DIV");
  });

  it("should render children", () => {
    render(<Card>Card body</Card>);
    expect(screen.getByText("Card body")).toBeInTheDocument();
  });

  it("should merge custom className", () => {
    render(
      <Card className="extra-class" data-testid="card">
        c
      </Card>,
    );
    expect(screen.getByTestId("card").className).toContain("extra-class");
    expect(screen.getByTestId("card").className).toContain("rounded-xl");
  });

  it("should forward HTML div attributes", () => {
    render(
      <Card aria-label="card label" data-testid="card">
        c
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveAttribute(
      "aria-label",
      "card label",
    );
  });
});

describe("CardHeader", () => {
  it("should render a div and accept className", () => {
    render(
      <CardHeader className="hdr" data-testid="hdr">
        header
      </CardHeader>,
    );
    const el = screen.getByTestId("hdr");
    expect(el.tagName).toBe("DIV");
    expect(el.className).toContain("hdr");
  });
});

describe("CardTitle", () => {
  it("should render h3 by default", () => {
    render(<CardTitle data-testid="title">My Title</CardTitle>);
    expect(screen.getByTestId("title").tagName).toBe("H3");
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it.each(["h1", "h2", "h3", "h4", "h5", "h6"] as const)(
    "should render as %s when `as` prop is provided",
    (tag) => {
      render(
        <CardTitle as={tag} data-testid="title">
          {tag}
        </CardTitle>,
      );
      expect(screen.getByTestId("title").tagName).toBe(tag.toUpperCase());
    },
  );
});

describe("CardDescription", () => {
  it("should render a paragraph", () => {
    render(
      <CardDescription data-testid="desc">Description text</CardDescription>,
    );
    expect(screen.getByTestId("desc").tagName).toBe("P");
    expect(screen.getByText("Description text")).toBeInTheDocument();
  });
});

describe("CardContent", () => {
  it("should render children in a div", () => {
    render(<CardContent>Main content</CardContent>);
    expect(screen.getByText("Main content")).toBeInTheDocument();
  });
});

describe("CardFooter", () => {
  it("should render children in a div", () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });
});

describe("Card composition", () => {
  it("should render all sub-components together", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Desc")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});
