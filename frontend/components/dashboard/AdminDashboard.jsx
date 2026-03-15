'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  CheckSquare,
  Settings,
  Shield,
  TrendingUp,
  ArrowRight,
  Activity,
  Database,
  Server,
  Cpu,
  Memory,
  HardDrive
} from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/axios';
import { CardSkeleton, TableSkeleton } from '@/components/shared/Skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
    fetchAuditLogs();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const response = await api.get('/admin/system-stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/audit?limit=5');
      setAuditLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock system metrics
  const systemMetrics = [
    { name: 'CPU', value: 45, color: '#3b82f6' },
    { name: 'Memory', value: 62, color: '#10b981' },
    { name: 'Storage', value: 78, color: '#f59e0b' },
  ];

  // Mock user growth data
  const userGrowth = [
    { month: 'Jan', users: 45 },
    { month: 'Feb', users: 52 },
    { month: 'Mar', users: 61 },
    { month: 'Apr', users: 75 },
    { month: 'May', users: 89 },
    { month: 'Jun', users: 102 },
  ];

  const getActionColor = (action) => {
    if (action?.includes('delete') || action?.includes('remove')) return 'bg-red-500/20 text-red-400';
    if (action?.includes('create') || action?.includes('add')) return 'bg-green-500/20 text-green-400';
    if (action?.includes('update') || action?.includes('edit')) return 'bg-blue-500/20 text-blue-400';
    return 'bg-slate-500/20 text-muted-foreground';
  };

  const quickActions = [
    { label: 'Manage Users', icon: Users, href: '/admin/users', color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Prompt Templates', icon: Settings, href: '/admin/prompts', color: 'bg-green-500/20 text-green-400' },
    { label: 'System Stats', icon: Database, href: '/admin/system', color: 'bg-purple-500/20 text-purple-400' },
    { label: 'Audit Logs', icon: Shield, href: '/audit', color: 'bg-yellow-500/20 text-yellow-400' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats?.users || 0}</div>
            <p className="text-sm text-muted-foreground">
              {stats?.activeUsers || 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats?.totalMeetings || 0}</div>
            <p className="text-sm text-muted-foreground">
              {stats?.processingMeetings || 0} processing
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats?.totalTasks || 0}</div>
            <p className="text-sm text-muted-foreground">Across all teams</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats?.adminUsers || 0}</div>
            <p className="text-sm text-muted-foreground">
              {stats?.newUsersThisMonth || 0} new this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <Card className="bg-card border-muted lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="bg-card border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemMetrics.map((metric) => (
                <div key={metric.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">{metric.name}</span>
                    <span className="text-sm font-medium text-foreground">{metric.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${metric.value}%`, backgroundColor: metric.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="bg-card border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="ghost"
                  className="h-auto flex flex-col items-center gap-2 p-4 hover:bg-muted"
                  onClick={() => router.push(action.href)}
                >
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card className="bg-card border-muted lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recent Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent audit logs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {log.user?.firstName} {log.user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{log.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                      </p>
                      <Badge className={log.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full mt-4 text-muted-foreground hover:text-foreground"
              onClick={() => router.push('/audit')}
            >
              View All Logs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
