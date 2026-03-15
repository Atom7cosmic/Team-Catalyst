'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  Users,
  Mic,
  FileText,
  CheckSquare,
  ArrowLeft,
  Download,
  Plus,
  ExternalLink,
  Loader2,
  AlertCircle,
  StopCircle
} from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/axios';
import { CardSkeleton, ListSkeleton } from '@/components/shared/Skeleton';
import AttendeeContributionCard from '@/components/meeting/AttendeeContributionCard';
import ProcessingStepIndicator from '@/components/meeting/ProcessingStepIndicator';
import MeetingQAPanel from '@/components/meeting/MeetingQAPanel';
import SimilarMeetingsPanel from '@/components/meeting/SimilarMeetingsPanel';
import toast from 'react-hot-toast';

export default function MeetingDetailPage({ params }) {
  const router = useRouter();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);

  useEffect(() => {
    fetchMeeting();
    if (meeting?.status === 'processing') {
      const interval = setInterval(fetchProcessingStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [params?.id]);

  const fetchMeeting = async () => {
    if (!params?.id) return;
    try {
      const response = await api.get(`/meetings/${params.id}`);
      setMeeting(response.data.meeting);
      if (response.data.meeting?.status === 'processing') {
        fetchProcessingStatus();
      }
    } catch (error) {
      console.error('Failed to fetch meeting:', error);
      toast.error('Failed to fetch meeting details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProcessingStatus = async () => {
    try {
      const response = await api.get(`/meetings/${params.id}/processing-status`);
      setProcessingStatus(response.data);
      if (response.data.status === 'ready') {
        fetchMeeting();
      }
    } catch (error) {
      console.error('Failed to fetch processing status:', error);
    }
  };

  const handleEndMeeting = async () => {
    if (!confirm('Are you sure you want to end this meeting?')) return;
    setIsEnding(true);
    try {
      await api.post(`/meetings/${params.id}/end`);
      toast.success('Meeting ended successfully');
      fetchMeeting();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to end meeting';
      toast.error(msg);
      console.error('End meeting error:', error);
    } finally {
      setIsEnding(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'bg-green-500/20 text-green-400';
      case 'processing': return 'bg-yellow-500/20 text-yellow-400';
      case 'scheduled': return 'bg-blue-500/20 text-blue-400';
      case 'live': return 'bg-red-500/20 text-red-400';
      case 'completed': return 'bg-slate-500/20 text-muted-foreground';
      default: return 'bg-slate-500/20 text-muted-foreground';
    }
  };

  const getDomainColor = (domain) => {
    const colors = {
      'Sprint Planning': 'bg-blue-500/20 text-blue-400',
      'Performance Review': 'bg-green-500/20 text-green-400',
      'Architecture Discussion': 'bg-purple-500/20 text-purple-400',
      '1:1': 'bg-yellow-500/20 text-yellow-400',
      'All-Hands': 'bg-red-500/20 text-red-400',
      'Custom': 'bg-slate-500/20 text-muted-foreground'
    };
    return colors[domain] || colors['Custom'];
  };

  // Proper host check — compare string versions to avoid ObjectId mismatch
  const hostId = meeting?.host?._id?.toString() || meeting?.host?.toString();
  const userId = user?._id?.toString() || user?.id?.toString();
  const isHost = !!(hostId && userId && hostId === userId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/meetings/history')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardSkeleton className="flex-1" />
          </div>
          <CardSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (!meeting) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-500" />
          <p className="text-muted-foreground">Meeting not found</p>
          <Button className="mt-4" onClick={() => router.push('/meetings/history')}>
            Back to Meetings
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isProcessing = meeting.status === 'processing';
  const isReady = meeting.status === 'ready' || meeting.status === 'completed';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/meetings/history')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{meeting.name}</h1>
                <Badge className={getStatusColor(meeting.status)}>
                  {meeting.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">{meeting.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isReady && (
              <Button variant="outline" onClick={() => toast.success('Export started')} className="border-slate-700">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
            {meeting.status === 'scheduled' && (
              <Button onClick={() => router.push(`/meetings/${meeting._id}/room`)} className="bg-green-600 hover:bg-green-700">
                <Mic className="mr-2 h-4 w-4" />
                Join Meeting
              </Button>
            )}
            {meeting.status === 'live' && (
              <Button onClick={() => router.push(`/meetings/${meeting._id}/room`)} className="bg-green-600 hover:bg-green-700">
                <Mic className="mr-2 h-4 w-4" />
                Rejoin Meeting
              </Button>
            )}
            {(meeting.status === 'live' || meeting.status === 'scheduled') && isHost && (
              <Button
                onClick={handleEndMeeting}
                disabled={isEnding}
                className="bg-red-600 hover:bg-red-700"
              >
                {isEnding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <StopCircle className="mr-2 h-4 w-4" />
                )}
                End Meeting
              </Button>
            )}
            {isReady && (
              <Button onClick={() => router.push(`/meetings/${meeting._id}/schedule-followup`)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Schedule Follow-up
              </Button>
            )}
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && processingStatus && (
          <Card className="bg-card border-muted border-yellow-500/30">
            <CardContent className="py-6">
              <ProcessingStepIndicator
                processingSteps={processingStatus.processingSteps}
                error={processingStatus.error}
              />
            </CardContent>
          </Card>
        )}

        {/* Meeting Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-muted">
            <CardContent className="flex items-center gap-3 py-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-slate-500">Date</p>
                <p className="font-medium">{format(new Date(meeting.scheduledDate), 'MMM d, yyyy')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-muted">
            <CardContent className="flex items-center gap-3 py-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-slate-500">Duration</p>
                <p className="font-medium">{meeting.actualDuration || meeting.estimatedDuration} min</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-muted">
            <CardContent className="flex items-center gap-3 py-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-slate-500">Attendees</p>
                <p className="font-medium">{meeting.attendees?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-muted">
            <CardContent className="flex items-center gap-3 py-4">
              <Mic className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-slate-500">Type</p>
                <Badge className={getDomainColor(meeting.domain)}>{meeting.domain}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="summary" className="space-y-4">
              <TabsList className="bg-card border border-muted">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="attendees">Attendees</TabsTrigger>
                <TabsTrigger value="action-items">Action Items</TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                <Card className="bg-card border-muted">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Meeting Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {meeting.summary ? (
                      <>
                        <p className="text-slate-300">{meeting.summary}</p>
                        {meeting.conclusions?.length > 0 && (
                          <div>
                            <p className="font-medium mb-2">Key Conclusions:</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              {meeting.conclusions.map((conclusion, i) => (
                                <li key={i}>{conclusion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {meeting.decisions?.length > 0 && (
                          <div>
                            <p className="font-medium mb-2">Decisions:</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              {meeting.decisions.map((decision, i) => (
                                <li key={i}>{decision}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500">
                        {isProcessing ? 'Summary will be available after processing...' : 'No summary available'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transcript">
                <Card className="bg-card border-muted">
                  <CardHeader>
                    <CardTitle>Transcript</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {meeting.transcriptSegments?.length > 0 ? (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {meeting.transcriptSegments.map((segment, i) => (
                            <div key={i} className="p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-blue-400">{segment.speaker}</span>
                                <span className="text-xs text-slate-500">
                                  {Math.floor(segment.startTime / 60)}:{(segment.startTime % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                              <p className="text-slate-300">{segment.text}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-slate-500">
                        {isProcessing ? 'Transcript will be available after processing...' : 'No transcript available'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attendees">
                <Card className="bg-card border-muted">
                  <CardHeader>
                    <CardTitle>Attendees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {meeting.attendees?.map((attendee) => (
                        <AttendeeContributionCard
                          key={attendee.user?._id || attendee._id}
                          attendee={attendee}
                          contributions={meeting.attendeeContributions}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="action-items">
                <Card className="bg-card border-muted">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5" />
                      Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {meeting.actionItems?.length > 0 ? (
                      <div className="space-y-3">
                        {meeting.actionItems.map((item, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="mt-1">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                item.status === 'completed'
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-slate-600'
                              }`}>
                                {item.status === 'completed' && <CheckSquare className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className={item.status === 'completed' ? 'line-through text-slate-500' : ''}>
                                {item.task}
                              </p>
                              {item.owner && (
                                <p className="text-sm text-muted-foreground">
                                  Assigned to: {item.owner.firstName} {item.owner.lastName}
                                </p>
                              )}
                              {item.deadline && (
                                <p className="text-sm text-muted-foreground">
                                  Due: {format(new Date(item.deadline), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                            <Badge className={
                              item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              item.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }>
                              {item.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500">No action items extracted</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <MeetingQAPanel meetingId={meeting._id} meetingName={meeting.name} />
            <SimilarMeetingsPanel meetingId={meeting._id} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}