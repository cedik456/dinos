import { IdentityException } from '../identity/identity-errors';
import { parseExerciseVideoUrl } from './exercise-video';

describe('parseExerciseVideoUrl', () => {
  it.each([
    [
      'https://www.youtube.com/watch?v=abcdefghijk',
      'youtube',
      'abcdefghijk',
      'https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1',
    ],
    [
      'https://youtu.be/abcdefghijk',
      'youtube',
      'abcdefghijk',
      'https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1',
    ],
    [
      'https://www.youtube.com/shorts/abcdefghijk',
      'youtube',
      'abcdefghijk',
      'https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1',
    ],
    [
      'https://vimeo.com/123456789',
      'vimeo',
      '123456789',
      'https://player.vimeo.com/video/123456789?dnt=1',
    ],
  ])('normalizes %s', (url, provider, videoId, embedUrl) => {
    expect(parseExerciseVideoUrl(url)).toMatchObject({
      provider,
      videoId,
      embedUrl,
    });
  });

  it.each([
    'http://youtube.com/watch?v=abcdefghijk',
    'https://youtube.com/playlist?list=PL123',
    'https://youtube.com/live/abcdefghijk',
    'https://youtube.com/@channel',
    'https://example.com/video',
    'not a url',
  ])('rejects %s without echoing the private value', (url) => {
    try {
      parseExerciseVideoUrl(url);
      throw new Error('Expected validation failure.');
    } catch (error) {
      expect(error).toBeInstanceOf(IdentityException);
      expect((error as Error).message).not.toContain(url);
    }
  });
});
