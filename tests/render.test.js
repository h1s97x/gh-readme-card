// @ts-check

import { describe, expect, it } from "@jest/globals";
import { queryByTestId } from "@testing-library/dom";
import "@testing-library/jest-dom/jest-globals";
import { renderError } from "../src/common/render.js";

describe("Test render.js", () => {
  it("should test renderError", () => {
    document.body.innerHTML = renderError({ message: "Something went wrong" });
    expect(
      queryByTestId(document.body, "message")?.children[0],
    ).toHaveTextContent(/Something went wrong/gim);
    expect(
      queryByTestId(document.body, "message")?.children[1],
    ).toBeEmptyDOMElement();

    // Secondary message
    document.body.innerHTML = renderError({
      message: "Something went wrong",
      secondaryMessage: "Secondary Message",
    });
    expect(
      queryByTestId(document.body, "message")?.children[1],
    ).toHaveTextContent(/Secondary Message/gim);
  });

  it("should link the error card at this project's issue tracker", () => {
    document.body.innerHTML = renderError({
      message: "Something went wrong",
      secondaryMessage: "Secondary Message",
    });
    const card = document.body.innerHTML;

    expect(card).toContain("https://github.com/h1s97x/gh-readme-card/issues");
    expect(card).not.toContain("https://tiny.one/readme-stats");
  });

  it("should omit the issue link for upstream rate-limit errors", () => {
    document.body.innerHTML = renderError({
      message: "Could not fetch total commits.",
      secondaryMessage: "Please try again later",
    });
    const card = document.body.innerHTML;

    expect(card).not.toContain("/issues");
  });

  it("should omit the issue link when show_repo_link is false", () => {
    document.body.innerHTML = renderError({
      message: "This username is not whitelisted",
      secondaryMessage: "Please deploy your own instance",
      renderOptions: { show_repo_link: false },
    });

    expect(document.body.innerHTML).not.toContain("/issues");
  });
});
