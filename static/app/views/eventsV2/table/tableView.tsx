import React from 'react';
import {browserHistory} from 'react-router';
import styled from '@emotion/styled';
import * as Sentry from '@sentry/react';
import {Location, LocationDescriptorObject} from 'history';

import {openModal} from 'app/actionCreators/modal';
import GridEditable, {
  COL_WIDTH_MINIMUM,
  COL_WIDTH_UNDEFINED,
} from 'app/components/gridEditable';
import SortLink from 'app/components/gridEditable/sortLink';
import Link from 'app/components/links/link';
import Tooltip from 'app/components/tooltip';
import {IconStack} from 'app/icons';
import {t} from 'app/locale';
import {Organization, Project} from 'app/types';
import {defined} from 'app/utils';
import {trackAnalyticsEvent} from 'app/utils/analytics';
import {TableData, TableDataRow} from 'app/utils/discover/discoverQuery';
import EventView, {
  isFieldSortable,
  pickRelevantLocationQueryStrings,
} from 'app/utils/discover/eventView';
import {getFieldRenderer} from 'app/utils/discover/fieldRenderers';
import {Column, fieldAlignment, getAggregateAlias} from 'app/utils/discover/fields';
import {DisplayModes, TOP_N} from 'app/utils/discover/types';
import {eventDetailsRouteWithEventView, generateEventSlug} from 'app/utils/discover/urls';
import {getDuration} from 'app/utils/formatters';
import {stringifyQueryObject, tokenizeSearch} from 'app/utils/tokenizeSearch';
import withProjects from 'app/utils/withProjects';
import {getTraceDetailsUrl} from 'app/views/performance/traceDetails/utils';
import {transactionSummaryRouteWithQuery} from 'app/views/performance/transactionSummary/utils';

import {getExpandedResults, pushEventViewToLocation} from '../utils';

import CellAction, {Actions, updateQuery} from './cellAction';
import ColumnEditModal, {modalCss} from './columnEditModal';
import TableActions from './tableActions';
import {TableColumn} from './types';

export type TableViewProps = {
  location: Location;
  organization: Organization;
  projects: Project[];

  isLoading: boolean;
  error: string | null;

  isFirstPage: boolean;
  eventView: EventView;
  tableData: TableData | null | undefined;
  tagKeys: null | string[];
  measurementKeys: null | string[];
  spanOperationBreakdownKeys?: string[];
  title: string;

  onChangeShowTags: () => void;
  showTags: boolean;
};

/**
 * The `TableView` is marked with leading _ in its method names. It consumes
 * the EventView object given in its props to generate new EventView objects
 * for actions like resizing column.

 * The entire state of the table view (or event view) is co-located within
 * the EventView object. This object is fed from the props.
 *
 * Attempting to modify the state, and therefore, modifying the given EventView
 * object given from its props, will generate new instances of EventView objects.
 *
 * In most cases, the new EventView object differs from the previous EventView
 * object. The new EventView object is pushed to the location object.
 */
class TableView extends React.Component<TableViewProps> {
  /**
   * Updates a column on resizing
   */
  _resizeColumn = (columnIndex: number, nextColumn: TableColumn<keyof TableDataRow>) => {
    const {location, eventView} = this.props;

    const newWidth = nextColumn.width ? Number(nextColumn.width) : COL_WIDTH_UNDEFINED;
    const nextEventView = eventView.withResizedColumn(columnIndex, newWidth);

    pushEventViewToLocation({
      location,
      nextEventView,
      extraQuery: pickRelevantLocationQueryStrings(location),
    });
  };

  _renderPrependColumns = (
    isHeader: boolean,
    dataRow?: any,
    rowIndex?: number
  ): React.ReactNode[] => {
    const {organization, eventView, tableData, location} = this.props;
    const hasAggregates = eventView.hasAggregateField();
    const hasIdField = eventView.hasIdField();

    if (isHeader) {
      if (hasAggregates) {
        return [
          <PrependHeader key="header-icon">
            <IconStack size="sm" />
          </PrependHeader>,
        ];
      } else if (!hasIdField) {
        return [
          <PrependHeader key="header-event-id">
            <SortLink
              align="left"
              title={t('event id')}
              direction={undefined}
              canSort={false}
              generateSortLink={() => undefined}
            />
          </PrependHeader>,
        ];
      } else {
        return [];
      }
    }

    if (hasAggregates) {
      const nextView = getExpandedResults(eventView, {}, dataRow);

      const target = {
        pathname: location.pathname,
        query: nextView.generateQueryStringObject(),
      };

      return [
        <Tooltip key={`eventlink${rowIndex}`} title={t('Open Group')}>
          <Link
            to={target}
            data-test-id="open-group"
            onClick={() => {
              if (nextView.isEqualTo(eventView)) {
                Sentry.captureException(new Error('Failed to drilldown'));
              }
            }}
          >
            <StyledIcon size="sm" />
          </Link>
        </Tooltip>,
      ];
    } else if (!hasIdField) {
      let value = dataRow.id;

      if (tableData && tableData.meta) {
        const fieldRenderer = getFieldRenderer('id', tableData.meta);
        value = fieldRenderer(dataRow, {organization, location});
      }

      const eventSlug = generateEventSlug(dataRow);

      const target = eventDetailsRouteWithEventView({
        orgSlug: organization.slug,
        eventSlug,
        eventView,
      });

      return [
        <Tooltip key={`eventlink${rowIndex}`} title={t('View Event')}>
          <StyledLink data-test-id="view-event" to={target}>
            {value}
          </StyledLink>
        </Tooltip>,
      ];
    } else {
      return [];
    }
  };

  _renderGridHeaderCell = (column: TableColumn<keyof TableDataRow>): React.ReactNode => {
    const {eventView, location, tableData} = this.props;
    const tableMeta = tableData?.meta;

    const align = fieldAlignment(column.name, column.type, tableMeta);
    const field = {field: column.name, width: column.width};
    function generateSortLink(): LocationDescriptorObject | undefined {
      if (!tableMeta) {
        return undefined;
      }

      const nextEventView = eventView.sortOnField(field, tableMeta);
      const queryStringObject = nextEventView.generateQueryStringObject();

      return {
        ...location,
        query: queryStringObject,
      };
    }
    const currentSort = eventView.sortForField(field, tableMeta);
    const canSort = isFieldSortable(field, tableMeta);

    return (
      <SortLink
        align={align}
        title={column.name}
        direction={currentSort ? currentSort.kind : undefined}
        canSort={canSort}
        generateSortLink={generateSortLink}
      />
    );
  };

  _renderGridBodyCell = (
    column: TableColumn<keyof TableDataRow>,
    dataRow: TableDataRow,
    rowIndex: number,
    columnIndex: number
  ): React.ReactNode => {
    const {isFirstPage, eventView, location, organization, tableData} = this.props;

    if (!tableData || !tableData.meta) {
      return dataRow[column.key];
    }

    const columnKey = String(column.key);
    const fieldRenderer = getFieldRenderer(columnKey, tableData.meta);

    const display = eventView.getDisplayMode();
    const isTopEvents =
      display === DisplayModes.TOP5 || display === DisplayModes.DAILYTOP5;

    const count = Math.min(tableData?.data?.length ?? TOP_N, TOP_N);

    let cell = fieldRenderer(dataRow, {organization, location});

    if (columnKey === 'id') {
      const eventSlug = generateEventSlug(dataRow);

      const target = eventDetailsRouteWithEventView({
        orgSlug: organization.slug,
        eventSlug,
        eventView,
      });

      cell = (
        <Tooltip title={t('View Event')}>
          <StyledLink data-test-id="view-event" to={target}>
            {cell}
          </StyledLink>
        </Tooltip>
      );
    } else if (columnKey === 'trace') {
      const dateSelection = eventView.normalizeDateSelection(location);
      if (dataRow.trace) {
        const target = getTraceDetailsUrl(
          organization,
          String(dataRow.trace),
          dateSelection,
          {}
        );

        cell = (
          <Tooltip title={t('View Trace')}>
            <StyledLink data-test-id="view-trace" to={target}>
              {cell}
            </StyledLink>
          </Tooltip>
        );
      }
    }

    const fieldName = getAggregateAlias(columnKey);
    const value = dataRow[fieldName];
    if (tableData.meta[fieldName] === 'integer' && defined(value) && value > 999) {
      return (
        <Tooltip
          title={value.toLocaleString()}
          containerDisplayMode="block"
          position="right"
        >
          <CellAction
            column={column}
            dataRow={dataRow}
            handleCellAction={this.handleCellAction(dataRow, column)}
          >
            {cell}
          </CellAction>
        </Tooltip>
      );
    }

    return (
      <React.Fragment>
        {isFirstPage && isTopEvents && rowIndex < TOP_N && columnIndex === 0 ? (
          <TopResultsIndicator count={count} index={rowIndex} />
        ) : null}
        <CellAction
          column={column}
          dataRow={dataRow}
          handleCellAction={this.handleCellAction(dataRow, column)}
        >
          {cell}
        </CellAction>
      </React.Fragment>
    );
  };

  handleEditColumns = () => {
    const {
      organization,
      eventView,
      tagKeys,
      measurementKeys,
      spanOperationBreakdownKeys,
    } = this.props;

    const hasBreakdownFeature = organization.features.includes(
      'performance-ops-breakdown'
    );

    openModal(
      modalProps => (
        <ColumnEditModal
          {...modalProps}
          organization={organization}
          tagKeys={tagKeys}
          measurementKeys={measurementKeys}
          spanOperationBreakdownKeys={
            hasBreakdownFeature ? spanOperationBreakdownKeys : undefined
          }
          columns={eventView.getColumns().map(col => col.column)}
          onApply={this.handleUpdateColumns}
        />
      ),
      {modalCss, backdrop: 'static'}
    );
  };

  handleCellAction = (dataRow: TableDataRow, column: TableColumn<keyof TableDataRow>) => {
    return (action: Actions, value: React.ReactText) => {
      const {eventView, organization, projects} = this.props;

      const query = tokenizeSearch(eventView.query);

      let nextView = eventView.clone();

      trackAnalyticsEvent({
        eventKey: 'discover_v2.results.cellaction',
        eventName: 'Discoverv2: Cell Action Clicked',
        organization_id: parseInt(organization.id, 10),
        action,
      });

      switch (action) {
        case Actions.TRANSACTION: {
          const maybeProject = projects.find(project => project.slug === dataRow.project);

          const projectID = maybeProject ? [maybeProject.id] : undefined;

          const next = transactionSummaryRouteWithQuery({
            orgSlug: organization.slug,
            transaction: String(value),
            projectID,
            query: nextView.getGlobalSelectionQuery(),
          });

          browserHistory.push(next);
          return;
        }
        case Actions.RELEASE: {
          const maybeProject = projects.find(project => {
            return project.slug === dataRow.project;
          });

          browserHistory.push({
            pathname: `/organizations/${organization.slug}/releases/${encodeURIComponent(
              value
            )}/`,
            query: {
              ...nextView.getGlobalSelectionQuery(),

              project: maybeProject ? maybeProject.id : undefined,
            },
          });

          return;
        }
        case Actions.DRILLDOWN: {
          // count_unique(column) drilldown

          trackAnalyticsEvent({
            eventKey: 'discover_v2.results.drilldown',
            eventName: 'Discoverv2: Click aggregate drilldown',
            organization_id: parseInt(organization.id, 10),
          });

          // Drilldown into each distinct value and get a count() for each value.
          nextView = getExpandedResults(nextView, {}, dataRow).withNewColumn({
            kind: 'function',
            function: ['count', '', undefined],
          });

          browserHistory.push(nextView.getResultsViewUrlTarget(organization.slug));

          return;
        }
        default: {
          updateQuery(query, action, column, value);
        }
      }
      nextView.query = stringifyQueryObject(query);

      browserHistory.push(nextView.getResultsViewUrlTarget(organization.slug));
    };
  };

  handleUpdateColumns = (columns: Column[]): void => {
    const {organization, eventView} = this.props;

    // metrics
    trackAnalyticsEvent({
      eventKey: 'discover_v2.update_columns',
      eventName: 'Discoverv2: Update columns',
      organization_id: parseInt(organization.id, 10),
    });

    const nextView = eventView.withColumns(columns);
    browserHistory.push(nextView.getResultsViewUrlTarget(organization.slug));
  };

  renderHeaderButtons = () => {
    const {
      organization,
      title,
      eventView,
      isLoading,
      tableData,
      location,
      onChangeShowTags,
      showTags,
    } = this.props;

    return (
      <TableActions
        title={title}
        isLoading={isLoading}
        organization={organization}
        eventView={eventView}
        onEdit={this.handleEditColumns}
        tableData={tableData}
        location={location}
        onChangeShowTags={onChangeShowTags}
        showTags={showTags}
      />
    );
  };

  render() {
    const {isLoading, error, location, tableData, eventView} = this.props;

    const columnOrder = eventView.getColumns();
    const columnSortBy = eventView.getSorts();

    const prependColumnWidths = eventView.hasAggregateField()
      ? ['40px']
      : eventView.hasIdField()
      ? []
      : [`minmax(${COL_WIDTH_MINIMUM}px, max-content)`];

    return (
      <GridEditable
        isLoading={isLoading}
        error={error}
        data={tableData ? tableData.data : []}
        columnOrder={columnOrder}
        columnSortBy={columnSortBy}
        title={t('Results')}
        grid={{
          renderHeadCell: this._renderGridHeaderCell as any,
          renderBodyCell: this._renderGridBodyCell as any,
          onResizeColumn: this._resizeColumn as any,
          renderPrependColumns: this._renderPrependColumns as any,
          prependColumnWidths,
        }}
        headerButtons={this.renderHeaderButtons}
        location={location}
      />
    );
  }
}

const PrependHeader = styled('span')`
  color: ${p => p.theme.subText};
`;

const StyledLink = styled(Link)`
  > div {
    display: inline;
  }
`;

const StyledIcon = styled(IconStack)`
  vertical-align: middle;
`;

type TopResultsIndicatorProps = {
  count: number;
  index: number;
};

const TopResultsIndicator = styled('div')<TopResultsIndicatorProps>`
  position: absolute;
  left: -1px;
  margin-top: 4.5px;
  width: 9px;
  height: 15px;
  border-radius: 0 3px 3px 0;

  background-color: ${p => {
    // this background color needs to match the colors used in
    // app/components/charts/eventsChart so that the ordering matches

    // the color pallete contains n + 2 colors, so we subtract 2 here
    return p.theme.charts.getColorPalette(p.count - 2)[p.index];
  }};
`;

export default withProjects(TableView);
