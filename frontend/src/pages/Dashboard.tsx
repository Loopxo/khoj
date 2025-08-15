import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  Activity, Database, Clock, TrendingUp, AlertCircle, CheckCircle, 
  XCircle, Timer, Users, Zap, Globe
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentRuns from '../components/Dashboard/RecentRuns';
import TopScrapers from '../components/Dashboard/TopScrapers';
import { api } from '../lib/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface DashboardStats {
  totalScrapers: number;
  activeScrapers: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  runsToday: number;
  avgExecutionTime: number;
  dataPointsExtracted: number;
  uptime: number;
}

interface RunTrend {
  date: string;
  successful: number;
  failed: number;
}

interface ScraperStatus {
  status: string;
  count: number;
}

export default function Dashboard() {
  const { isConnected, subscribe, unsubscribe } = useSocket();
  const [realTimeStats, setRealTimeStats] = useState<Partial<DashboardStats>>({});

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/analytics/dashboard'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: runTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['run-trends'],
    queryFn: () => api.get<RunTrend[]>('/analytics/runs/trends?days=7'),
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: scraperStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['scraper-status'],
    queryFn: () => api.get<ScraperStatus[]>('/analytics/scrapers/status'),
    refetchInterval: 60000,
  });

  const { data: recentRuns, isLoading: runsLoading } = useQuery({
    queryKey: ['recent-runs'],
    queryFn: () => api.get('/runs?limit=5&sort=createdAt:desc'),
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const { data: topScrapers, isLoading: topScrapersLoading } = useQuery({
    queryKey: ['top-scrapers'],
    queryFn: () => api.get('/analytics/scrapers/top?limit=5'),
    refetchInterval: 60000,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (isConnected) {
      subscribe('global');
      subscribe('dashboard');
    }

    return () => {
      unsubscribe('global');
      unsubscribe('dashboard');
    };
  }, [isConnected, subscribe, unsubscribe]);

  const finalStats = { ...stats, ...realTimeStats } as DashboardStats;
  const successRate = finalStats.totalRuns ? 
    Math.round((finalStats.successfulRuns / finalStats.totalRuns) * 100) : 0;

  if (statsLoading && !finalStats.totalScrapers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your web scraping activities</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Scrapers"
          value={finalStats.totalScrapers || 0}
          icon={<Database className="h-5 w-5" />}
          color="blue"
          change={`${finalStats.activeScrapers || 0} active`}
        />
        <StatsCard
          title="Runs Today"
          value={finalStats.runsToday || 0}
          icon={<Activity className="h-5 w-5" />}
          color="green"
          change={`${successRate}% success rate`}
        />
        <StatsCard
          title="Avg. Execution Time"
          value={`${finalStats.avgExecutionTime || 0}s`}
          icon={<Clock className="h-5 w-5" />}
          color="purple"
        />
        <StatsCard
          title="Data Points"
          value={finalStats.dataPointsExtracted || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          color="orange"
          change="extracted today"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Run Trends Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Run Trends (7 days)</h3>
          {trendsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={runTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="successful" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Successful"
                />
                <Line 
                  type="monotone" 
                  dataKey="failed" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Scraper Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scraper Status</h3>
          {statusLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scraperStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {scraperStatus?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Runs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Runs</h3>
          </div>
          <RecentRuns runs={recentRuns} loading={runsLoading} />
        </div>

        {/* Top Scrapers */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Scrapers</h3>
          </div>
          <TopScrapers scrapers={topScrapers} loading={topScrapersLoading} />
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">API Status</p>
              <p className="font-semibold text-green-600">Operational</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Timer className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="font-semibold">{Math.round((finalStats.uptime || 0) / 3600)}h</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Zap className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Queue</p>
              <p className="font-semibold">0 pending</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">WebSocket</p>
              <p className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}