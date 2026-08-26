import { FullDayType } from '@myin/models';
import { OffDutyReasonEnum, TimeSpanTypeEnum } from '@myin/openapi';
import {
  mapFullDayTypes,
  mapToNewTimespans,
  mapToWorkDay,
} from './work-time-mapper';

describe('workTimeMapper', () => {
  describe('New Timespan', () => {
    it('should return work time without break', () => {
      const [timeSpans] = mapToNewTimespans({
        date: new Date('2020-01-01'),
        workTimes: [
          {
            timeFrom: '08:00',
            timeTo: '17:00',
            projectId: 0,
          },
        ],
      });

      expect(timeSpans).toEqual([
        {
          date: '2020-01-01',
          fromTime: '08:00',
          toTime: '17:00',
          type: TimeSpanTypeEnum.Work,
          homeoffice: false,
        },
      ]);
    });

    it('should split times by break', () => {
      const [timeSpans] = mapToNewTimespans({
        date: new Date('2020-01-01'),
        workTimes: [
          {
            timeFrom: '08:00',
            timeTo: '17:00',
            breakFrom: '12:00',
            breakTo: '13:00',
            projectId: 0,
          },
        ],
      });

      expect(timeSpans).toEqual(
        expect.arrayContaining([
          {
            date: '2020-01-01',
            fromTime: '08:00',
            toTime: '12:00',
            type: TimeSpanTypeEnum.Work,
            homeoffice: false,
          },
          {
            date: '2020-01-01',
            fromTime: '12:00',
            toTime: '13:00',
            type: TimeSpanTypeEnum.Break,
            homeoffice: undefined,
          },
          {
            date: '2020-01-01',
            fromTime: '13:00',
            toTime: '17:00',
            type: TimeSpanTypeEnum.Work,
            homeoffice: false,
          },
        ])
      );
    });

    it('should set homeoffice', () => {
      const [timeSpans] = mapToNewTimespans({
        date: new Date('2020-01-01'),
        homeoffice: true,
        workTimes: [
          {
            timeFrom: '08:00',
            timeTo: '17:00',
            projectId: 0,
          },
        ],
      });

      expect(timeSpans).toEqual([
        expect.objectContaining({
          homeoffice: true,
        }),
      ]);
    });

    it('should create project timespans', () => {
      const [_, projectTimes] = mapToNewTimespans({
        date: new Date('2020-01-01'),
        homeoffice: true,
        workTimes: [
          {
            timeFrom: '08:00',
            timeTo: '10:00',
            projectId: 1,
          },
          {
            timeFrom: '10:00',
            timeTo: '16:00',
            breakFrom: '12:00',
            breakTo: '13:00',
            projectId: 2,
          },
          {
            timeFrom: '16:00',
            timeTo: '17:00',
            projectId: 1,
          },
        ],
      });

      expect(projectTimes).toEqual(
        expect.arrayContaining([
          {
            date: '2020-01-01',
            project: 1,
            timeSpans: [
              { fromTime: '08:00', toTime: '10:00' },
              { fromTime: '16:00', toTime: '17:00' },
            ],
          },
          {
            date: '2020-01-01',
            project: 2,
            timeSpans: [
              { fromTime: '10:00', toTime: '12:00' },
              { fromTime: '13:00', toTime: '16:00' },
            ],
          },
        ])
      );
    });

    it('should create sick leave with existing time', () => {
      const [timeSpans] = mapToNewTimespans({
        date: new Date('2020-01-01'),
        homeoffice: true,
        sickLeave: true,
        workTimes: [
          {
            timeFrom: '08:00',
            timeTo: '10:00',
            projectId: 1,
          },
        ],
      });

      expect(timeSpans).toEqual(
        expect.arrayContaining([
          {
            date: '2020-01-01',
            type: TimeSpanTypeEnum.SickLeave,
            fromTime: '10:00',
            toTime: undefined,
          },
        ])
      );
    });

    it('should create sick leave without existing time', () => {
      const [timeSpans] = mapToNewTimespans({
        date: new Date('2020-01-01'),
        homeoffice: true,
        sickLeave: true,
        workTimes: [],
      });

      expect(timeSpans).toEqual(
        expect.arrayContaining([
          {
            date: '2020-01-01',
            type: TimeSpanTypeEnum.SickLeave,
            fromTime: undefined,
            toTime: undefined,
          },
        ])
      );
    });

    it('should create vacation', () => {
      const [timeSpans] = mapToNewTimespans({
        date: new Date('2020-01-01'),
        homeoffice: true,
        vacation: true,
        workTimes: [{ timeFrom: '08:00', timeTo: '10:00', projectId: 1 }],
      });

      expect(timeSpans).toEqual([
        {
          date: '2020-01-01',
          type: TimeSpanTypeEnum.FullDayVacation,
          fromTime: undefined,
          toTime: undefined,
        },
      ]);
    });

    it('should create half day vacation', () => {
      const [timeSpans] = mapToNewTimespans(
        {
          date: new Date('2020-01-01'),
          homeoffice: true,
          vacation: true,
          workTimes: [{ timeFrom: '08:00', timeTo: '10:00', projectId: 1 }],
        },
        [{ date: new Date('2020-01-01'), name: 'Test', workable: true }]
      );

      expect(timeSpans).toEqual([
        {
          date: '2020-01-01',
          type: TimeSpanTypeEnum.HalfDayVacation,
          fromTime: undefined,
          toTime: undefined,
        },
      ]);
    });

    it('should create off-duty vacation', () => {
      const [timeSpans] = mapToNewTimespans({
        date: new Date('2020-01-01'),
        vacation: true,
        offDuty: OffDutyReasonEnum.ChangeOfResidence,
        workTimes: [{ timeFrom: '08:00', timeTo: '10:00', projectId: 1 }],
      });

      expect(timeSpans).toEqual([
        {
          date: '2020-01-01',
          type: TimeSpanTypeEnum.OffDuty,
          offDutyReason: OffDutyReasonEnum.ChangeOfResidence,
          fromTime: undefined,
          toTime: undefined,
        },
      ]);
    });
  });

  describe('FullDayType', () => {
    it('should create vacation times without weekend', () => {
      const times = mapFullDayTypes(FullDayType.VACATION, {
        start: new Date('2020-01-01'),
        end: new Date('2020-01-05'),
      });

      expect(times).toEqual(
        expect.arrayContaining([
          {
            date: '2020-01-01',
            type: TimeSpanTypeEnum.FullDayVacation,
            fromTime: undefined,
            toTime: undefined,
          },
          {
            date: '2020-01-02',
            type: TimeSpanTypeEnum.FullDayVacation,
            fromTime: undefined,
            toTime: undefined,
          },
          {
            date: '2020-01-03',
            type: TimeSpanTypeEnum.FullDayVacation,
            fromTime: undefined,
            toTime: undefined,
          },
        ])
      );
    });

    it('should create sick times without weekend', () => {
      const times = mapFullDayTypes(FullDayType.SICK, {
        start: new Date('2020-01-01'),
        end: new Date('2020-01-05'),
      });

      expect(times).toEqual(
        expect.arrayContaining([
          {
            date: '2020-01-01',
            type: TimeSpanTypeEnum.SickLeave,
            fromTime: undefined,
            toTime: undefined,
          },
          {
            date: '2020-01-02',
            type: TimeSpanTypeEnum.SickLeave,
            fromTime: undefined,
            toTime: undefined,
          },
          {
            date: '2020-01-03',
            type: TimeSpanTypeEnum.SickLeave,
            fromTime: undefined,
            toTime: undefined,
          },
        ])
      );
    });

    it('should skip non-workable holidays and set half vacations', () => {
      const times = mapFullDayTypes(
        FullDayType.VACATION,
        {
          start: new Date('2020-01-01'),
          end: new Date('2020-01-05'),
        },
        [
          { date: new Date('2020-01-02'), name: 'Test', workable: false },
          { date: new Date('2020-01-03'), name: 'Test', workable: true },
        ]
      );

      expect(times).toEqual(
        expect.arrayContaining([
          {
            date: '2020-01-01',
            type: TimeSpanTypeEnum.FullDayVacation,
            fromTime: undefined,
            toTime: undefined,
          },
          {
            date: '2020-01-03',
            type: TimeSpanTypeEnum.HalfDayVacation,
            fromTime: undefined,
            toTime: undefined,
          },
        ])
      );
    });

    it('should create offduty times without weekend', () => {
      const times = mapFullDayTypes(
        FullDayType.OFF_DUTY,
        { start: new Date('2020-01-01'), end: new Date('2020-01-05') },
        [],
        OffDutyReasonEnum.ChangeOfResidence
      );

      expect(times).toEqual(
        expect.arrayContaining([
          {
            date: '2020-01-01',
            type: TimeSpanTypeEnum.OffDuty,
            offDutyReason: OffDutyReasonEnum.ChangeOfResidence,
            fromTime: undefined,
            toTime: undefined,
          },
          {
            date: '2020-01-02',
            type: TimeSpanTypeEnum.OffDuty,
            offDutyReason: OffDutyReasonEnum.ChangeOfResidence,
            fromTime: undefined,
            toTime: undefined,
          },
          {
            date: '2020-01-03',
            type: TimeSpanTypeEnum.OffDuty,
            offDutyReason: OffDutyReasonEnum.ChangeOfResidence,
            fromTime: undefined,
            toTime: undefined,
          },
        ])
      );
    });
  });

  describe('Map to WorkDay', () => {
    it('should map timespans with projects', () => {
      const workDays = mapToWorkDay(
        [
          {
            type: TimeSpanTypeEnum.Work,
            fromTime: '08:00',
            toTime: '10:00',
            date: '2020-01-01',
            id: 1,
            homeoffice: true,
          },
          {
            type: TimeSpanTypeEnum.Break,
            fromTime: '10:00',
            toTime: '12:00',
            date: '2020-01-01',
            id: 1,
          },
          {
            type: TimeSpanTypeEnum.Work,
            fromTime: '12:00',
            toTime: '15:00',
            date: '2020-01-01',
            id: 1,
            homeoffice: true,
          },
        ],
        [
          {
            date: '2020-01-01',
            project: 1,
            timeSpans: [
              { fromTime: '08:00', toTime: '10:00' },
              { fromTime: '12:00', toTime: '15:00' },
            ],
          },
        ]
      );

      expect(workDays).toEqual([
        expect.objectContaining({
          date: new Date('2020-01-01'),
          homeoffice: true,
          workTimes: [
            {
              timeFrom: '08:00',
              timeTo: '15:00',
              projectId: 1,
              breakFrom: '10:00',
              breakTo: '12:00',
            },
          ],
        }),
      ]);
    });

    it('should map timespans with a break between two different projects', () => {
      const workDays = mapToWorkDay(
        [
          {
            type: TimeSpanTypeEnum.Work,
            fromTime: '08:00',
            toTime: '14:00',
            date: '2020-01-01',
            id: 1,
          },
          {
            type: TimeSpanTypeEnum.Break,
            fromTime: '14:00',
            toTime: '14:30',
            date: '2020-01-01',
            id: 1,
          },
          {
            type: TimeSpanTypeEnum.Work,
            fromTime: '14:30',
            toTime: '15:30',
            date: '2020-01-01',
            id: 1,
          },
        ],
        [
          {
            date: '2020-01-01',
            project: 1,
            timeSpans: [{ fromTime: '08:00', toTime: '14:00' }],
          },
          {
            date: '2020-01-01',
            project: 2,
            timeSpans: [{ fromTime: '14:30', toTime: '15:30' }],
          },
        ]
      );

      expect(workDays).toEqual([
        expect.objectContaining({
          date: new Date('2020-01-01'),
          workTimes: [
            {
              timeFrom: '08:00',
              timeTo: '14:00',
              projectId: 1,
              breakFrom: '14:00',
              breakTo: '14:30',
            },
            {
              timeFrom: '14:30',
              timeTo: '15:30',
              projectId: 2,
            },
          ],
        }),
      ]);
    });

    it('should map full days', () => {
      const workDays = mapToWorkDay(
        [
          { type: TimeSpanTypeEnum.FullDayVacation, id: 1, date: '2020-01-01' },
          {
            type: TimeSpanTypeEnum.OffDuty,
            id: 1,
            date: '2020-01-02',
            offDutyReason: OffDutyReasonEnum.ChangeOfResidence,
          },
          { type: TimeSpanTypeEnum.SickLeave, id: 1, date: '2020-01-03' },
          { type: TimeSpanTypeEnum.HalfDayVacation, id: 1, date: '2020-01-04' },
        ],
        []
      );

      expect(workDays).toEqual([
        expect.objectContaining({
          date: new Date('2020-01-01'),
          vacation: true,
        }),
        expect.objectContaining({
          date: new Date('2020-01-02'),
          offDuty: OffDutyReasonEnum.ChangeOfResidence,
          vacation: true,
        }),
        expect.objectContaining({
          date: new Date('2020-01-03'),
          sickLeave: true,
        }),
        expect.objectContaining({
          date: new Date('2020-01-04'),
          vacation: true,
        }),
      ]);
    });

    it('should map half sick day', () => {
      const workDays = mapToWorkDay(
        [
          {
            type: TimeSpanTypeEnum.Work,
            id: 1,
            date: '2020-01-01',
            fromTime: '08:00',
            toTime: '10:00',
          },
          {
            type: TimeSpanTypeEnum.SickLeave,
            id: 1,
            date: '2020-01-01',
            fromTime: '10:00',
          },
        ],
        [
          {
            date: '2020-01-01',
            project: 1,
            timeSpans: [{ fromTime: '08:00', toTime: '10:00' }],
          },
        ]
      );

      expect(workDays).toEqual([
        expect.objectContaining({
          date: new Date('2020-01-01'),
          sickLeave: true,
          workTimes: [{ timeFrom: '08:00', timeTo: '10:00', projectId: 1 }],
        }),
      ]);
    });

    it('should map locked day for full day', () => {
      const workDays = mapToWorkDay(
        [
          {
            id: 0,
            date: '2020-01-01',
            type: TimeSpanTypeEnum.FullDayVacation,
            userlock: true,
          },
        ],
        []
      );

      expect(workDays[0].locked).toBeTruthy();
    });

    it('should map locked day for work day', () => {
      const workDays = mapToWorkDay(
        [
          {
            id: 0,
            date: '2020-01-01',
            fromTime: '08:00',
            toTime: '10:00',
            type: TimeSpanTypeEnum.Work,
            userlock: true,
          },
        ],
        [
          {
            date: '2020-01-01',
            timeSpans: [{ fromTime: '08:00', toTime: '10:00' }],
            project: 1,
          },
        ]
      );

      expect(workDays[0].locked).toBeTruthy();
    });
  });
});
