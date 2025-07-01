import {
  formatTime,
  parseTime,
  Project,
  WorkDay,
  WorkTime,
} from '@myin/models';
import { OffDutyReasonEnum } from '@myin/openapi';
import {
  add,
  format,
  intervalToDuration,
  isToday,
  startOfToday,
  sub,
} from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { FaCopy, FaUmbrellaBeach } from 'react-icons/fa';
import { HiEmojiSad, HiHome, HiMinus, HiPlus } from 'react-icons/hi';
import Button from '../components/button/button';
import Select from '../components/select/select';
import useKeyboardShortcut from './use-keyboard-shortcut';
import { parseWorkTimes } from '@myin/work-time-parser';
import { Diary } from './diary';

export interface WorkDialogProps {
  date: Date;
  workDay?: WorkDay | null;
  projects: Project[];
  onSave: (workDay: WorkDay) => void;
  onCopy: () => void;
  isCopying?: boolean;
  error?: string;
}

const formatDuration = (date: Date): string =>
  isToday(date) ? `${formatTime(date)} h` : `> 24 h`;

const intervalTotalTime = (intervals: Interval[]): Date =>
  intervals
    .map((i) => intervalToDuration(i))
    .reduce((date, dur) => add(date, dur), startOfToday());

export function WorkDialog({
  date,
  workDay,
  projects,
  onSave,
  onCopy,
  isCopying,
  error,
}: WorkDialogProps) {
  const [workTimeInput, setWorkTimeInput] = useState('');
  const [workTimes, setWorkTimes] = useState([] as WorkTime[]);
  const [sickLeave, setSickLeave] = useState(false);
  const [homeoffice, setHomeoffice] = useState(false);
  const [vacation, setVacation] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [offDutyReason, setOffDutyReason] = useState(
    null as OffDutyReasonEnum | null
  );
  const [diary, setDiary] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // useKeyboardShortcut(['Shift', 'w'], () => save());
  // useKeyboardShortcut(['y'], () => onCopy());
  // useKeyboardShortcut(['a'], () => setHomeOffice(!homeoffice));
  // useKeyboardShortcut(['s'], () => setSickLeave(!sickLeave));
  // useKeyboardShortcut(['d'], () => setVacation(!vacation));
  // useKeyboardShortcut(['i'], () => inputRef.current?.focus(), {
  //   overrideSystem: true,
  // });

  useEffect(() => {
    setWorkTimes((workDay?.workTimes || []).sort((a, b) => a.timeFrom.localeCompare(b.timeFrom)));
    setSickLeave(workDay?.sickLeave || false);
    setHomeoffice(workDay?.homeoffice || false);
    setVacation(workDay?.vacation || false);
    setOffDutyReason(workDay?.offDuty || null);
  }, [workDay]);

  const save = () => {
    onSave({
      date,
      workTimes,
      sickLeave,
      homeoffice,
      vacation,
      offDuty: offDutyReason ?? undefined,
    });
  };

  const addWorkTime = () => {
    const newWorkTimes = parseWorkTimes(workTimeInput);
    if (newWorkTimes.length > 0) {
      setWorkTimes([...workTimes, ...newWorkTimes]);
      setWorkTimeInput('');
    } else {
      setIsInvalid(true);
    }
  };

  const updateWorkTime = (index: number, value: Partial<WorkTime>) => {
    workTimes[index] = { ...workTimes[index], ...value };
    setWorkTimes([...workTimes]);
  };

  const removeWorkTime = (i: number) => {
    setWorkTimes(filterRemovedWorkTime(i));
  };

  const filterRemovedWorkTime = (idx: number) =>
    workTimes.filter((_, i) => i !== idx);

  const workTimeInputKeyUp = (event: React.KeyboardEvent) => {
    setIsInvalid(false);
    if (event.key === 'Enter') {
      addWorkTime();
    }
  };

  const workTimeIntervals = (): Interval[] =>
    workTimes.map((w) => ({
      start: parseTime(w.timeFrom),
      end: parseTime(w.timeTo),
    }));

  const breakIntervals = (): Interval[] =>
    workTimes
      .filter((w) => w.breakFrom && w.breakTo)
      .map((w) => ({
        start: parseTime(w.breakFrom),
        end: parseTime(w.breakTo),
      }));

  const totalTimes = (): string => {
    const time = intervalTotalTime(workTimeIntervals());
    const breakTime = intervalTotalTime(breakIntervals());
    const subtracted = sub(
      time,
      intervalToDuration({ start: startOfToday(), end: breakTime })
    );

    return `${formatDuration(subtracted)} / ${formatDuration(breakTime)}`;
  };

  return (
    <div>
      <h1 className="text-2xl py-2 leading-6 font-bold mb-2 flex justify-between">
        <span>{format(date, 'dd.MM.yyyy')}</span>
        <span>{totalTimes()}</span>
      </h1>

      <div className="flex flex-col gap-4">
        {workTimes.map((work, i) => (
          <div key={i} className="flex items-center gap-4">
            <div>
              {work.timeFrom} - {work.timeTo}
              {work.breakFrom &&
                work.breakTo &&
                ` / ${work.breakFrom} - ${work.breakTo}`}
            </div>
            <Select
              className="grow"
              selected={work.projectId}
              onSelected={(id) => updateWorkTime(i, { projectId: id })}
              disabled={workDay?.locked}
              options={projects.map((p) => ({
                value: p.id,
                label: `${p.name} - ${p.activeTo ? format(p.activeTo, 'yyyy-MM-dd HH:mm') : ''}`,
              }))}
            />
            <Button
              onClick={() => removeWorkTime(i)}
              disabled={workDay?.locked}
            >
              <HiMinus />
            </Button>
          </div>
        ))}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            className={`grow rounded-md outline-none ring-outset ring-1
                      bg-transparent p-2 focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        isInvalid
                          ? 'ring-red-400 focus-visible:ring-red-600'
                          : 'ring-slate-200 hover:ring-slate-400 focus-visible:ring-blue-500 dark:ring-slate-700 dark:hover:ring-slate-900'
                      }`}
            placeholder="Example: 8-17/12-13 or 8h/1h"
            value={workTimeInput}
            onChange={(e) => setWorkTimeInput(e.target.value)}
            onKeyUp={workTimeInputKeyUp}
          />
          <Button onClick={addWorkTime} disabled={workDay?.locked}>
            <HiPlus />
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-row justify-between items-center gap-2">
            <div className="flex gap-2 grow">
              <Button
                title="homeoffice"
                pressed={homeoffice}
                onClick={() => setHomeoffice(!homeoffice)}
                disabled={workDay?.locked}
              >
                <HiHome />
              </Button>
              <Button
                title="sick leave"
                pressed={sickLeave}
                onClick={() => setSickLeave(!sickLeave)}
                disabled={workDay?.locked}
              >
                <HiEmojiSad />
              </Button>
              <Button
                title="vacation"
                pressed={vacation}
                onClick={() => setVacation(!vacation)}
                disabled={workDay?.locked}
              >
                <FaUmbrellaBeach />
              </Button>

              {vacation && (
                <Select
                  selected={offDutyReason}
                  onSelected={(v) => setOffDutyReason(v)}
                  className="grow"
                  disabled={workDay?.locked}
                  options={[
                    { value: null, label: '<NONE>' },
                    ...Object.values(OffDutyReasonEnum).map((v) => ({
                      value: v,
                      label: v,
                    })),
                  ]}
                ></Select>
              )}
            </div>
            <div>
              <Button
                title="copy"
                onClick={() => onCopy()}
                pressed={isCopying}
                disabled={workDay?.locked}
              >
                <FaCopy />
              </Button>
            </div>
          </div>
          <Button onClick={() => save()} disabled={workDay?.locked}>
            Save
          </Button>
          <span className="text-red-700">{error}</span>

          <Diary text={diary} onChange={(x) => setDiary(x)} />
        </div>
      </div>
    </div>
  );
}

export default WorkDialog;
