import React from 'react';
import styled from '@emotion/styled';
import * as Sentry from '@sentry/react';

import AsyncComponent from 'app/components/asyncComponent';
import ErrorPanel from 'app/components/charts/errorPanel';
import {DateTimeObject} from 'app/components/charts/utils';
import {Alignments} from 'app/components/gridEditable/sortLink';
import LoadingIndicator from 'app/components/loadingIndicator';
import {Panel, PanelBody} from 'app/components/panels';
import {DEFAULT_STATS_PERIOD} from 'app/constants';
import {IconArrow, IconWarning} from 'app/icons';
import {t} from 'app/locale';
import space from 'app/styles/space';
import {DataCategory, Organization, Project} from 'app/types';
import withProjects from 'app/utils/withProjects';

import {UsageSeries} from './types';
import UsageTable, {CellProject, CellStat, TableStat} from './usageTable';

type Props = {
  organization: Organization;
  projects: Project[];
  dataCategory: DataCategory;
  dataCategoryName: string;
  dataDatetime: DateTimeObject;
  tableSort?: string;
  handleChangeState: (state: {sort?: string}) => void;
} & AsyncComponent['props'];

type State = {
  projectStats: UsageSeries | undefined;
} & AsyncComponent['state'];

export enum SortBy {
  PROJECT = 'project',
  TOTAL = 'total',
  ACCEPTED = 'accepted',
  FILTERED = 'filtered',
  DROPPED = 'dropped',
}

class UsageStatsProjects extends AsyncComponent<Props, State> {
  getEndpoints(): ReturnType<AsyncComponent['getEndpoints']> {
    return [['projectStats', this.endpointPath, {query: this.endpointQuery}]];
  }

  get endpointPath() {
    const {organization} = this.props;
    return `/organizations/${organization.slug}/stats_v2/`;
  }

  get endpointQuery() {
    const {dataDatetime} = this.props;

    // We do not need more granularity in the data so interval is '1d'
    return {
      statsPeriod: dataDatetime?.period || DEFAULT_STATS_PERIOD,
      interval: '1d',
      groupBy: ['category', 'outcome', 'project'],
      field: ['sum(quantity)', 'sum(times_seen)'],
    };
  }

  get tableMetaData() {
    const {projectStats} = this.state;

    return {
      headers: this.tableHeader,
      ...this.mapSeriesToTable(projectStats),
    };
  }

  get tableSort(): {
    key: SortBy;
    direction: number;
  } {
    const {tableSort} = this.props;

    if (!tableSort) {
      return {
        key: SortBy.TOTAL,
        direction: 1,
      };
    }

    let key: string = tableSort;
    let direction: number = -1;

    if (tableSort.charAt(0) === '-') {
      key = key.slice(1);
      direction = 1;
    }

    switch (key) {
      case SortBy.PROJECT:
      case SortBy.TOTAL:
      case SortBy.ACCEPTED:
      case SortBy.FILTERED:
      case SortBy.DROPPED:
        return {key, direction};
      default:
        return {key: SortBy.TOTAL, direction: -1};
    }
  }

  get tableHeader() {
    const {key, direction} = this.tableSort;

    const getArrowDirection = (linkKey: SortBy) => {
      if (linkKey !== key) {
        return undefined;
      }

      return direction > 0 ? 'down' : 'up';
    };

    return [
      {
        key: SortBy.PROJECT,
        title: t('Project'),
        align: 'left',
        direction: getArrowDirection(SortBy.PROJECT),
        onClick: () => this.handleChangeSort(SortBy.PROJECT),
      },
      {
        key: SortBy.TOTAL,
        title: t('Total'),
        align: 'right',
        direction: getArrowDirection(SortBy.TOTAL),
        onClick: () => this.handleChangeSort(SortBy.TOTAL),
      },
      {
        key: SortBy.ACCEPTED,
        title: t('Accepted'),
        align: 'right',
        direction: getArrowDirection(SortBy.ACCEPTED),
        onClick: () => this.handleChangeSort(SortBy.ACCEPTED),
      },
      {
        key: SortBy.FILTERED,
        title: t('Filtered'),
        align: 'right',
        direction: getArrowDirection(SortBy.FILTERED),
        onClick: () => this.handleChangeSort(SortBy.FILTERED),
      },
      {
        key: SortBy.DROPPED,
        title: t('Dropped'),
        align: 'right',
        direction: getArrowDirection(SortBy.DROPPED),
        onClick: () => this.handleChangeSort(SortBy.DROPPED),
      },
    ].map(h => {
      const Cell = h.key === SortBy.PROJECT ? CellProject : CellStat;

      return (
        <Cell key={h.key}>
          <FakeLink align={h.align as Alignments} onClick={h.onClick}>
            {h.title}
            {h.direction && <IconArrow size="xs" direction={h.direction as any} />}
          </FakeLink>
        </Cell>
      );
    });
  }

  get tableLink() {
    const {dataCategory, organization} = this.props;

    if (dataCategory === DataCategory.TRANSACTION) {
      return `/organizations/${organization.slug}/performance/`;
    }

    return `/organizations/${organization.slug}/issues/`;
  }

  handleChangeSort = (nextKey: SortBy) => {
    const {handleChangeState} = this.props;
    const {key, direction} = this.tableSort;

    let nextDirection = 1; // Default to descending

    if (key === nextKey) {
      nextDirection = direction * -1; // Toggle if clicking on the same column
    } else if (nextKey === SortBy.PROJECT) {
      nextDirection = -1; // Default PROJECT to ascending
    }

    handleChangeState({sort: `${nextDirection > 0 ? '-' : ''}${nextKey}`});
  };

  mapSeriesToTable(
    projectStats?: UsageSeries
  ): {
    tableData: TableStat[];
    error?: Error;
  } {
    if (!projectStats) {
      return {tableData: []};
    }

    const stats: Record<number, object> = {};

    try {
      const {dataCategory, projects} = this.props;

      const baseStat: Partial<TableStat> = {
        [SortBy.TOTAL]: 0,
        [SortBy.ACCEPTED]: 0,
        [SortBy.FILTERED]: 0,
        [SortBy.DROPPED]: 0,
      };

      projectStats.groups.forEach(group => {
        const {outcome, category, project} = group.by;
        if (category !== dataCategory) {
          return;
        }

        if (!stats[project]) {
          stats[project] = {...baseStat};
        }

        const s = this.mapTotalsToStats(dataCategory, group.totals);
        stats[project][outcome] += s;
        stats[project].total += s;
      });

      // For projects without stats, fill in with zero
      const tableData: TableStat[] = projects.map(p => {
        const stat = stats[p.id] ?? {...baseStat};
        return {
          project: {...p},
          projectLink: `${this.tableLink}?project=${p.id}`,
          ...stat,
        };
      });

      const {key, direction} = this.tableSort;
      tableData.sort((a, b) => {
        if (key === SortBy.PROJECT) {
          return b.project.slug.localeCompare(a.project.slug) * direction;
        }

        return a[key] !== b[key]
          ? (b[key] - a[key]) * direction
          : a.project.slug.localeCompare(b.project.slug);
      });

      return {tableData};
    } catch (err) {
      Sentry.withScope(scope => {
        scope.setContext('query', this.endpointQuery);
        scope.setContext('body', projectStats);
        Sentry.captureException(err);
      });

      return {
        tableData: [],
        error: err,
      };
    }
  }

  mapTotalsToStats(dataCategory: DataCategory, totals: Record<string, number>) {
    if (
      dataCategory === DataCategory.ATTACHMENT ||
      dataCategory === DataCategory.TRANSACTION
    ) {
      return totals['sum(times_seen)'];
    }

    return totals['sum(quantity)'];
  }

  renderComponent() {
    const {error, loading, projectStats} = this.state;

    if (loading) {
      return (
        <Panel>
          <PanelBody>
            <LoadingIndicator />
          </PanelBody>
        </Panel>
      );
    }

    if (error || !projectStats) {
      return (
        <Panel>
          <PanelBody>
            <ErrorPanel height="256px">
              <IconWarning color="gray300" size="lg" />
            </ErrorPanel>
          </PanelBody>
        </Panel>
      );
    }

    const {dataCategory} = this.props;
    const {headers, tableData} = this.tableMetaData;

    return (
      <UsageTable headers={headers} dataCategory={dataCategory} usageStats={tableData} />
    );
  }
}

export default withProjects(UsageStatsProjects);

const FakeLink = styled('div')<{align: Alignments}>`
  text-align: ${p => p.align || 'left'};

  &:hover {
    cursor: pointer;
  }

  > * {
    margin-left: ${space(0.5)};
  }
`;
