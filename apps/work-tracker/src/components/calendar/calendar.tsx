import {
  eachWeekOfInterval,
  addDays,
  startOfMonth,
  endOfMonth,
  format,
  isSameMonth,
  sub,
  add,
  isSameDay,
  isWithinInterval,
  isBefore,
  addMonths,
  subMonths,
  isAfter,
  subDays,
  subWeeks,
} from 'date-fns';
import { addWeeks, isMonday } from 'date-fns/esm';
import { useEffect, useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import useKeyboardShortcut from '../../app/use-keyboard-shortcut';
import Button from '../button/button';

export interface CalendarProps {
  onDateClicked: (d: Date) => void;
  onDateChange: (d: Date) => void;
  onRangeSelected: (i: Interval) => void;
  onCellSelected: (d: Date) => void;
  cell?: (d: Date, isSelected: boolean) => JSX.Element;
  rangeSelect: boolean;
  cellSelect: boolean;
  header?: () => JSX.Element;
  rightHeader?: () => JSX.Element;
  currentDate: Date;
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
  onCellSelected,
  onDateChange,
  cell,
  header,
  rightHeader,
  rangeSelect,
  cellSelect,
  currentDate,
}: CalendarProps) {
  const [date, setDate] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(null as Date | null);
  const [hoverDate, setHoverDate] = useState(null as Date | null);

  const isSelecting = cellSelect || rangeSelect;
  const moveDate = isSelecting ? hoverDate || currentDate : currentDate;

  useKeyboardShortcut(['Shift', 'H'], () => prevMonth());
  useKeyboardShortcut(['Shift', 'L'], () => nextMonth());
  useKeyboardShortcut(['H'], () => onKeyMove(subDays(moveDate, 1)));
  useKeyboardShortcut(['J'], () => onKeyMove(addWeeks(moveDate, 1)));
  useKeyboardShortcut(['K'], () => onKeyMove(subWeeks(moveDate, 1)));
  useKeyboardShortcut(['L'], () => onKeyMove(addDays(moveDate, 1)));
  useKeyboardShortcut([' '], () => onKeyConfirm(), { overrideSystem: true });

  useEffect(() => setRangeStart(null), [rangeSelect]);
  useEffect(() => {
    onDateChange(date);
  }, [date]);

  useEffect(() => {
    setHoverDate(currentDate);
  }, [cellSelect, rangeSelect]);

  const prevMonth = () => setDate(subMonths(date, 1));
  const nextMonth = () => setDate(addMonths(date, 1));

  const updateDate = (date: Date | null) => {
    if (date) {
      setDate(date);
    }
  };

  let start = startOfMonth(date);
  if (isMonday(start)) {
    start = sub(start, { days: 1 });
  }

  let end = endOfMonth(date);
  if (isMonday(end)) {
    end = add(end, { days: 1 });
  }

  const withinRange = (date: Date) => isWithinInterval(date, { start, end });
  const updateRangeForDate = (date: Date) => {
    if (!withinRange(date)) {
      updateDate(date);
    }
  };

  const onKeyConfirm = () => {
    if (isSelecting) {
      const date = hoverDate || currentDate;
      onCellClick(date);
      updateRangeForDate(currentDate);
    }
  };

  const onKeyMove = (date: Date) => {
    if (isSelecting) {
      updateRangeForDate(date);
      setHoverDate(date);
    } else {
      onCellClick(date);
      if (!withinRange(date)) {
        onDateClicked(date);
      }
    }
  };

  const onCellClick = (date: Date) => {
    if (cellSelect) {
      onCellSelected(date);
    } else if (rangeSelect) {
      if (!rangeStart) {
        setRangeStart(date);
      } else {
        if (isAfter(rangeStart, date)) {
          onRangeSelected({ start: date, end: rangeStart });
        } else {
          onRangeSelected({ start: rangeStart, end: date });
        }

        setRangeStart(null);
        setHoverDate(null);
      }
    } else if (!withinRange(date)) {
      updateDate(date);
    } else {
      onDateClicked(date);
    }
  };

  const isInsideRange = (date: Date) => {
    if (rangeSelect || cellSelect) {
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
            className={`border border-gray-100 dark:border-slate-700 flex text-sm cursor-pointer ${
              !isSameMonth(date, d) ? 'opacity-50' : ''
            }`}
            key={d.toISOString()}
            onClick={() => onCellClick(d)}
            onMouseEnter={() => setHoverDate(d)}
            onMouseLeave={() => setHoverDate(null)}
          >
            {cell && cell(d, isInsideRange(d) || false)}
          </div>
        );
      });
    }
  );

  const title = format(date, 'MM / yyyy');
  const weekDayLetters = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Son'];

  return (
    <div className=" w-full flex-grow flex flex-col">
      <div className="text-3xl font-bold flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={prevMonth}>
            <HiChevronLeft />
          </button>
          <label className="flex-grow text-center cursor-pointer">
            {title}
          </label>
          <button onClick={nextMonth}>
            <HiChevronRight />
          </button>
        </div>

        {header && header()}

        <div className="flex gap-2">
          {rightHeader && rightHeader()}
          <Button onClick={() => onCellClick(new Date())}>Today</Button>
        </div>
      </div>
      <div className="grid mt-4 grid-cols-7 flex-grow grid-rows-[3rem_auto]">
        {weekDayLetters.map((l) => (
          <div
            key={l}
            className={`text-sm border font-bold border-gray-100 dark:border-slate-700 p-2 flex items-center justify-center ${
              l.startsWith('S') ? 'bg-red-100 dark:bg-red-800/50' : ''
            }`}
          >
            {l}
          </div>
        ))}
        {weeks}
      </div>
    </div>
  );
}

export default Calendar;
