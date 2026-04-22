import { type LanguageList } from './../types';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);

export interface FormatOpt {
  canUseAgo: boolean;
  canUseBefore: boolean;
  resultOpt: {
    max: number;
    min: number;
  };
}
const timeLocaleConfig = {
  zh: {
    locale: 'zh',
    relativeTime: {
      future: '%s后',
      past: '%s前',
      s: '几秒',
      m: '1 分钟',
      mm: '%d 分钟',
      h: '1 小时',
      hh: '%d 小时',
      d: '1 天',
      dd: '%d 天',
      M: '1 个月',
      MM: '%d 个月',
      y: '1 年',
      yy: '%d 年',
    },
    longFormat: 'YYYY 年 M 月 D 日',
  },
  en: {
    locale: 'en',
    relativeTime: {
      future: 'in %s',
      past: '%s ago',
      s: 'a few seconds',
      m: 'a minute',
      mm: '%d minutes',
      h: 'an hour',
      hh: '%d hours',
      d: 'a day',
      dd: '%d days',
      M: 'a month',
      MM: '%d months',
      y: 'a year',
      yy: '%d years',
    },
    longFormat: 'MMMM D, YYYY',
  },
} as const;

export function formatTime(
  date: string | number | Date,
  language: (typeof LanguageList)[number],
  opt: FormatOpt = {
    canUseAgo: true,
    canUseBefore: true,
    resultOpt: { max: 20, min: 0 },
  },
): string {
  const config = timeLocaleConfig[language];
  dayjs.locale(config.locale);

  const targetDate = dayjs(date);
  const now = dayjs();

  const diffMs = now.diff(targetDate);
  const diffDays = Math.abs(diffMs) / (1000 * 60 * 60 * 24);

  if (diffDays > 2) {
    return targetDate.format(config.longFormat);
  }

  let result = targetDate.fromNow();
  if (result.length < opt.resultOpt.min) {
    const spacesToAdd = opt.resultOpt.min - result.length;
    result = ' '.repeat(spacesToAdd) + result;
  }
  if (opt.resultOpt.max > 0 && result.length > opt.resultOpt.max) {
    if (language === 'zh') {
      result = targetDate.format('MM-DD HH:mm');
    } else {
      result = targetDate.format('MM-DD HH:mm');
    }
  }

  if (!opt.canUseAgo) {
    if (language === 'en') {
      result = result.replace(' ago', '').replace('in ', '');
    }
  }

  if (!opt.canUseBefore) {
    if (language === 'en') {
      if (!opt.canUseAgo) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
          result = `${hours}h`;
        } else if (minutes > 0) {
          result = `${minutes}m`;
        } else {
          result = 'just now';
        }
      }
    }
  }

  return result;
}
