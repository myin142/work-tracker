import {
  eachWeekOfInterval,
  addDays,
  startOfMonth,
  endOfMonth,
  format,
  isSameMonth,
  isSunday,
  isSaturday,
  sub,
  add,
  isSameDay,
  isWithinInterval,
  isBefore,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { isMonday } from 'date-fns/esm';
import { useEffect, useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import Button from '../button/button';

export interface CalendarProps {
  onDateClicked: (d: Date) => void;
  onRangeSelected: (i: Interval) => void;
  cell?: (d: Date) => JSX.Element;
  rangeSelect: boolean;
}

const createIntervalBetween = (date1: Date, date2: Date): Interval => {
  if (isBefore(date1, date2)) {
    return { start: date1, end: date2 };
  } else {
    return { start: date2, end: date1 };
  }
};

export function Calendar({
  onDateClicked,
  onRangeSelected,
  cell,
  rangeSelect,
}: CalendarProps) {
  const [date, setDate] = useState(startOfMonth(new Date()));
  const [rangeStart, setRangeStart] = useState(null as Date | null);
  const [hoverDate, setHoverDate] = useState(null as Date | null);

  useEffect(() => setRangeStart(null), [rangeSelect]);

  const updateDate = (date: Date) => {
    setDate(startOfMonth(date));
  };

  let start = startOfMonth(date);
  if (isMonday(start)) {
    start = sub(start, { days: 1 });
  }

  let end = endOfMonth(date);
  if (isMonday(end)) {
    end = add(end, { days: 1 });
  }

  const onCellClick = (date: Date) => {
    if (rangeSelect) {
      if (!rangeStart) {
        setRangeStart(date);
      } else {
        onRangeSelected({ start: rangeStart, end: date });
      }
    } else {
      onDateClicked(date);
    }
  };

  const isInsideRange = (date: Date) => {
    if (rangeSelect) {
      const isHoverDate = hoverDate && isSameDay(hoverDate, date);
      const isRangeStartDate = rangeStart && isSameDay(rangeStart, date);
      const isBetweenStartAndHover =
        hoverDate &&
        rangeStart &&
        isWithinInterval(date, createIntervalBetween(hoverDate, rangeStart));

      return isHoverDate || isRangeStartDate || isBetweenStartAndHover;
    }

    return false;
  };

  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(
    (day) => {
      const weekDays = [day];
      for (let i = 1; i <= 6; i++) {
        weekDays.push(addDays(day, i));
      }

      return weekDays.map((d) => {
        return (
          <div
            className={`border border-gray-200 p-2 text-sm cursor-pointer ${
              !isSameMonth(date, d) ? 'opacity-50' : ''
            } ${isInsideRange(d) ? 'bg-blue-200' : ''}`}
            key={d.toISOString()}
            onClick={() => onCellClick(d)}
            onMouseEnter={() => setHoverDate(d)}
            onMouseLeave={() => setHoverDate(null)}
          >
            <div className="flex flex-col items-start">
              <span
                className={`rounded-full w-6 h-6 flex justify-center items-center ${
                  isToday(d) ? 'text-white bg-blue-700 font-bold' : ''
                }`}
              >
                <span>{format(d, 'dd')}</span>
              </span>
              {cell && cell(d)}
            </div>
          </div>
        );
      });
    }
  );

  const title = format(date, 'MMMM yyyy');
  const weekDayLetters = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Son'];

  return (
    <div className=" text-gray-800 w-full flex-grow flex flex-col">
      <div className="text-4xl font-bold flex items-center justify-between">
        <div className="flex items-center w-96">
          <button onClick={() => setDate(subMonths(date, 1))}>
            <HiChevronLeft />
          </button>
          <span className="flex-grow text-center">{title}</span>
          <button onClick={() => setDate(addMonths(date, 1))}>
            <HiChevronRight />
          </button>
        </div>
        <Button className="text-base" onClick={() => updateDate(new Date())}>
          Today
        </Button>
      </div>
      <div className="grid mt-4 grid-cols-7 flex-grow grid-rows-[3rem_auto]">
        {weekDayLetters.map((l) => (
          <div className="text-sm border font-bold border-gray-200 p-2 flex items-center justify-center">
            {l}
          </div>
        ))}
        {weeks}
      </div>
    </div>
  );
}

export default Calendar;
