import {DurationDisplay} from 'app/components/waterfallTree/types';
import space from 'app/styles/space';
import {Theme} from 'app/utils/theme';

export const getBackgroundColor = ({
  showStriping,
  showDetail,
  theme,
}: {
  showStriping?: boolean;
  showDetail?: boolean;
  theme: Theme;
}) => {
  if (showDetail) {
    return theme.textColor;
  }

  if (showStriping) {
    return theme.backgroundSecondary;
  }

  return theme.background;
};

type HatchProps = {
  spanBarHatch: boolean;
};

export function getHatchPattern(
  {spanBarHatch}: HatchProps,
  primary: string,
  alternate: string
) {
  if (spanBarHatch === true) {
    return `
      background-image: linear-gradient(135deg,
        ${alternate},
        ${alternate} 2.5px,
        ${primary} 2.5px,
        ${primary} 5px,
        ${alternate} 6px,
        ${alternate} 8px,
        ${primary} 8px,
        ${primary} 11px,
        ${alternate} 11px,
        ${alternate} 14px,
        ${primary} 14px,
        ${primary} 16.5px,
        ${alternate} 16.5px,
        ${alternate} 19px,
        ${primary} 20px
      );
      background-size: 16px 16px;
    `;
  }

  return null;
}

export const getDurationPillAlignment = ({
  durationDisplay,
  theme,
  spanBarHatch,
}: {
  durationDisplay: DurationDisplay;
  theme: Theme;
  spanBarHatch: boolean;
}) => {
  switch (durationDisplay) {
    case 'left':
      return `right: calc(100% + ${space(0.5)});`;
    case 'right':
      return `left: calc(100% + ${space(0.75)});`;
    default:
      return `
        right: ${space(0.75)};
        color: ${spanBarHatch === true ? theme.gray300 : theme.white};
      `;
  }
};

export const getToggleTheme = ({
  isExpanded,
  theme,
  disabled,
}: {
  isExpanded: boolean;
  theme: Theme;
  disabled: boolean;
}) => {
  const buttonTheme = isExpanded ? theme.button.default : theme.button.primary;

  if (disabled) {
    return `
    background: ${buttonTheme.background};
    border: 1px solid ${theme.border};
    color: ${buttonTheme.color};
    cursor: default;
  `;
  }

  return `
    background: ${buttonTheme.background};
    border: 1px solid ${theme.border};
    color: ${buttonTheme.color};
  `;
};

export const getDurationDisplay = ({
  width,
  left,
}: {
  width: undefined | number;
  left: undefined | number;
}): DurationDisplay => {
  const spaceNeeded = 0.3;

  if (left === undefined || width === undefined) {
    return 'inset';
  }
  if (left + width < 1 - spaceNeeded) {
    return 'right';
  }
  if (left > spaceNeeded) {
    return 'left';
  }
  return 'inset';
};

export const getHumanDuration = (duration: number): string => {
  // note: duration is assumed to be in seconds
  const durationMS = duration * 1000;
  return `${durationMS.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}ms`;
};

export const toPercent = (value: number) => `${(value * 100).toFixed(3)}%`;

type Rect = {
  // x and y are left/top coords respectively
  x: number;
  y: number;
  width: number;
  height: number;
};

// get position of element relative to top/left of document
const getOffsetOfElement = (element: Element) => {
  // left and top are relative to viewport
  const {left, top} = element.getBoundingClientRect();

  // get values that the document is currently scrolled by
  const scrollLeft = window.pageXOffset;
  const scrollTop = window.pageYOffset;

  return {x: left + scrollLeft, y: top + scrollTop};
};

export const rectOfContent = (element: Element): Rect => {
  const {x, y} = getOffsetOfElement(element);

  // offsets for the border and any scrollbars (clientLeft and clientTop),
  // and if the element was scrolled (scrollLeft and scrollTop)
  //
  // NOTE: clientLeft and clientTop does not account for any margins nor padding
  const contentOffsetLeft = element.clientLeft - element.scrollLeft;
  const contentOffsetTop = element.clientTop - element.scrollTop;

  return {
    x: x + contentOffsetLeft,
    y: y + contentOffsetTop,
    width: element.scrollWidth,
    height: element.scrollHeight,
  };
};

export const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};
