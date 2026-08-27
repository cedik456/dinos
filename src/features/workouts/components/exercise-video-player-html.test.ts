import { nativeExerciseVideoSource } from "./exercise-video-player-html";

describe("native exercise video source", () => {
  it("gives provider embeds a stable HTTPS referrer identity", () => {
    const source = nativeExerciseVideoSource(
      "https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1",
      "Bench press demonstration",
    );

    expect(source.baseUrl).toBe("https://dino.local/");
    expect(source.html).toContain(
      'src="https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1"',
    );
    expect(source.html).toContain(
      '<meta name="referrer" content="strict-origin-when-cross-origin" />',
    );
  });

  it("escapes player values instead of rendering submitted markup", () => {
    const source = nativeExerciseVideoSource(
      'https://player.vimeo.com/video/123?value="<unsafe>"',
      'Title "><script>',
    );

    expect(source.html).not.toContain("<script>");
    expect(source.html).toContain("&quot;&lt;unsafe&gt;&quot;");
    expect(source.html).toContain("Title &quot;&gt;&lt;script&gt;");
  });
});
