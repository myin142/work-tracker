import { useEffect, useState } from 'react';
import Calendar from '../components/calendar/calendar';
import WorkDialog from './work-dialog';
import Button from '../components/button/button';
import Login from './login';
import {
  WorkDay,
  FullDayType,
  Project,
  formatDate,
  WorkTime,
  Holiday,
} from '@myin/models';
import { environment } from '../environments/environment';
import { IMSClient, UserInfo } from '@myin/client';
import { WorkCell } from './work-cell';
import {
  endOfMonth,
  Interval,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  isBefore,
} from 'date-fns';
import useKeyboardShortcut from './use-keyboard-shortcut';
import { Info } from './Info';
import { each, flatMap, groupBy, sum } from 'lodash';
import { getWorkHoursInMinutes } from '@myin/work-time-parser';
import { YearlySummary } from './yearly-summary';

const DARK_THEME_KEY = 'myin-work-tracker-dark-mode';
const LOGIN_TOKEN_KEY = 'myin-work-tracker-login-token';
const DAILY_TARGET_HOURS = 7;

export function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWorkDay, setCurrentWorkDay] = useState(null as WorkDay | null);
  const [fullDayType, setFullDayType] = useState(null as FullDayType | null);
  const [copyCell, setCopyCell] = useState(false);
  const [token, setToken] = useState(
    localStorage.getItem(LOGIN_TOKEN_KEY) || ''
  );
  const [error, setError] = useState('');

  const [calendarInterval, setCalendarInterval] = useState(
    null as Interval | null
  );
  const [workDays, setWorkDays] = useState({} as { [d: string]: WorkDay });
  const [projects, setProjects] = useState([] as Project[]);
  const [userInfo, setUserInfo] = useState(null as UserInfo | null);
  const [holidays, setHolidays] = useState({} as Record<string, Holiday>);
  const [darkMode, setDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [showSummary, setShowSummary] = useState(false);

  const hasWorkDays = Object.keys(workDays).length;
  const monthLocked = Object.values(workDays).some((day) => day.locked);
  const savedDarkMode = localStorage.getItem(DARK_THEME_KEY);

  useEffect(() => {
    if (savedDarkMode != null) {
      setDarkMode(savedDarkMode === 'true');
    }

    getClient()
      .getProjects()
      .then((p) => setProjects(p))
      .catch((err) => {
        console.warn('Failed to get projects', err);
      });

    getClient()
      .userInfo()
      .then((i) => setUserInfo(i))
      .catch((err) => {
        console.warn('Failed to user info', err);
      });

    loadHolidays(selectedDate);
  }, []);

  useKeyboardShortcut(['Shift', 'Enter'], () =>
    monthLocked ? withdrawMonth() : lockMonth()
  );
  useKeyboardShortcut(['Escape'], () => cancel());
  useKeyboardShortcut(['1'], () =>
    toggleFullDayType(Object.values(FullDayType)[0])
  );
  useKeyboardShortcut(['2'], () =>
    toggleFullDayType(Object.values(FullDayType)[1])
  );
  useKeyboardShortcut(['3'], () =>
    toggleFullDayType(Object.values(FullDayType)[2])
  );

  const getClient = () => new IMSClient(token, environment.baseUrl);

  const loadHolidays = async (date: Date) => {
    const holidays = await getClient().holidays(date);
    setHolidays(holidays);
  };

  const cancel = () => {
    setFullDayType(null);
    setCopyCell(false);
  };

  const onTokenLogin = (loginToken: string) => {
    localStorage.setItem(LOGIN_TOKEN_KEY, loginToken);
    setToken(loginToken);
  };

  const onTokenLogout = () => {
    localStorage.removeItem(LOGIN_TOKEN_KEY);
    setToken('');
  };

  const onDarkModeChange = (darkMode?: boolean) => {
    if (darkMode === undefined) {
      localStorage.removeItem(DARK_THEME_KEY);
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
      localStorage.setItem(DARK_THEME_KEY, darkMode ? 'true' : 'false');
      setDarkMode(darkMode);
    }
  };

  const onDateClicked = (d: Date) => {
    setCurrentWorkDay(workDays[formatDate(d)] || {});
    setSelectedDate(d);
  };

  const onRangeSelected = async (i: Interval) => {
    if (fullDayType) {
      console.log(fullDayType, i);
      try {
        await getClient().saveFullDay(fullDayType, i, Object.values(holidays));
      } catch (e) {
        console.log('Some full day request failed');
      }

      await loadWorkDays();
      setFullDayType(null);
    }
  };

  const onCellSelected = (date: Date) => {
    setCurrentWorkDay({
      ...(workDays[formatDate(date)] || {}),
      date,
    });
    setCopyCell(false);
  };

  const onDateChange = async (d: Date) => {
    onCalendarChange({ start: startOfMonth(d), end: endOfMonth(d) });
  };

  const onCalendarChange = async (i: Interval | null) => {
    if (i) {
      await loadWorkDays(i);
      await loadHolidays(new Date(i.start));
      if (!isWithinInterval(selectedDate, i)) {
        onDateClicked(new Date(i.start));
      }
    }
  };

  const loadWorkDays = async (i: Interval | null = calendarInterval) => {
    if (!i) {
      return;
    }

    const days = await getClient().getDays(i);

    const dayMap: { [d: string]: WorkDay } = {};
    days.forEach((day) => {
      dayMap[formatDate(day.date)] = day;

      if (currentWorkDay && isSameDay(day.date, currentWorkDay.date)) {
        setCurrentWorkDay(day);
      }
    });

    setWorkDays(dayMap);
    setCalendarInterval(i);
  };

  const saveDay = async (workDay: WorkDay) => {
    console.log(workDay);
    try {
      setError('');
      await getClient().saveDay(workDay, Object.values(holidays));
      await loadWorkDays();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleFullDayType = (type: FullDayType) => {
    if (fullDayType === type) {
      setFullDayType(null);
    } else {
      setFullDayType(type);
    }
  };

  const lockMonth = async () => {
    await getClient().lockDays(selectedDate);
    await loadWorkDays();
  };

  const withdrawMonth = async () => {
    await getClient().lockDays(selectedDate, true);
    await loadWorkDays();
  };

  const fullDayTypeButtons = Object.values(FullDayType).map((type) => (
    <Button
      key={type}
      onClick={() => toggleFullDayType(type)}
      pressed={fullDayType === type}
    >
      {type}
    </Button>
  ));

  const groupedMinutesForProjects = (workTime: WorkTime[]) => {
    const result: { projectId: number; time: number }[] = [];
    each(
      groupBy(workTime, (x) => x.projectId),
      (value, key) => {
        result.push({
          projectId: parseInt(key),
          time: getWorkHoursInMinutes(value),
        });
      }
    );
    return result;
  };

  const getMonthlySummary = () => {
    const homeoffice = Object.values(workDays).filter((d) => d.homeoffice);
    const vacation = Object.values(workDays).filter((d) => d.vacation);
    const dayHoursWorked = Object.values(workDays)
      .map((x) => getWorkHoursInMinutes(x.workTimes))
      .filter((x) => x > 0);

    const projectHours: Record<string, number> = {};
    const projectTimes = groupBy(
      flatMap(
        Object.values(workDays).map((d) =>
          groupedMinutesForProjects(d.workTimes)
        )
      ),
      (x) => x.projectId
    );
    Object.keys(projectTimes).forEach((project) => {
      const m = sum(projectTimes[project].map((x) => x.time));
      projectHours[project] = m / 60;
    });

    const monthlyTarget = DAILY_TARGET_HOURS * dayHoursWorked.length;
    const workedMinutes = sum(dayHoursWorked);
    const diff = workedMinutes - monthlyTarget * 60;

    return {
      target: monthlyTarget,
      diff: diff / 60,
      actual: workedMinutes / 60,
      homeoffice: homeoffice.length,
      vacation: vacation.length,
      projects: projectHours,
    };
  };

  const monthlySummary = getMonthlySummary();
  const lockButton = <Button onClick={() => lockMonth()}>Lock Month</Button>;
  const withDrawButton = (
    <Button onClick={() => withdrawMonth()}>Withdraw Month</Button>
  );
  const loginButton = <Login onLogin={(token) => onTokenLogin(token)} />;

  return (
    <div className={(darkMode ? 'dark' : '') + ' h-full'}>
      <div className="flex flex-row gap-4 p-4 h-full dark:bg-slate-900 dark:text-white/75">
        {(token && (
          <>
            <Calendar
              currentDate={selectedDate}
              rangeSelect={!!fullDayType}
              cellSelect={copyCell}
              onRangeSelected={onRangeSelected}
              onCellSelected={onCellSelected}
              onDateClicked={onDateClicked}
              onDateChange={onDateChange}
              cell={(d: Date, isSelected: boolean) => (
                <WorkCell
                  date={d}
                  holiday={holidays[formatDate(d)]}
                  day={workDays[formatDate(d)]}
                  isSelected={isSelected}
                  isOpen={isSameDay(selectedDate, d)}
                />
              )}
              rightHeader={() => (
                // eslint-disable-next-line react/jsx-no-useless-fragment
                <div className="basis-10 flex items-center text-lg">
                  <Info
                    info={userInfo}
                    darkMode={darkMode}
                    isModeManual={savedDarkMode != null}
                    onSetDarkMode={onDarkModeChange}
                    onLogout={onTokenLogout}
                  />
                  <Button onClick={() => setShowSummary(!showSummary)}>
                    Summary
                  </Button>
                </div>
              )}
              header={() => (
                <div className="flex gap-2 items-center">
                  {fullDayTypeButtons}
                </div>
              )}
            />

            <div className="w-1/2 flex flex-col gap-2">
              <div className=" grow flex flex-col justify-between">
                <WorkDialog
                  date={selectedDate}
                  workDay={currentWorkDay}
                  projects={projects.filter(
                    (p) => !p.activeTo || isBefore(selectedDate, p.activeTo)
                  )}
                  onSave={saveDay}
                  onCopy={() => setCopyCell(!copyCell)}
                  isCopying={copyCell}
                  error={error}
                />

                <div className="text-sm text-slate-500">
                  <div>
                    Hours: {monthlySummary.actual} / {monthlySummary.target}
                  </div>
                  <ul>
                    {Object.keys(monthlySummary.projects).map((p) => (
                      <li className="px-2 text-slate-400">
                        {projects.find((x) => x.id === parseInt(p))?.name}:{' '}
                        {monthlySummary.projects[p]}
                      </li>
                    ))}
                  </ul>
                  <div>Diff: {monthlySummary.diff}</div>
                  <div>Homeoffice: {monthlySummary.homeoffice}</div>
                  <div>Vacation: {monthlySummary.vacation}</div>
                </div>

                {(hasWorkDays &&
                  ((monthLocked && withDrawButton) || lockButton)) ||
                  ''}
              </div>
            </div>

            <YearlySummary
              open={showSummary}
              date={selectedDate}
              client={getClient()}
            />
          </>
        )) ||
          loginButton}
      </div>
    </div>
  );
}

export default App;
