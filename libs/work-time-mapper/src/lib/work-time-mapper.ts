import {
  formatDate,
  FullDayType,
  Holiday,
  WorkDay,
  WorkTime,
} from '@myin/models';
import {
  OffDutyReasonEnum,
  ProjectDateTimeSpans,
  ProjectTimeSpan,
  TimeSpanTypeEnum,
  TimeSpanWithID,
  TimeSpanWithoutID,
} from '@myin/openapi';
import { eachDayOfInterval, isSameDay, isWeekend } from 'date-fns';
import { groupBy } from 'lodash';

const projectTimeType: TimeSpanTypeEnum[] = [
  TimeSpanTypeEnum.OnCallDuty,
  TimeSpanTypeEnum.Work,
  TimeSpanTypeEnum.SpecialWork,
];

const fullDayTypeMap: Record<FullDayType, TimeSpanTypeEnum> = {
  [FullDayType.VACATION]: TimeSpanTypeEnum.FullDayVacation,
  [FullDayType.SICK]: TimeSpanTypeEnum.SickLeave,
  [FullDayType.OFF_DUTY]: TimeSpanTypeEnum.OffDuty,
};

export function mapToNewTimespans(
  workDay: WorkDay,
  holidays: Holiday[] = []
): [TimeSpanWithoutID[], ProjectDateTimeSpans[]] {
  const times: TimeSpanWithoutID[] = [];
  const projectTimes: ProjectDateTimeSpans[] = [];
  const date = formatDate(workDay.date);

  if (workDay.vacation) {
    if (workDay.offDuty) {
      return [
        [
          {
            type: TimeSpanTypeEnum.OffDuty,
            date,
            offDutyReason: workDay.offDuty,
          },
        ],
        [],
      ];
    }
    return [
      [
        {
          type: holidays
            .filter((h) => h.workable)
            .find((h) => isSameDay(h.date, workDay.date))
            ? TimeSpanTypeEnum.HalfDayVacation
            : TimeSpanTypeEnum.FullDayVacation,
          date,
        },
      ],
      [],
    ];
  }

  workDay.workTimes
    .map((workTime) => {
      const timeSpans = mapWorkTimeToTimespan(workDay, workTime);
      const projectTimes = mapTimespansToProjectTimes(timeSpans, workTime);

      return [timeSpans, projectTimes] as [
        TimeSpanWithoutID[],
        ProjectDateTimeSpans | null
      ];
    })
    .forEach(([timeSpans, projectTime]) => {
      times.push(...timeSpans);
      if (projectTime != null) {
        const existing = projectTimes.find(
          (p) => p.project === projectTime.project
        );
        if (existing) {
          existing.timeSpans.push(...projectTime.timeSpans);
        } else {
          projectTimes.push(projectTime);
        }
      }
    });

  if (workDay.sickLeave) {
    const sorted = times.map((t) => t.toTime).sort();
    const maxTime = sorted[sorted.length - 1];

    times.push({
      date,
      type: TimeSpanTypeEnum.SickLeave,
      fromTime: maxTime,
    });
  }

  return [times, projectTimes];
}

function mapTimespansToProjectTimes(
  timeSpans: TimeSpanWithoutID[],
  workTime: WorkTime
): ProjectDateTimeSpans | null {
  if (timeSpans.length === 0) {
    return null;
  }

  const projectTime: ProjectTimeSpan[] = timeSpans
    .filter(
      (time) =>
        time.fromTime && time.toTime && projectTimeType.includes(time.type)
    )
    .map((time) => ({
      fromTime: time.fromTime as string,
      toTime: time.toTime as string,
    }));

  return {
    date: timeSpans[0].date,
    project: workTime.projectId,
    timeSpans: projectTime,
  };
}

function mapWorkTimeToTimespan(
  day: WorkDay,
  workTime: WorkTime
): TimeSpanWithoutID[] {
  if (workTime.breakFrom && workTime.breakTo) {
    return [
      toTimespan(day, workTime.timeFrom, workTime.breakFrom),
      toTimespan(
        day,
        workTime.breakFrom,
        workTime.breakTo,
        TimeSpanTypeEnum.Break
      ),
      toTimespan(day, workTime.breakTo, workTime.timeTo),
    ];
  } else {
    return [toTimespan(day, workTime.timeFrom, workTime.timeTo)];
  }
}

function toTimespan(
  day: WorkDay,
  from: string,
  to: string,
  type: TimeSpanTypeEnum = TimeSpanTypeEnum.Work
): TimeSpanWithoutID {
  return {
    date: formatDate(day.date),
    type,
    fromTime: from,
    toTime: to,
    homeoffice:
      type === TimeSpanTypeEnum.Break ? undefined : day.homeoffice || false,
  };
}

export function mapFullDayTypes(
  fullDayType: FullDayType,
  range: Interval,
  holidays: Holiday[] = [],
  offDutyReason: OffDutyReasonEnum = OffDutyReasonEnum.Other
): TimeSpanWithoutID[] {
  const fullDayHoliday = holidays.filter((x) => !x.workable);
  const workableHoliday = holidays.filter((x) => x.workable);

  return eachDayOfInterval(range)
    .filter(
      (date) =>
        !isWeekend(date) && !fullDayHoliday.find((h) => isSameDay(h.date, date))
    )
    .map((date) => {
      const reason =
        fullDayType == FullDayType.OFF_DUTY ? offDutyReason : undefined;
      let type = fullDayTypeMap[fullDayType];
      if (
        fullDayType === FullDayType.VACATION &&
        workableHoliday.find((h) => isSameDay(h.date, date))
      ) {
        type = TimeSpanTypeEnum.HalfDayVacation;
      }

      return {
        date: formatDate(date),
        type,
        offDutyReason: reason,
      };
    });
}

export function mapToWorkDay(
  timeSpans: TimeSpanWithID[],
  projectTimes: ProjectDateTimeSpans[]
): WorkDay[] {
  const timeSpanByDate = groupBy(timeSpans, (t: TimeSpanWithID) => t.date);
  const projectTimesByDate = groupBy(projectTimes, (t) => t.date);

  const days: { [date: string]: WorkDay } = {};

  Object.keys(timeSpanByDate).forEach((date) => {
    const timeSpans: TimeSpanWithID[] = timeSpanByDate[date];
    if (timeSpans.length === 1) {
      const timeSpan = timeSpans[0];
      if (!timeSpan.toTime && !timeSpan.fromTime) {
        if (!days[date]) {
          days[date] = initWorkDayForTimeSpans(date, timeSpans);
        }

        switch (timeSpan.type) {
          case TimeSpanTypeEnum.FullDayVacation:
          case TimeSpanTypeEnum.HalfDayVacation:
            days[date].vacation = true;
            break;
          case TimeSpanTypeEnum.SickLeave:
            days[date].sickLeave = true;
            break;
          case TimeSpanTypeEnum.OffDuty:
            days[date].offDuty = timeSpan.offDutyReason;
            days[date].vacation = true;
            break;
        }
      }
    }
  });

  Object.keys(projectTimesByDate).forEach((date: string) => {
    const projectTimes: ProjectDateTimeSpans[] = projectTimesByDate[date];
    const timeSpans = timeSpanByDate[date];
    const breaks = timeSpans.filter(
      (t: TimeSpanWithID) => t.type === TimeSpanTypeEnum.Break
    );

    if (!days[date]) {
      days[date] = initWorkDayForTimeSpans(date, timeSpans);
    }

    projectTimes.forEach((project) => {
      let currentTime: WorkTime | null = null;
      for (const time of project.timeSpans) {
        if (currentTime && currentTime.breakTo === time.fromTime) {
          currentTime.timeTo = time.toTime;
          days[date].workTimes.push(currentTime);
          currentTime = null;
          continue;
        }

        if (currentTime) {
          days[date].workTimes.push(currentTime);
          currentTime = null;
        }

        const matchingBreak = breaks.find(
          (b: TimeSpanWithID) => b.fromTime === time.toTime
        );
        if (matchingBreak) {
          currentTime = {
            timeFrom: time.fromTime,
            timeTo: time.toTime,
            breakFrom: matchingBreak.fromTime,
            breakTo: matchingBreak.toTime,
            projectId: project.project,
          };
        } else {
          days[date].workTimes.push({
            timeFrom: time.fromTime,
            timeTo: time.toTime,
            projectId: project.project,
          });
        }
      }

      if (currentTime) {
        days[date].workTimes.push(currentTime);
      }
    });
  });

  return Object.values(days);
}

function initWorkDayForTimeSpans(
  date: string,
  timeSpans: TimeSpanWithID[]
): WorkDay {
  return {
    date: new Date(date),
    homeoffice: !!timeSpans.find((t: TimeSpanWithID) => t.homeoffice),
    sickLeave: !!timeSpans.find(
      (t: TimeSpanWithID) => t.type === TimeSpanTypeEnum.SickLeave
    ),
    locked: timeSpans.some((t) => t.userlock),
    workTimes: [],
  };
}
