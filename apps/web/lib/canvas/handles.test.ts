import { describe, expect, it } from "vitest";
import { pickHandles } from "./handles";

describe("pickHandles", () => {
  it("connects side-by-side nodes right to left", () => {
    expect(pickHandles({ x: 0, y: 0 }, { x: 300, y: 10 })).toEqual({ sourceHandle: "right", targetHandle: "left" });
  });
  it("connects a target on the left from the left side", () => {
    expect(pickHandles({ x: 600, y: 0 }, { x: 300, y: 0 })).toEqual({ sourceHandle: "left", targetHandle: "right" });
  });
  it("connects stacked nodes bottom to top, and top to bottom when the target is above", () => {
    expect(pickHandles({ x: 0, y: 0 }, { x: 20, y: 170 })).toEqual({ sourceHandle: "bottom", targetHandle: "top" });
    expect(pickHandles({ x: 0, y: 170 }, { x: 0, y: 0 })).toEqual({ sourceHandle: "top", targetHandle: "bottom" });
  });
  it("prefers sideways when far apart horizontally even if also below", () => {
    expect(pickHandles({ x: 0, y: 0 }, { x: 300, y: 300 })).toEqual({ sourceHandle: "right", targetHandle: "left" });
  });
});
