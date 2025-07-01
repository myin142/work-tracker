import { UserInfo } from '@myin/client';
import { useState } from 'react';
import { AiFillSetting } from 'react-icons/ai';
import {
  MdDarkMode,
  MdLightMode,
  MdOutlineDarkMode,
  MdOutlineLightMode,
} from 'react-icons/md';
import Button from '../components/button/button';

interface InfoProps {
  info?: UserInfo | null;
  darkMode?: boolean;
  isModeManual?: boolean;
  onLogout: () => void;
  onSetDarkMode: (darkMode?: boolean) => void;
}

function getModeIcon(darkMode?: boolean, isManual?: boolean) {
  if (isManual) {
    return darkMode ? <MdLightMode /> : <MdDarkMode />;
  }

  return darkMode ? <MdOutlineLightMode /> : <MdOutlineDarkMode />;
}

export function Info({
  info,
  darkMode,
  isModeManual,
  onLogout,
  onSetDarkMode,
}: InfoProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <div className="p-2 cursor-pointer" onClick={() => setVisible(!visible)}>
        <AiFillSetting />
      </div>
      {visible && (
        <div className="absolute bg-slate-100 drop-shadow-md dark:bg-slate-800 p-4 rounded flex flex-col gap-2 text-sm w-80">
          <div className="flex justify-between items-center">
            <div>{info?.email || '<EMPTY>'}</div>
            <Button
              onClick={() => onSetDarkMode(!darkMode)}
              onHold={() => onSetDarkMode(undefined)}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {getModeIcon(darkMode, isModeManual)}
            </Button>
          </div>
          <Button onClick={() => onLogout()}>Logout</Button>
        </div>
      )}
    </div>
  );
}
