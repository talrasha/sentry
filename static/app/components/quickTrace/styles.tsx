import React from 'react';
import styled from '@emotion/styled';
import {LocationDescriptor} from 'history';

import MenuHeader from 'app/components/actions/menuHeader';
import ExternalLink from 'app/components/links/externalLink';
import MenuItem from 'app/components/menuItem';
import Tag, {Background} from 'app/components/tag';
import Truncate from 'app/components/truncate';
import space from 'app/styles/space';
import {getDuration} from 'app/utils/formatters';
import {QuickTraceEvent} from 'app/utils/performance/quickTrace/types';
import {Theme} from 'app/utils/theme';

export const SectionSubtext = styled('div')`
  color: ${p => p.theme.subText};
  font-size: ${p => p.theme.fontSizeMedium};
`;

export const QuickTraceContainer = styled('div')`
  display: flex;
  align-items: center;
  height: 24px;
`;

const nodeColors = (theme: Theme) => ({
  error: {
    color: theme.white,
    background: theme.red300,
    border: theme.red300,
  },
  warning: {
    color: theme.red300,
    background: theme.background,
    border: theme.red300,
  },
  white: {
    color: theme.textColor,
    background: theme.background,
    border: theme.textColor,
  },
  black: {
    color: theme.background,
    background: theme.textColor,
    border: theme.textColor,
  },
});

export const EventNode = styled(Tag)`
  span {
    display: flex;
    color: ${p => nodeColors(p.theme)[p.type || 'white'].color};
  }
  & ${/* sc-selector */ Background} {
    background-color: ${p => nodeColors(p.theme)[p.type || 'white'].background};
    border: 1px solid ${p => nodeColors(p.theme)[p.type || 'white'].border};
  }
`;

export const TraceConnector = styled('div')`
  width: ${space(1)};
  border-top: 1px solid ${p => p.theme.textColor};
`;

/**
 * The DropdownLink component is styled directly with less and the way the
 * elements are laid out within means we can't apply any styles directly
 * using emotion. Instead, we wrap it all inside a span and indirectly
 * style it here.
 */
export const DropdownContainer = styled('span')`
  .dropdown-menu {
    padding: 0;
  }
`;

export const DropdownMenuHeader = styled(MenuHeader)<{first?: boolean}>`
  background: ${p => p.theme.backgroundSecondary};
  ${p => p.first && 'border-radius: 2px'};
  ${p => !p.first && `border-top: 1px solid ${p.theme.innerBorder};`}
  border-bottom: none;
  padding: ${space(0.5)} ${space(1)};
`;

const StyledMenuItem = styled(MenuItem)<{width: 'small' | 'large'}>`
  border-top: 1px solid ${p => p.theme.innerBorder};
  width: ${p => (p.width === 'large' ? '350px' : '200px')};
`;

const MenuItemContent = styled('div')`
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

type DropdownItemProps = {
  children: React.ReactNode;
  to?: string | LocationDescriptor;
  onSelect?: (eventKey: any) => void;
  width?: 'small' | 'large';
};

export function DropdownItem({
  children,
  onSelect,
  to,
  width = 'large',
}: DropdownItemProps) {
  return (
    <StyledMenuItem to={to} onSelect={onSelect} width={width}>
      <MenuItemContent>{children}</MenuItemContent>
    </StyledMenuItem>
  );
}

export const DropdownItemSubContainer = styled('div')`
  display: flex;
  flex-direction: row;

  > a {
    padding-left: 0 !important;
  }
`;

export const StyledTruncate = styled(Truncate)`
  white-space: nowrap;
`;

export const ErrorNodeContent = styled('div')`
  display: grid;
  grid-template-columns: repeat(2, auto);
  grid-gap: ${space(0.25)};
  align-items: center;
`;

export const ExternalDropdownLink = styled(ExternalLink)`
  display: inherit !important;
  padding: 0 !important;
  color: ${p => p.theme.textColor};
  &:hover {
    color: ${p => p.theme.textColor};
  }
`;

export function SingleEventHoverText({event}: {event: QuickTraceEvent}) {
  return (
    <div>
      <Truncate
        value={event.transaction}
        maxLength={30}
        leftTrim
        trimRegex={/\.|\//g}
        expandable={false}
      />
      <div>
        {getDuration(
          event['transaction.duration'] / 1000,
          event['transaction.duration'] < 1000 ? 0 : 2,
          true
        )}
      </div>
    </div>
  );
}
