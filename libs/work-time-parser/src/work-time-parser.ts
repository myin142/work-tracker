import { formatTime, WorkTime } from '@myin/models';
import {
  add,
  addMinutes,
  differenceInMinutes,
  intervalToDuration,
  isValid,
  isWithinInterval,
  parse,
  setHours,
  startOfDay,
  startOfToday,
} from 'date-fns';

const DEFAULT_HOURS_START_TIME = setHours(startOfToday(), 8);
const DEFAULT_HOURS_BREAK_MINUTES = 30;

const MAX_WORK_HOURS_WITHOUT_BREAK = 6;

function createWorkTime(
  workTimeInput: string,
  startTime: Date
): Interval | null {
  if (isHourInput(workTimeInput)) {
    return parseHours(startTime, workTimeInput);
  }

  return parseInterval(workTimeInput, new Date());
}

function intervalInMinutes(interval: Interval) {
  return differenceInMinutes(interval.end, interval.start);
}

function createBreakTime(
  workTimeInterval: Interval,
  breakTimeInput?: string,
  continuousWorkMinutes?: number
): Interval | null {
  const workMinutes = intervalInMinutes(workTimeInterval);
  const workTimeCenter = addMinutes(
    workTimeInterval.start,
    Math.floor(workMinutes / 2)
  );

  if (breakTimeInput) {
    if (isHourInput(breakTimeInput)) {
      return parseHours(workTimeCenter, breakTimeInput);
    }
    const interval = parseInterval(breakTimeInput, new Date());
    if (interval && isIntervalWithin(interval, workTimeInterval)) {
      return interval;
    }
  } else if (
    isWorkTimeNeedsBreak(
      intervalInMinutes(workTimeInterval) + (continuousWorkMinutes || 0)
    )
  ) {
    const breakTo = addMinutes(workTimeCenter, DEFAULT_HOURS_BREAK_MINUTES);
    return { start: workTimeCenter, end: breakTo };
  }

  return null;
}

export function parseWorkTimes(input: string): WorkTime[] {
  const result: WorkTime[] = [];
  let startTime = DEFAULT_HOURS_START_TIME;
  let continuousWorkMinutes = 0;

  input.split(';').forEach((i) => {
    const workTime = parseSingleWorkTime(i, startTime, continuousWorkMinutes);
    if (workTime) {
      result.push(workTime);
      if (workTime.breakFrom) {
        continuousWorkMinutes = 0;
      } else {
        continuousWorkMinutes = differenceInMinutes(
          parseTime(workTime.timeTo) || new Date(),
          parseTime(workTime.timeFrom) || new Date()
        );
      }
      startTime = parseTime(workTime.timeTo, startTime) || startTime;
    }
  });

  return result;
}

function parseSingleWorkTime(
  input: string,
  startTime: Date,
  continuousWorkMinutes: number
): WorkTime | null {
  const times = input.split('/');
  const workTimeInput = times[0];

  const workTimeInterval = createWorkTime(workTimeInput, startTime);
  if (!workTimeInterval) {
    return null;
  }

  const breakTimeInterval = createBreakTime(
    workTimeInterval,
    times[1],
    continuousWorkMinutes
  );

  if (breakTimeInterval && isHourInput(workTimeInput)) {
    workTimeInterval.end = addMinutes(
      workTimeInterval.end,
      intervalInMinutes(breakTimeInterval)
    );
  }

  return {
    timeFrom: formatTime(workTimeInterval.start),
    timeTo: formatTime(workTimeInterval.end),
    breakFrom: breakTimeInterval
      ? formatTime(breakTimeInterval.start)
      : undefined,
    breakTo: breakTimeInterval ? formatTime(breakTimeInterval.end) : undefined,
    projectId: -1,
  };
}

function parseInterval(time: string, refDate: Date): Interval | null {
  const ranges = time.split('-');
  const start = parseTime(ranges[0], refDate) as Date;
  const end = parseTime(ranges[1], refDate) as Date;

  if (!isValid(start) || !isValid(end)) {
    return null;
  }

  return { start, end };
}

function parseTime(time?: string, date = new Date()): Date | null {
  if (!time) return null;

  const f = time.includes(':') ? 'HH:mm' : 'HH';
  return parse(time, f, date);
}

function parseHours(start: Date, input: string): Interval | null {
  const hours = parseFloat(input);
  const workMinutes = hours * 60;
  if (start) {
    return { start, end: addMinutes(start, workMinutes) };
  }

  return null;
}

function isWorkTimeNeedsBreak(workMinutes: number) {
  return workMinutes > MAX_WORK_HOURS_WITHOUT_BREAK * 60;
}

function isHourInput(input: string): boolean {
  return /^\d+\.?\d?h$/.test(input);
}

function isIntervalWithin(interval: Interval, boundingInterval: Interval) {
  return (
    isWithinInterval(interval.start, boundingInterval) &&
    isWithinInterval(interval.end, boundingInterval)
  );
}

export const getWorkHoursInDay = (times: WorkTime[]) => {
  const start = startOfDay(new Date());
  const end = times
    .map((time) => {
      const timeFrom = parseTime(time.timeFrom) as Date;
      const timeTo = parseTime(time.timeTo) as Date;

      if (time.breakFrom && time.breakTo) {
        const breakFrom = parseTime(time.breakFrom) as Date;
        if (breakFrom < timeTo) {
          return [
            { start: timeFrom, end: breakFrom },
            { start: parseTime(time.breakTo) as Date, end: timeTo },
          ];
        }
      }

      return [{ start: timeFrom, end: timeTo }];
    })
    .reduce((prev, curr) => prev.concat(curr), [])
    .reduce((prev, curr) => add(prev, intervalToDuration(curr)), start);
  return start !== end ? formatTime(end) : '';
};

export const getWorkHoursInMinutes = (times: WorkTime[]) => {
  const dayHours = getWorkHoursInDay(times);
  if (!dayHours) {
    return 0;
  }

  return differenceInMinutes(parseTime(dayHours) ?? 0, startOfToday());
};
