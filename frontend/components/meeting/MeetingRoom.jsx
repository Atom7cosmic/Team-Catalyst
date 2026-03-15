'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SimplePeer from 'simple-peer';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  MessageSquare,
  ScreenShare,
  StopCircle,
  Hand,
  Users,
  PhoneOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getSocket, joinRoom, leaveRoom } from '@/lib/socket';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function MeetingRoom({ meetingId, user }) {
  const router = useRouter();
  const socket = useRef(null);
  const localVideoRef = useRef(null);
  const peersRef = useRef({});
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [meetingStatus, setMeetingStatus] = useState(null);

  // Initialize socket and media
  useEffect(() => {
    const init = async () => {
      try {
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize socket
        socket.current = getSocket();

        // Join room
        joinRoom(meetingId, user._id);

        // Join via API and check host status
        const joinResponse = await api.post(`/meetings/${meetingId}/join`);
        const meeting = joinResponse.data.meeting;
        const hostId = meeting?.host?._id || meeting?.host;
        const isUserHost = hostId?.toString() === user._id?.toString();
        setIsHost(isUserHost);
        setMeetingStatus(meeting?.status);

        // Socket event handlers
        socket.current.on('existing-users', handleExistingUsers);
        socket.current.on('user-connected', handleUserConnected);
        socket.current.on('user-disconnected', handleUserDisconnected);
        socket.current.on('offer', handleOffer);
        socket.current.on('answer', handleAnswer);
        socket.current.on('ice-candidate', handleIceCandidate);
        socket.current.on('chat-message', handleChatMessage);
        socket.current.on('hand-raised', handleHandRaised);
        socket.current.on('hand-lowered', handleHandLowered);
        socket.current.on('recording-started', () => setIsRecording(true));
        socket.current.on('recording-stopped', () => setIsRecording(false));
        socket.current.on('meeting-ended', () => {
          toast.info('The meeting has been ended by the host');
          router.push(`/meetings/${meetingId}`);
        });

        setIsConnecting(false);
      } catch (error) {
        console.error('Failed to initialize meeting:', error);
        toast.error('Failed to access camera/microphone');
        setIsConnecting(false);
      }
    };

    init();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      leaveRoom(meetingId, user._id);
      api.post(`/meetings/${meetingId}/leave`).catch(console.error);

      if (socket.current) {
        socket.current.off('existing-users', handleExistingUsers);
        socket.current.off('user-connected', handleUserConnected);
        socket.current.off('user-disconnected', handleUserDisconnected);
        socket.current.off('offer', handleOffer);
        socket.current.off('answer', handleAnswer);
        socket.current.off('ice-candidate', handleIceCandidate);
        socket.current.off('chat-message', handleChatMessage);
        socket.current.off('meeting-ended');
      }
    };
  }, [meetingId, user._id]);

  const createPeer = useCallback((userId, initiator = false) => {
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: localStream
    });

    peer.on('signal', (data) => {
      if (data.type === 'offer') {
        socket.current.emit('offer', { meetingId, offer: data, targetUserId: userId });
      } else if (data.type === 'answer') {
        socket.current.emit('answer', { meetingId, answer: data, targetUserId: userId });
      } else if (data.candidate) {
        socket.current.emit('ice-candidate', { meetingId, candidate: data, targetUserId: userId });
      }
    });

    peer.on('stream', (stream) => {
      setRemoteStreams(prev => ({ ...prev, [userId]: stream }));
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    return peer;
  }, [localStream, meetingId]);

  const handleExistingUsers = useCallback((users) => {
    users.forEach(({ userId }) => {
      const peer = createPeer(userId, true);
      peersRef.current[userId] = peer;
    });
    setParticipants(prev => [...prev, ...users.map(u => u.userId)]);
  }, [createPeer]);

  const handleUserConnected = useCallback((userId) => {
    toast.info('Someone joined the meeting');
    setParticipants(prev => [...prev, userId]);
  }, []);

  const handleUserDisconnected = useCallback((userId) => {
    if (peersRef.current[userId]) {
      peersRef.current[userId].destroy();
      delete peersRef.current[userId];
    }
    setRemoteStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[userId];
      return newStreams;
    });
    setParticipants(prev => prev.filter(id => id !== userId));
  }, []);

  const handleOffer = useCallback(({ offer, userId }) => {
    const peer = createPeer(userId, false);
    peer.signal(offer);
    peersRef.current[userId] = peer;
  }, [createPeer]);

  const handleAnswer = useCallback(({ answer, userId }) => {
    if (peersRef.current[userId]) {
      peersRef.current[userId].signal(answer);
    }
  }, []);

  const handleIceCandidate = useCallback(({ candidate, userId }) => {
    if (peersRef.current[userId]) {
      peersRef.current[userId].signal(candidate);
    }
  }, []);

  const handleChatMessage = useCallback(({ userId, message, timestamp }) => {
    setMessages(prev => [...prev, { userId, message, timestamp }]);
  }, []);

  const handleHandRaised = useCallback(() => {
    toast.info('Someone raised their hand');
  }, []);

  const handleHandLowered = useCallback(() => {}, []);

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];

        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.streams?.[0]?.getVideoTracks()[0];
          if (sender) {
            peer.replaceTrack(sender, videoTrack, peer.streams[0]);
          }
        });

        videoTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } else {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];

        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.streams?.[0]?.getVideoTracks()[0];
          if (sender) {
            peer.replaceTrack(sender, videoTrack, peer.streams[0]);
          }
        });

        setIsScreenSharing(false);
      }
    } catch (error) {
      toast.error('Screen sharing failed');
    }
  };

  const toggleHand = () => {
    if (isHandRaised) {
      socket.current.emit('lower-hand', { meetingId });
    } else {
      socket.current.emit('raise-hand', { meetingId });
    }
    setIsHandRaised(!isHandRaised);
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.current.emit('chat-message', { meetingId, message: chatInput });
    setMessages(prev => [...prev, {
      userId: user._id,
      message: chatInput,
      timestamp: new Date().toISOString()
    }]);
    setChatInput('');
  };

  // Leave meeting (non-host — just disconnects this user)
  const leaveMeeting = async () => {
    try {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      leaveRoom(meetingId, user._id);
      await api.post(`/meetings/${meetingId}/leave`);
    } catch (err) {
      console.error('Leave error:', err);
    }
    router.push('/meetings/history');
  };

  // End meeting (host only — ends it for everyone)
  const handleEndMeeting = async () => {
    if (!isHost) return;
    setIsEndingMeeting(true);
    try {
      await api.post(`/meetings/${meetingId}/end`);
      toast.success('Meeting ended');
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      router.push(`/meetings/${meetingId}`);
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to end meeting';
      toast.error(msg);
      console.error('End meeting error:', error);
    } finally {
      setIsEndingMeeting(false);
    }
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Joining meeting...</p>
        </div>
      </div>
    );
  }

  const participantCount = Object.keys(remoteStreams).length + 1;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-muted px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-slate-100">Meeting Room</h1>
          {isRecording && (
            <Badge className="bg-red-500/20 text-red-400 animate-pulse">
              Recording
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* End Meeting button — only visible to host */}
          {isHost && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndMeeting}
              disabled={isEndingMeeting}
              className="flex items-center gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              {isEndingMeeting ? 'Ending...' : 'End Meeting'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
            className="text-muted-foreground"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span>{participantCount}</span>
          </div>
        </div>
      </header>

      {/* Recording banner for non-hosts */}
      {isRecording && !isHost && (
        <div className="bg-red-900/30 border-b border-red-800 px-4 py-2 text-center text-sm text-red-300">
          This meeting is being recorded
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className={cn(
          'flex-1 p-4 transition-all',
          chatOpen ? 'mr-80' : ''
        )}>
          <div className={cn(
            'grid gap-4 h-full',
            participantCount <= 2 ? 'grid-cols-1' :
            participantCount <= 4 ? 'grid-cols-2' :
            'grid-cols-3'
          )}>
            {/* Local video */}
            <div className="relative bg-card rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={cn(
                  'w-full h-full object-cover',
                  !isVideoEnabled && 'hidden'
                )}
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-3xl">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-sm text-white">
                You {isScreenSharing && '(Screen)'} {isHost && '· Host'}
              </div>
            </div>

            {/* Remote videos */}
            {Object.entries(remoteStreams).map(([userId, stream]) => (
              <div key={userId} className="relative bg-card rounded-lg overflow-hidden">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(el) => { if (el) el.srcObject = stream; }}
                />
                <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-sm text-white">
                  Participant
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <Card className="w-80 border-l border-muted bg-card flex flex-col">
            <CardContent className="flex-1 flex flex-col p-0">
              <div className="p-4 border-b border-muted font-medium">Chat</div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-slate-500 text-center">No messages yet</p>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={cn(
                      'text-sm',
                      msg.userId === user._id ? 'text-right' : 'text-left'
                    )}>
                      <span className={cn(
                        'inline-block px-3 py-2 rounded-lg',
                        msg.userId === user._id
                          ? 'bg-blue-500/20 text-blue-100'
                          : 'bg-muted text-foreground'
                      )}>
                        {msg.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={sendChatMessage} className="p-4 border-t border-muted flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-muted border border-slate-700 rounded px-3 py-2 text-sm text-white"
                />
                <Button type="submit" size="sm">Send</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Controls */}
      <div className="bg-card border-t border-muted px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAudio}
            className={cn(
              'h-12 w-12 rounded-full',
              !isAudioEnabled ? 'bg-red-500/20 text-red-400' : 'bg-muted text-foreground'
            )}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVideo}
            className={cn(
              'h-12 w-12 rounded-full',
              !isVideoEnabled ? 'bg-red-500/20 text-red-400' : 'bg-muted text-foreground'
            )}
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleScreenShare}
            className={cn(
              'h-12 w-12 rounded-full',
              isScreenSharing ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-foreground'
            )}
          >
            {isScreenSharing ? <StopCircle className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleHand}
            className={cn(
              'h-12 w-12 rounded-full',
              isHandRaised ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-foreground'
            )}
          >
            <Hand className="h-5 w-5" />
          </Button>

          {/* Leave button (all users) */}
          <Button
            variant="destructive"
            size="icon"
            onClick={leaveMeeting}
            className="h-12 w-12 rounded-full"
            title="Leave meeting"
          >
            <Phone className="h-5 w-5 rotate-[135deg]" />
          </Button>
        </div>
      </div>
    </div>
  );
}