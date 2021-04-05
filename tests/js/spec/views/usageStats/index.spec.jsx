import React from 'react';

import {mountWithTheme} from 'sentry-test/enzyme';
import {initializeOrg} from 'sentry-test/initializeOrg';

import UsageStats from 'app/views/usageStats';

describe('UsageStats', function () {
  const router = TestStubs.router();
  const {organization, routerContext} = initializeOrg({router});

  const statsUrl = `/organizations/${organization.slug}/stats_v2/`;

  const {mockOrgStats} = getMockResponse();
  let mock;

  beforeEach(() => {
    MockApiClient.clearMockResponses();
    mock = MockApiClient.addMockResponse({
      url: statsUrl,
      body: mockOrgStats,
    });
  });

  it('renders with default state', async function () {
    const wrapper = mountWithTheme(
      <UsageStats organization={organization} />,
      routerContext
    );

    await tick();
    wrapper.update();

    expect(wrapper.text()).toContain('Organization Usage Stats for Errors');

    expect(wrapper.find('UsageChart')).toHaveLength(1);
    expect(wrapper.find('UsageTable')).toHaveLength(1);
    expect(wrapper.find('IconWarning')).toHaveLength(0);

    const orgAsync = wrapper.find('UsageStatsOrganization');
    expect(orgAsync.props().dataCategory).toEqual('error');
    expect(orgAsync.props().dataDatetime).toEqual({period: '14d'});

    // API calls with defaults
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenNthCalledWith(
      1,
      '/organizations/org-slug/stats_v2/',
      expect.objectContaining({
        query: {
          statsPeriod: '14d',
          interval: '1h',
          groupBy: ['category', 'outcome'],
          field: ['sum(quantity)', 'sum(times_seen)'],
        },
      })
    );
    expect(mock).toHaveBeenNthCalledWith(
      2,
      '/organizations/org-slug/stats_v2/',
      expect.objectContaining({
        query: {
          statsPeriod: '14d',
          interval: '1d',
          groupBy: ['category', 'outcome', 'project'],
          field: ['sum(quantity)', 'sum(times_seen)'],
        },
      })
    );
  });

  it('renders with error on organization stats endpoint', async function () {
    MockApiClient.addMockResponse({
      url: statsUrl,
      statusCode: 500,
    });

    const wrapper = mountWithTheme(
      <UsageStats organization={organization} />,
      routerContext
    );

    await tick();
    wrapper.update();

    expect(wrapper.text()).toContain('Organization Usage Stats for Errors');

    expect(wrapper.find('UsageChart')).toHaveLength(0);
    expect(wrapper.find('UsageTable')).toHaveLength(0);
    expect(wrapper.find('IconWarning')).toHaveLength(2);
  });

  it('passes state in router', async function () {
    const wrapper = mountWithTheme(
      <UsageStats
        organization={organization}
        location={{
          query: {
            statsPeriod: '30d',
            dataCategory: 'transaction',
            chartTransform: 'daily',
          },
        }}
      />,
      routerContext
    );

    await tick();
    wrapper.update();

    const orgAsync = wrapper.find('UsageStatsOrganization');
    expect(orgAsync.props().dataCategory).toEqual('transaction');
    expect(orgAsync.props().chartTransform).toEqual('daily');

    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenNthCalledWith(
      1,
      '/organizations/org-slug/stats_v2/',
      expect.objectContaining({
        query: {
          statsPeriod: '30d',
          interval: '4h',
          groupBy: ['category', 'outcome'],
          field: ['sum(quantity)', 'sum(times_seen)'],
        },
      })
    );
    expect(mock).toHaveBeenNthCalledWith(
      2,
      '/organizations/org-slug/stats_v2/',
      expect.objectContaining({
        query: {
          statsPeriod: '30d',
          interval: '1d',
          groupBy: ['category', 'outcome', 'project'],
          field: ['sum(quantity)', 'sum(times_seen)'],
        },
      })
    );
  });
});

function getMockResponse() {
  return {
    mockOrgStats: {
      start: '2021-01-01T00:00:00Z',
      end: '2021-01-07T00:00:00Z',
      intervals: [
        '2021-01-01T00:00:00Z',
        '2021-01-02T00:00:00Z',
        '2021-01-03T00:00:00Z',
        '2021-01-04T00:00:00Z',
        '2021-01-05T00:00:00Z',
        '2021-01-06T00:00:00Z',
        '2021-01-07T00:00:00Z',
      ],
      groups: [
        {
          by: {
            category: 'attachment',
            outcome: 'accepted',
          },
          totals: {
            'sum(times_seen)': 28000,
            'sum(quantity)': 28000,
          },
          series: {
            'sum(times_seen)': [1000, 2000, 3000, 4000, 5000, 6000, 7000],
            'sum(quantity)': [1000, 2000, 3000, 4000, 5000, 6000, 7000],
          },
        },
        {
          by: {
            outcome: 'accepted',
            category: 'transaction',
          },
          totals: {
            'sum(times_seen)': 28,
            'sum(quantity)': 28,
          },
          series: {
            'sum(times_seen)': [1, 2, 3, 4, 5, 6, 7],
            'sum(quantity)': [1, 2, 3, 4, 5, 6, 7],
          },
        },
        {
          by: {
            category: 'error',
            outcome: 'accepted',
          },
          totals: {
            'sum(times_seen)': 28,
            'sum(quantity)': 28,
          },
          series: {
            'sum(times_seen)': [1, 2, 3, 4, 5, 6, 7],
            'sum(quantity)': [1, 2, 3, 4, 5, 6, 7],
          },
        },
      ],
    },
  };
}
