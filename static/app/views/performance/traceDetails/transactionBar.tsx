import React from 'react';
import {withTheme} from 'emotion-theming';
import {Location} from 'history';

import Count from 'app/components/count';
import * as DividerHandlerManager from 'app/components/events/interfaces/spans/dividerHandlerManager';
import * as ScrollbarManager from 'app/components/events/interfaces/spans/scrollbarManager';
import ProjectBadge from 'app/components/idBadge/projectBadge';
import Tooltip from 'app/components/tooltip';
import {ROW_HEIGHT} from 'app/components/waterfallTree/constants';
import {Row, RowCell, RowCellContainer} from 'app/components/waterfallTree/row';
import {DurationPill, RowRectangle} from 'app/components/waterfallTree/rowBar';
import {
  DividerLine,
  DividerLineGhostContainer,
} from 'app/components/waterfallTree/rowDivider';
import {
  OperationName,
  RowTitle,
  RowTitleContainer,
} from 'app/components/waterfallTree/rowTitle';
import {
  ConnectorBar,
  StyledIconChevron,
  TOGGLE_BORDER_BOX,
  TreeConnector,
  TreeToggle,
  TreeToggleContainer,
} from 'app/components/waterfallTree/treeConnector';
import {
  getDurationDisplay,
  getHumanDuration,
  toPercent,
} from 'app/components/waterfallTree/utils';
import {Organization} from 'app/types';
import {TraceFullDetailed} from 'app/utils/performance/quickTrace/types';
import Projects from 'app/utils/projects';
import {Theme} from 'app/utils/theme';

import {DividerContainer, ErrorBadge, TransactionBarTitleContent} from './styles';
import TransactionDetail from './transactionDetail';
import {TraceInfo, TraceRoot, TreeDepth} from './types';
import {isTraceFullDetailed} from './utils';

const MARGIN_LEFT = 0;

type Props = {
  location: Location;
  organization: Organization;
  index: number;
  transaction: TraceRoot | TraceFullDetailed;
  traceInfo: TraceInfo;
  isOrphan: boolean;
  isLast: boolean;
  continuingDepths: TreeDepth[];
  isExpanded: boolean;
  isVisible: boolean;
  toggleExpandedState: () => void;
  theme: Theme;
};

type State = {
  showDetail: boolean;
};

class TransactionBar extends React.Component<Props, State> {
  state: State = {
    showDetail: false,
  };

  toggleDisplayDetail = () => {
    const {transaction} = this.props;
    if (isTraceFullDetailed(transaction)) {
      this.setState(state => ({
        showDetail: !state.showDetail,
      }));
    }
  };

  getCurrentOffset() {
    const {transaction} = this.props;
    const {generation} = transaction;

    return getOffset(generation);
  }

  renderConnector(hasToggle: boolean) {
    const {continuingDepths, isExpanded, isOrphan, isLast, transaction} = this.props;

    const {generation} = transaction;
    const eventId = isTraceFullDetailed(transaction)
      ? transaction.event_id
      : transaction.traceSlug;

    if (generation === 0) {
      if (hasToggle) {
        return (
          <ConnectorBar
            style={{right: '16px', height: '10px', bottom: '-5px', top: 'auto'}}
            orphanBranch={false}
          />
        );
      }
      return null;
    }

    const connectorBars: Array<React.ReactNode> = continuingDepths.map(
      ({depth, isOrphanDepth}) => {
        if (generation - depth <= 1) {
          // If the difference is less than or equal to 1, then it means that the continued
          // bar is from its direct parent. In this case, do not render a connector bar
          // because the tree connector below will suffice.
          return null;
        }

        const left = -1 * getOffset(generation - depth - 1) - 1;

        return (
          <ConnectorBar
            style={{left}}
            key={`${eventId}-${depth}`}
            orphanBranch={isOrphanDepth}
          />
        );
      }
    );

    if (hasToggle && isExpanded) {
      connectorBars.push(
        <ConnectorBar
          style={{
            right: '16px',
            height: '10px',
            bottom: isLast ? `-${ROW_HEIGHT / 2}px` : '0',
            top: 'auto',
          }}
          key={`${eventId}-last`}
          orphanBranch={false}
        />
      );
    }

    return (
      <TreeConnector isLast={isLast} hasToggler={hasToggle} orphanBranch={isOrphan}>
        {connectorBars}
      </TreeConnector>
    );
  }

  renderToggle() {
    const {isExpanded, transaction, toggleExpandedState} = this.props;
    const {children, generation} = transaction;
    const left = this.getCurrentOffset();

    if (children.length <= 0) {
      return (
        <TreeToggleContainer style={{left: `${left}px`}}>
          {this.renderConnector(false)}
        </TreeToggleContainer>
      );
    }

    const isRoot = generation === 0;

    return (
      <TreeToggleContainer style={{left: `${left}px`}} hasToggler>
        {this.renderConnector(true)}
        <TreeToggle
          disabled={isRoot}
          isExpanded={isExpanded}
          onClick={event => {
            event.stopPropagation();

            if (isRoot) {
              return;
            }

            toggleExpandedState();
          }}
        >
          <Count value={children.length} />
          {!isRoot && (
            <div>
              <StyledIconChevron direction={isExpanded ? 'up' : 'down'} />
            </div>
          )}
        </TreeToggle>
      </TreeToggleContainer>
    );
  }

  renderTitle(
    scrollbarManagerChildrenProps: ScrollbarManager.ScrollbarManagerChildrenProps
  ) {
    const {generateContentSpanBarRef} = scrollbarManagerChildrenProps;
    const {organization, transaction} = this.props;
    const left = this.getCurrentOffset();

    const content = isTraceFullDetailed(transaction) ? (
      <React.Fragment>
        <Projects orgId={organization.slug} slugs={[transaction.project_slug]}>
          {({projects}) => {
            const project = projects.find(p => p.slug === transaction.project_slug);
            return (
              <Tooltip title={transaction.project_slug}>
                <ProjectBadge
                  project={project ? project : {slug: transaction.project_slug}}
                  avatarSize={16}
                  hideName
                />
              </Tooltip>
            );
          }}
        </Projects>
        <TransactionBarTitleContent>
          <strong>
            <OperationName spanErrors={transaction.errors}>
              {transaction['transaction.op']}
            </OperationName>
            {' \u2014 '}
          </strong>
          {transaction.transaction}
        </TransactionBarTitleContent>
      </React.Fragment>
    ) : (
      <TransactionBarTitleContent>
        <strong>
          <OperationName spanErrors={[]}>Trace</OperationName>
          {' \u2014 '}
        </strong>
        {transaction.traceSlug}
      </TransactionBarTitleContent>
    );

    return (
      <RowTitleContainer ref={generateContentSpanBarRef()}>
        {this.renderToggle()}
        <RowTitle
          style={{
            left: `${left}px`,
            width: '100%',
          }}
        >
          {content}
        </RowTitle>
      </RowTitleContainer>
    );
  }

  renderDivider(
    dividerHandlerChildrenProps: DividerHandlerManager.DividerHandlerManagerChildrenProps
  ) {
    if (this.state.showDetail) {
      // Mock component to preserve layout spacing
      return (
        <DividerLine
          showDetail
          style={{
            position: 'absolute',
          }}
        />
      );
    }

    const {addDividerLineRef} = dividerHandlerChildrenProps;

    return (
      <DividerLine
        ref={addDividerLineRef()}
        style={{
          position: 'absolute',
        }}
        onMouseEnter={() => {
          dividerHandlerChildrenProps.setHover(true);
        }}
        onMouseLeave={() => {
          dividerHandlerChildrenProps.setHover(false);
        }}
        onMouseOver={() => {
          dividerHandlerChildrenProps.setHover(true);
        }}
        onMouseDown={dividerHandlerChildrenProps.onDragStart}
        onClick={event => {
          // we prevent the propagation of the clicks from this component to prevent
          // the span detail from being opened.
          event.stopPropagation();
        }}
      />
    );
  }

  renderGhostDivider(
    dividerHandlerChildrenProps: DividerHandlerManager.DividerHandlerManagerChildrenProps
  ) {
    const {dividerPosition, addGhostDividerLineRef} = dividerHandlerChildrenProps;

    return (
      <DividerLineGhostContainer
        style={{
          width: `calc(${toPercent(dividerPosition)} + 0.5px)`,
          display: 'none',
        }}
      >
        <DividerLine
          ref={addGhostDividerLineRef()}
          style={{
            right: 0,
          }}
          className="hovering"
          onClick={event => {
            // the ghost divider line should not be interactive.
            // we prevent the propagation of the clicks from this component to prevent
            // the span detail from being opened.
            event.stopPropagation();
          }}
        />
      </DividerLineGhostContainer>
    );
  }

  renderErrorBadge() {
    const {transaction} = this.props;
    const {showDetail} = this.state;

    if (!isTraceFullDetailed(transaction) || !transaction.errors.length) {
      return null;
    }

    return <ErrorBadge showDetail={showDetail} />;
  }

  renderRectangle() {
    const {transaction, traceInfo, theme} = this.props;
    const {showDetail} = this.state;

    const palette = theme.charts.getColorPalette(traceInfo.maxGeneration);

    // Use 1 as the difference in the event that startTimestamp === endTimestamp
    const delta = Math.abs(traceInfo.endTimestamp - traceInfo.startTimestamp) || 1;
    const startPosition = Math.abs(
      transaction.start_timestamp - traceInfo.startTimestamp
    );
    const startPercentage = startPosition / delta;
    const duration = Math.abs(transaction.timestamp - transaction.start_timestamp);
    const widthPercentage = duration / delta;

    return (
      <RowRectangle
        spanBarHatch={false}
        style={{
          backgroundColor: palette[transaction.generation % palette.length],
          left: `clamp(0%, ${toPercent(startPercentage || 0)}, calc(100% - 1px))`,
          width: toPercent(widthPercentage || 0),
        }}
      >
        <DurationPill
          durationDisplay={getDurationDisplay({
            left: startPercentage,
            width: widthPercentage,
          })}
          showDetail={showDetail}
          spanBarHatch={false}
        >
          {getHumanDuration(duration)}
        </DurationPill>
      </RowRectangle>
    );
  }

  renderHeader({
    dividerHandlerChildrenProps,
    scrollbarManagerChildrenProps,
  }: {
    dividerHandlerChildrenProps: DividerHandlerManager.DividerHandlerManagerChildrenProps;
    scrollbarManagerChildrenProps: ScrollbarManager.ScrollbarManagerChildrenProps;
  }) {
    const {index} = this.props;
    const {showDetail} = this.state;
    const {dividerPosition} = dividerHandlerChildrenProps;

    return (
      <RowCellContainer showDetail={showDetail}>
        <RowCell
          data-test-id="transaction-row-title"
          data-type="span-row-cell"
          style={{
            width: `calc(${toPercent(dividerPosition)} - 0.5px)`,
            paddingTop: 0,
          }}
          showDetail={showDetail}
          onClick={this.toggleDisplayDetail}
        >
          {this.renderTitle(scrollbarManagerChildrenProps)}
        </RowCell>
        <DividerContainer>
          {this.renderDivider(dividerHandlerChildrenProps)}
          {this.renderErrorBadge()}
        </DividerContainer>
        <RowCell
          data-test-id="transaction-row-duration"
          data-type="span-row-cell"
          showStriping={index % 2 !== 0}
          style={{
            width: `calc(${toPercent(1 - dividerPosition)} - 0.5px)`,
            paddingTop: 0,
          }}
          showDetail={showDetail}
          onClick={this.toggleDisplayDetail}
        >
          {this.renderRectangle()}
        </RowCell>
        {!showDetail && this.renderGhostDivider(dividerHandlerChildrenProps)}
      </RowCellContainer>
    );
  }

  render() {
    const {location, organization, isVisible, transaction} = this.props;
    const {showDetail} = this.state;

    return (
      <Row
        visible={isVisible}
        showBorder={showDetail}
        cursor={isTraceFullDetailed(transaction) ? 'pointer' : 'default'}
      >
        <ScrollbarManager.Consumer>
          {scrollbarManagerChildrenProps => {
            return (
              <DividerHandlerManager.Consumer>
                {dividerHandlerChildrenProps =>
                  this.renderHeader({
                    dividerHandlerChildrenProps,
                    scrollbarManagerChildrenProps,
                  })
                }
              </DividerHandlerManager.Consumer>
            );
          }}
        </ScrollbarManager.Consumer>
        {isTraceFullDetailed(transaction) && isVisible && showDetail && (
          <TransactionDetail
            location={location}
            organization={organization}
            transaction={transaction}
          />
        )}
      </Row>
    );
  }
}

function getOffset(generation) {
  return generation * (TOGGLE_BORDER_BOX / 2) + MARGIN_LEFT;
}

export default withTheme(TransactionBar);
