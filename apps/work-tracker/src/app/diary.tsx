import { useCallback, useEffect, useState } from 'react';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { debounce } from 'lodash';
import { environment } from '../environments/environment';

const DIARY_STORAGE_KEY = 'myin-work-tracker-diary-cache';

interface DiaryProps {
  text: string;
  onChange: (s: string) => void;
}

export function Diary({ text, onChange }: DiaryProps) {
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const value = localStorage.getItem(DIARY_STORAGE_KEY);
    if (value) {
      onChange(value);
    }
  }, []);

  const saveCache = debounce(
    () => localStorage.setItem(DIARY_STORAGE_KEY, text),
    500
  );

  useEffect(() => {
    saveCache();
  }, [text]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        {showPreview ? (
          <HiEyeOff
            className="cursor-pointer"
            onClick={() => setShowPreview(false)}
          />
        ) : (
          <HiEye
            className="cursor-pointer"
            onClick={() => setShowPreview(true)}
          />
        )}
      </div>
      {showPreview ? (
        <MarkdownPreview source={text} />
      ) : (
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Dear Diary..."
          className="border rounded p-2 bg-transparent dark:border-slate-700"
          rows={15}
        />
      )}

      <div>
        Submit Diary here:{' '}
        <a
          className="text-blue-600"
          target="_blank"
          href={environment.baseUrl + '/journal/edit'}
          rel="noreferrer"
        >
          IMS
        </a>
      </div>
    </div>
  );
}
