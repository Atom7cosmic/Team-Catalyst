'use client';

import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const statusColors = {
  present: 'bg-green-500 hover:bg-green-400',
  absent: 'bg-red-500 hover:bg-red-400',
  late: 'bg-yellow-500 hover:bg-yellow-400',
  half_day: 'bg-orange-500 hover:bg-orange-400',
  wfh: 'bg-blue-500 hover:bg-blue-400',
  weekend: 'bg-muted',
  empty: 'bg-slate-700/30'
};

const statusLabels = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  wfh: 'Work From Home',
  weekend: 'Weekend',
  empty: 'No Record'
};

export default function AttendanceHeatmap({
  attendanceData = [],
  year = new Date().getFullYear(),
  month = new Date().getMonth(),
  className
}) {
  const calendarData = useMemo(() => {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    // Create a map of attendance by date
    const attendanceMap = new Map(
      attendanceData.map(record => [
        format(new Date(record.date), 'yyyy-MM-dd'),
        record
      ])
    );

    // Get starting day of week (0 = Sunday)
    const startDay = getDay(start);

    // Create weeks array
    const weeks = [];
    let currentWeek = [];

    // Add empty cells for days before start of month
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = attendanceMap.get(dateStr);

      currentWeek.push({
        date: day,
        status: record?.status || (getDay(day) === 0 || getDay(day) === 6 ? 'weekend' : 'empty'),
        isLate: record?.isLate || false,
        notes: record?.notes || ''
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Fill remaining cells
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [attendanceData, year, month]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate stats
  const stats = useMemo(() => {
    const total = attendanceData.length;
    const present = attendanceData.filter(r => r.status === 'present').length;
    const late = attendanceData.filter(r => r.isLate).length;
    const absent = attendanceData.filter(r => r.status === 'absent').length;
    const wfh = attendanceData.filter(r => r.status === 'wfh').length;

    return { total, present, late, absent, wfh };
  }, [attendanceData]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span className="text-muted-foreground">Present: {stats.present}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-yellow-500" />
          <span className="text-muted-foreground">Late: {stats.late}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-500" />
          <span className="text-muted-foreground">Absent: {stats.absent}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-muted-foreground">WFH: {stats.wfh}</span>
        </div>
      </div>

      {/* Calendar */}
      <TooltipProvider>
        <div className="rounded-lg border border-slate-700 bg-muted p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-slate-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {calendarData.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIdx) => (
                  <div key={dayIdx} className="aspect-square">
                    {day ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'w-full h-full rounded-md transition-colors',
                              statusColors[day.status] || statusColors.empty
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="bg-card border border-slate-700 px-3 py-2 rounded-lg shadow-lg"
                        >
                          <div className="text-xs">
                            <p className="font-medium text-foreground">
                              {format(day.date, 'MMM d, yyyy')}
                            </p>
                            <p className="text-muted-foreground">
                              {statusLabels[day.status]}
                              {day.isLate && ' (Late)'}
                            </p>
                            {day.notes && (
                              <p className="text-slate-500 mt-1">{day.notes}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div className="w-full h-full rounded-md bg-muted/50" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
