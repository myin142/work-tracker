import { IMSClient } from '@myin/client';
import { getWorkHoursInMinutes } from '@myin/work-time-parser';
import { endOfYear, startOfYear } from 'date-fns';
import { useEffect, useState } from 'react';

interface YearlySummaryProps {
  open: boolean;
  client: IMSClient;
  date: Date;
}

interface Summary {
  totalDays: number;
  workedDays: number;
  vacationDays: number;
  sickDays: number;
  homeOfficeDays: number;
  offDutyDays: number;
  totalHours: number;
  averageHoursPerDay: number;
  monthlyHours: Record<number, Record<string, number>>;
  averageHoursPerMonth: number;
}

export function YearlySummary({ open, client, date }: Readonly<YearlySummaryProps>) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (open) {
      client
        .getDays({ start: startOfYear(date), end: endOfYear(date) })
        .then((days) => {
          const totalDays = days.length;
          const workedDays = days.filter((day) => day.workTimes.length).length;
          const totalHours = days
            .map((day) => getWorkHoursInMinutes(day.workTimes) / 60)
            .reduce((prev, curr) => prev + curr, 0);
          const averageHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

          const vacationDays = days.filter((day) => day.vacation).length;
          const sickDays = days.filter((day) => day.sickLeave).length;
          const homeOfficeDays = days.filter((day) => day.homeoffice).length;
          const offDutyDays = days.filter((day) => day.offDuty).length;

          const monthlyHours = days.reduce((acc, day) => {
            const month = day.date.getMonth();
            if (!acc[month])
              acc[month] = { hours: 0, vacation: 0, home: 0, sick: 0, off: 0 };

            acc[month]['hours'] += getWorkHoursInMinutes(day.workTimes) / 60;
            acc[month]['vacation'] += day.vacation ? 1 : 0;
            acc[month]['home'] += day.homeoffice ? 1 : 0;
            acc[month]['sick'] += day.sickLeave ? 1 : 0;
            acc[month]['off'] += day.offDuty ? 1 : 0;
            return acc;
          }, {} as Record<number, Record<string, number>>);

          const averageHoursPerMonth =
            Object.values(monthlyHours).reduce(
              (sum, m) => sum + m['hours'],
              0
            ) /
            Object.keys(monthlyHours).filter(
              (x: any) => monthlyHours[x]['hours'] > 0
            ).length;

          setSummary({
            totalDays,
            workedDays,
            vacationDays,
            sickDays,
            homeOfficeDays,
            offDutyDays,
            totalHours,
            monthlyHours,
            averageHoursPerDay,
            averageHoursPerMonth,
          });
        });
    }
  }, [open]);

  return (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <>
      {open && (
        <div className="flex flex-col items-center justify-center fixed bg-gray-100 dark:bg-gray-900 p-4 drop-shadow-xl">
          <h1 className="text-2xl font-bold mb-4">Yearly Summary</h1>
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md w-full max-w-md">
            {summary ? (
              <div className="space-y-2">
                <div>
                  Total Days: {summary.totalDays}
                  <ul className='list-disc pl-5'>
                    <li>Work: {summary.workedDays}</li>
                    <li>Vacation: {summary.vacationDays}</li>
                    <li>Sick: {summary.sickDays}</li>
                    <li>Home Office: {summary.homeOfficeDays}</li>
                    <li>Off Duty: {summary.offDutyDays}</li>
                  </ul>
                </div>
                <div>Total Hours: {summary.totalHours}</div>
                <div>Average / Day: {summary.averageHoursPerDay.toFixed(2)}h</div>
                <div>Average / Month: {summary.averageHoursPerMonth.toFixed(2)}h</div>
                <div className="mt-4">
                  Monthly Hours:
                  <ul className="list-disc pl-5">
                    {Object.entries(summary.monthlyHours).map(([month, m]) => (
                      <li key={month}>
                        {new Date(
                          date.getFullYear(),
                          Number(month)
                        ).toLocaleString('default', { month: 'long' })}
                        : {m['hours']}h, Vacation: {m['vacation']}, Home:{' '}
                        {m['home']}, Sick: {m['sick']}, Off: {m['off']}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Loading summary...</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
