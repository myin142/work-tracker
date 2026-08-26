import { WorkTime } from '@myin/models';
import { getWorkHoursInDay, parseWorkTimes } from './work-time-parser';

describe('Parse Work Time', () => {
  test('should parse work time', () => {
    expect(parseWorkTimes('08:00-12:00')).toEqual([
      expect.objectContaining({
        timeFrom: '08:00',
        timeTo: '12:00',
      } as WorkTime),
    ]);
  });

  test('should parse work time hour shorthand', () => {
    expect(parseWorkTimes('8-12')).toEqual([
      expect.objectContaining({
        timeFrom: '08:00',
        timeTo: '12:00',
      } as WorkTime),
    ]);
  });

  test('should parse work time hour shorthand with minutes', () => {
    expect(parseWorkTimes('8:30-12')).toEqual([
      expect.objectContaining({
        timeFrom: '08:30',
        timeTo: '12:00',
      } as WorkTime),
    ]);
  });

  test('should parse with break time', () => {
    expect(parseWorkTimes('8-17/12-13')).toEqual([
      expect.objectContaining({
        timeFrom: '08:00',
        timeTo: '17:00',
        breakFrom: '12:00',
        breakTo: '13:00',
      } as WorkTime),
    ]);
  });

  test('should parse only break within time', () => {
    expect(parseWorkTimes('8-10/12-13')).toEqual([
      expect.objectContaining({
        timeFrom: '08:00',
        timeTo: '10:00',
        breakFrom: undefined,
        breakTo: undefined,
      }),
    ]);
  });

  test('should parse with large time', () => {
    expect(parseWorkTimes('8-100')).toEqual([]);
  });

  test('should parse empty input', () => {
    expect(parseWorkTimes('')).toEqual([]);
  });

  test('should parse invalid input', () => {
    expect(parseWorkTimes('invalid')).toEqual([]);
  });

  describe('Parse Work Hours', () => {
    test('should parse hours with break', () => {
      expect(parseWorkTimes('8h')).toEqual([
        expect.objectContaining({
          timeFrom: '08:00',
          timeTo: '16:30',
          breakFrom: '12:00',
          breakTo: '12:30',
        }),
      ]);
    });

    test('should parse uneven hours with break', () => {
      expect(parseWorkTimes('7h')).toEqual([
        expect.objectContaining({
          timeFrom: '08:00',
          timeTo: '15:30',
          breakFrom: '11:30',
          breakTo: '12:00',
        }),
      ]);
    });

    test('should parse hours without break', () => {
      expect(parseWorkTimes('5h')).toEqual([
        expect.objectContaining({
          timeFrom: '08:00',
          timeTo: '13:00',
          breakFrom: undefined,
          breakTo: undefined,
        }),
      ]);
    });

    test('should parse hours with decimal', () => {
      expect(parseWorkTimes('4.5h')).toEqual([
        expect.objectContaining({
          timeFrom: '08:00',
          timeTo: '12:30',
          breakFrom: undefined,
          breakTo: undefined,
        }),
      ]);
    });

    test('should parse uneven hours with decimal', () => {
      expect(parseWorkTimes('7.5h')).toEqual([
        expect.objectContaining({
          timeFrom: '08:00',
          timeTo: '16:00',
          breakFrom: '11:45',
          breakTo: '12:15',
        }),
      ]);
    });

    test('should parse work hours with break hours', () => {
      expect(parseWorkTimes('8h/2h')).toEqual([
        expect.objectContaining({
          timeFrom: '08:00',
          timeTo: '18:00',
          breakFrom: '12:00',
          breakTo: '14:00',
        }),
      ]);
    });

    test('should parse work hours with decimal', () => {
      expect(parseWorkTimes('6.5h')).toEqual([
        expect.objectContaining({
          timeFrom: '08:00',
          timeTo: '15:00',
          breakFrom: '11:15',
          breakTo: '11:45',
        }),
      ]);
    });
  });

  test('should parse work time with break hours', () => {
    expect(parseWorkTimes('8-18/2h')).toEqual([
      expect.objectContaining({
        timeFrom: '08:00',
        timeTo: '18:00',
        breakFrom: '13:00',
        breakTo: '15:00',
      }),
    ]);
  });

  test('should parse multiple work times', () => {
    expect(parseWorkTimes('8-10;11-15/12-13')).toEqual([
      expect.objectContaining({
        timeFrom: '08:00',
        timeTo: '10:00',
        breakFrom: undefined,
        breakTo: undefined,
      } as WorkTime),
      expect.objectContaining({
        timeFrom: '11:00',
        timeTo: '15:00',
        breakFrom: '12:00',
        breakTo: '13:00',
      } as WorkTime),
    ]);
  });

  test('should parse multiple work hours', () => {
    expect(parseWorkTimes('2h;4h')).toEqual([
      expect.objectContaining({
        timeFrom: '08:00',
        timeTo: '10:00',
        breakFrom: undefined,
        breakTo: undefined,
      } as WorkTime),
      expect.objectContaining({
        timeFrom: '10:00',
        timeTo: '14:00',
        breakFrom: undefined,
        breakTo: undefined,
      } as WorkTime),
    ]);
  });

  test('should parse multiple work times and hours', () => {
    expect(parseWorkTimes('10-11;2h')).toEqual([
      expect.objectContaining({
        timeFrom: '10:00',
        timeTo: '11:00',
        breakFrom: undefined,
        breakTo: undefined,
      } as WorkTime),
      expect.objectContaining({
        timeFrom: '11:00',
        timeTo: '13:00',
        breakFrom: undefined,
        breakTo: undefined,
      } as WorkTime),
    ]);
  });

  test('should parse multiple work hours with break', () => {
    expect(parseWorkTimes('4h;4h')).toEqual([
      expect.objectContaining({
        timeFrom: '08:00',
        timeTo: '12:00',
        breakFrom: undefined,
        breakTo: undefined,
      } as WorkTime),
      expect.objectContaining({
        timeFrom: '12:00',
        timeTo: '16:30',
        breakFrom: '14:00',
        breakTo: '14:30',
      } as WorkTime),
    ]);
  });
});

describe('getWorkHoursInDay', () => {
  test('should subtract a break nested inside a single work span', () => {
    expect(
      getWorkHoursInDay([
        {
          timeFrom: '08:00',
          timeTo: '15:00',
          breakFrom: '10:00',
          breakTo: '12:00',
          projectId: 1,
        },
      ])
    ).toBe('05:00');
  });

  test('should not double subtract a break already excluded from the span', () => {
    expect(
      getWorkHoursInDay([
        {
          timeFrom: '08:00',
          timeTo: '14:00',
          breakFrom: '14:00',
          breakTo: '14:30',
          projectId: 1,
        },
        {
          timeFrom: '14:30',
          timeTo: '15:30',
          projectId: 2,
        },
      ])
    ).toBe('07:00');
  });
});
