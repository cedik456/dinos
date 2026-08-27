import { HttpStatus } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';
import type { ExerciseVideoPreviewDto } from './template.types';

function invalid(): never {
  throw new IdentityException(
    'VALIDATION_FAILED',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Enter an individual YouTube or Vimeo video link.',
  );
}

function validId(value: string): boolean {
  return /^[A-Za-z0-9_-]{6,20}$/.test(value);
}

export function parseExerciseVideoUrl(url: string): ExerciseVideoPreviewDto {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return invalid();
  }
  if (parsed.protocol !== 'https:') return invalid();
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'youtu.be') {
    const videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    if (
      !validId(videoId) ||
      parsed.pathname.split('/').filter(Boolean).length !== 1
    ) {
      return invalid();
    }
    return youtube(videoId);
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parsed.pathname === '/watch') {
      if (parsed.searchParams.has('list')) return invalid();
      const videoId = parsed.searchParams.get('v') ?? '';
      if (!validId(videoId)) return invalid();
      return youtube(videoId);
    }
    if (parts.length === 2 && parts[0] === 'shorts' && validId(parts[1])) {
      return youtube(parts[1]);
    }
    return invalid();
  }

  if (host === 'vimeo.com') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length !== 1 || !/^\d{6,12}$/.test(parts[0])) return invalid();
    return vimeo(parts[0]);
  }

  if (host === 'player.vimeo.com') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (
      parts.length !== 2 ||
      parts[0] !== 'video' ||
      !/^\d{6,12}$/.test(parts[1])
    ) {
      return invalid();
    }
    return vimeo(parts[1]);
  }
  return invalid();
}

function youtube(videoId: string): ExerciseVideoPreviewDto {
  return {
    provider: 'youtube',
    videoId,
    canonicalSourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1`,
  };
}

function vimeo(videoId: string): ExerciseVideoPreviewDto {
  return {
    provider: 'vimeo',
    videoId,
    canonicalSourceUrl: `https://vimeo.com/${videoId}`,
    embedUrl: `https://player.vimeo.com/video/${videoId}?dnt=1`,
  };
}
