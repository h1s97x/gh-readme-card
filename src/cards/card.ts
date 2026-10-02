import { encodeHTML } from "../common/html.ts";
import { flexLayout } from "./render.ts";

/**
 * Colours a card renders with, already resolved against its theme.
 *
 * `bgColor` is either a hex string or a gradient: the angle followed by the
 * colour stops.
 */
export interface CardColors {
  titleColor: string;
  textColor: string;
  iconColor: string;
  bgColor: string | string[];
  borderColor: string;
}

export interface CardOptions {
  width?: number;
  height?: number;
  border_radius?: number;
  customTitle?: string;
  defaultTitle?: string;
  titlePrefixIcon?: string;
  colors?: Partial<CardColors>;
}

/** Base class for every card: owns the frame, the title and the CSS. */
class Card {
  width: number;
  height: number;
  hideBorder: boolean;
  hideTitle: boolean;
  border_radius: number;
  colors: Partial<CardColors>;
  title: string;
  css: string;
  paddingX: number;
  paddingY: number;
  titlePrefixIcon: string | undefined;
  animations: boolean;
  a11yTitle: string;
  a11yDesc: string;

  constructor({
    width = 100,
    height = 100,
    border_radius = 4.5,
    colors = {},
    customTitle,
    defaultTitle = "",
    titlePrefixIcon,
  }: CardOptions = {}) {
    this.width = width;
    this.height = height;

    this.hideBorder = false;
    this.hideTitle = false;

    this.border_radius = border_radius;

    this.colors = colors;
    this.title =
      customTitle === undefined
        ? encodeHTML(defaultTitle)
        : encodeHTML(customTitle);

    this.css = "";

    this.paddingX = 25;
    this.paddingY = 35;
    this.titlePrefixIcon = titlePrefixIcon;
    this.animations = true;
    this.a11yTitle = "";
    this.a11yDesc = "";
  }

  /** Turn off the entrance animations. */
  disableAnimations(): void {
    this.animations = false;
  }

  /**
   * Set the text a screen reader announces for the card.
   *
   * @param title Short accessible name.
   * @param desc Longer description of what the card shows.
   */
  setAccessibilityLabel({
    title,
    desc,
  }: {
    title: string;
    desc: string;
  }): void {
    this.a11yTitle = title;
    this.a11yDesc = desc;
  }

  /**
   * Append card-specific CSS.
   *
   * @param value The CSS to add to the card.
   */
  setCSS(value: string): void {
    this.css = value;
  }

  /**
   * @param value Whether to hide the border.
   */
  setHideBorder(value: boolean): void {
    this.hideBorder = value;
  }

  /**
   * @param value Whether to hide the title. Hiding it shrinks the card.
   */
  setHideTitle(value: boolean): void {
    this.hideTitle = value;
    if (value) {
      this.height -= 30;
    }
  }

  /**
   * @param text The title to set, already escaped.
   */
  setTitle(text: string): void {
    this.title = text;
  }

  /** @returns The rendered card title. */
  renderTitle(): string {
    const titleText = `
      <text
        x="0"
        y="0"
        class="header"
        data-testid="header"
      >${this.title}</text>
    `;

    const prefixIcon = `
      <svg
        class="icon"
        x="0"
        y="-13"
        viewBox="0 0 16 16"
        version="1.1"
        width="16"
        height="16"
      >
        ${this.titlePrefixIcon}
      </svg>
    `;
    return `
      <g
        data-testid="card-title"
        transform="translate(${this.paddingX}, ${this.paddingY})"
      >
        ${flexLayout({
          items: [this.titlePrefixIcon ? prefixIcon : "", titleText],
          gap: 25,
        }).join("")}
      </g>
    `;
  }

  /** @returns The `<defs>` block for a gradient background, or empty. */
  renderGradient(): string {
    if (typeof this.colors.bgColor !== "object") {
      return "";
    }

    const colors = this.colors.bgColor as string[];
    const gradients = colors.slice(1);
    return `
        <defs>
          <linearGradient
            id="gradient"
            gradientTransform="rotate(${colors[0]})"
            gradientUnits="userSpaceOnUse"
          >
            ${gradients.map((grad, index) => {
              let offset = (index * 100) / (gradients.length - 1);
              return `<stop offset="${offset}%" stop-color="#${grad}" />`;
            })}
          </linearGradient>
        </defs>
        `;
  }

  /** @returns The `@keyframes` the card animates with. */
  getAnimations = (): string => {
    return `
      /* Animations */
      @keyframes scaleInAnimation {
        from {
          transform: translate(-5px, 5px) scale(0);
        }
        to {
          transform: translate(-5px, 5px) scale(1);
        }
      }
      @keyframes fadeInAnimation {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
  };

  /**
   * @param body The inner body of the card.
   * @returns The rendered card.
   */
  render(body: string): string {
    return `
      <svg
        width="${this.width}"
        height="${this.height}"
        viewBox="0 0 ${this.width} ${this.height}"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="descId"
      >
        <title id="titleId">${this.a11yTitle}</title>
        <desc id="descId">${this.a11yDesc}</desc>
        <style>
          .header {
            font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
            fill: ${this.colors.titleColor};
            animation: fadeInAnimation 0.8s ease-in-out forwards;
          }
          @supports(-moz-appearance: auto) {
            /* Selector detects Firefox */
            .header { font-size: 15.5px; }
          }
          ${this.css}

          ${process.env.NODE_ENV === "test" ? "" : this.getAnimations()}
          ${
            this.animations === false
              ? `* { animation-duration: 0s !important; animation-delay: 0s !important; }`
              : ""
          }
        </style>

        ${this.renderGradient()}

        <rect
          data-testid="card-bg"
          x="0.5"
          y="0.5"
          rx="${this.border_radius}"
          height="99%"
          stroke="${this.colors.borderColor}"
          width="${this.width - 1}"
          fill="${
            typeof this.colors.bgColor === "object"
              ? "url(#gradient)"
              : this.colors.bgColor
          }"
          stroke-opacity="${this.hideBorder ? 0 : 1}"
        />

        ${this.hideTitle ? "" : this.renderTitle()}

        <g
          data-testid="main-card-body"
          transform="translate(0, ${
            this.hideTitle ? this.paddingX : this.paddingY + 20
          })"
        >
          ${body}
        </g>
      </svg>
    `;
  }
}

export { Card };
export default Card;
