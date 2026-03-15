'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/axios';

export default function MeetingsHistoryPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchMeetings();
  }, [page]);

  const fetchMeetings = async () => {
    try {
      const response = await api.get(`/meetings?page=${page}&limit=20`);
      setMeetings(response.data.meetings);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMeetings = meetings.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.domain.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500/20 text-green-500';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-500';
      case 'live':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-slate-500/20 text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Meetings</h1>
            <p className="text-muted-foreground">View and manage all your meetings</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/meetings/upload')}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Recording
            </Button>
            <Button onClick={() => router.push('/meetings/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search meetings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredMeetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No meetings found</div>
            ) : (
              <div className="space-y-2">
                {filteredMeetings.map((meeting) => (
                  <div
                    key={meeting._id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => router.push(`/meetings/${meeting._id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{meeting.name}</h3>
                        <Badge className={getStatusColor(meeting.status)}>
                          {meeting.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meeting.scheduledDate), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {meeting.estimatedDuration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {meeting.attendeeCount} attendees
                        </span>
                        <span className="text-slate-500">{meeting.domain}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500" />
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="py-2">Page {page} of {totalPages}</span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
