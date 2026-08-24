const axios = require("axios");

function absoluteUrl(base, value) {
  if (!value) return null;

  try {
    const url = new URL(
      String(value).replace(/&amp;/g, "&"),
      base
    );

    if (!/^https?:$/i.test(url.protocol)) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function contentType(value) {
  return String(value || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function typeFromContentType(value) {
  const type = contentType(value);

  if (type.startsWith("image/")) {
    return "image";
  }

  if (
    type.startsWith("video/") ||
    type === "application/vnd.apple.mpegurl" ||
    type === "application/x-mpegurl"
  ) {
    return "video";
  }

  return null;
}

function typeFromExtension(url) {
  try {
    const pathname =
      new URL(url).pathname.toLowerCase();

    if (
      /\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/.test(
        pathname
      )
    ) {
      return "image";
    }

    if (
      /\.(mp4|webm|mov|m4v|mkv|avi|m3u8)$/.test(
        pathname
      )
    ) {
      return "video";
    }
  } catch {}

  return null;
}

/*
 * Check whether a URL is actually a public
 * image/video URL.
 *
 * The extension is NOT required.
 *
 * Example:
 *
 * https://example.com/file?id=123&token=abc
 *
 * can still be detected from:
 *
 * Content-Type: video/mp4
 */
async function verifyMedia(url) {
  try {
    const response = await axios.head(url, {
      timeout: 6000,
      maxRedirects: 8,

      headers: {
        "User-Agent":
          "Mozilla/5.0 GrandXBot/9.0",
        Accept: "*/*"
      },

      validateStatus:
        status =>
          status >= 200 &&
          status < 400
    });

    const type =
      typeFromContentType(
        response.headers["content-type"]
      );

    if (type) {
      return {
        type,
        url:
          response.request?.res
            ?.responseUrl || url
      };
    }
  } catch {}

  /*
   * Some servers don't support HEAD.
   * Try a small GET request.
   */

  try {
    const response = await axios.get(
      url,
      {
        timeout: 7000,
        maxRedirects: 8,
        responseType: "stream",

        headers: {
          "User-Agent":
            "Mozilla/5.0 GrandXBot/9.0",
          Accept: "*/*",
          Range: "bytes=0-1023"
        },

        validateStatus:
          status =>
            status >= 200 &&
            status < 400
      }
    );

    const type =
      typeFromContentType(
        response.headers["content-type"]
      );

    if (response.data?.destroy) {
      response.data.destroy();
    }

    if (type) {
      return {
        type,
        url:
          response.request?.res
            ?.responseUrl || url
      };
    }
  } catch {}

  /*
   * Filename fallback.
   */
  const fallback =
    typeFromExtension(url);

  if (fallback) {
    return {
      type: fallback,
      url
    };
  }

  return null;
}

/*
 * Extract media URLs from normal HTML.
 */
function extractHtml(
  html,
  baseUrl
) {
  const cheerio =
    require("cheerio");

  const $ =
    cheerio.load(html);

  const urls =
    new Set();

  function add(value) {
    const url =
      absoluteUrl(
        baseUrl,
        value
      );

    if (url) {
      urls.add(url);
    }
  }

  // Images
  $("img").each(
    (_, element) => {
      [
        "src",
        "data-src",
        "data-original",
        "data-lazy-src",
        "data-url",
        "data-image",
        "data-original-src"
      ].forEach(
        attribute => {
          add(
            $(element).attr(
              attribute
            )
          );
        }
      );

      const srcset =
        $(element).attr(
          "srcset"
        ) ||
        $(element).attr(
          "data-srcset"
        );

      if (srcset) {
        srcset
          .split(",")
          .forEach(item => {
            add(
              item
                .trim()
                .split(/\s+/)[0]
            );
          });
      }
    }
  );

  // Videos
  $(
    "video, video source, source"
  ).each(
    (_, element) => {
      add(
        $(element).attr(
          "src"
        )
      );

      add(
        $(element).attr(
          "data-src"
        )
      );
    }
  );

  // OpenGraph / Twitter
  $(
    'meta[property="og:image"],' +
    'meta[name="twitter:image"],' +
    'meta[name="twitter:image:src"],' +
    'meta[property="og:video"],' +
    'meta[property="og:video:url"],' +
    'meta[name="twitter:player:stream"]'
  ).each(
    (_, element) => {
      add(
        $(element).attr(
          "content"
        )
      );
    }
  );

  /*
   * URLs embedded in JSON or JavaScript.
   */
  const matches =
    String(html).match(
      /https?:\/\/[^"'\\<>\s]+/g
    ) || [];

  for (const match of matches) {
    add(
      match.replace(
        /[),.;]+$/,
        ""
      )
    );
  }

  return [...urls];
}

/*
 * JavaScript/browser extraction.
 *
 * Requires:
 *
 * npm install playwright
 */
async function browserExtract(
  url
) {
  let chromium;

  try {
    chromium =
      require("playwright")
        .chromium;
  } catch {
    console.log(
      "Playwright is not installed."
    );

    return [];
  }

  const browser =
    await chromium.launch({
      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]
    });

  try {
    const page =
      await browser.newPage({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
      });

    const networkUrls =
      new Set();

    /*
     * Observe public media responses.
     */
    page.on(
      "response",
      response => {
        try {
          const type =
            typeFromContentType(
              response.headers()[
                "content-type"
              ]
            );

          if (type) {
            networkUrls.add(
              response.url()
            );
          }
        } catch {}
      }
    );

    await page.goto(
      url,
      {
        waitUntil:
          "domcontentloaded",
        timeout: 20000
      }
    ).catch(() => {});

    /*
     * Allow JavaScript-rendered
     * content to appear.
     */
    await page
      .waitForTimeout(2500);

    const domUrls =
      await page.evaluate(
        () => {
          const result =
            [];

          function add(value) {
            if (value) {
              result.push(
                value
              );
            }
          }

          document
            .querySelectorAll(
              "img"
            )
            .forEach(
              element => {
                [
                  "src",
                  "data-src",
                  "data-original",
                  "data-lazy-src"
                ].forEach(
                  attribute => {
                    add(
                      element.getAttribute(
                        attribute
                      )
                    );
                  }
                );

                const srcset =
                  element.getAttribute(
                    "srcset"
                  ) ||
                  element.getAttribute(
                    "data-srcset"
                  );

                if (srcset) {
                  srcset
                    .split(",")
                    .forEach(
                      item => {
                        add(
                          item
                            .trim()
                            .split(
                              /\s+/
                            )[0]
                        );
                      }
                    );
                }
              }
            );

          document
            .querySelectorAll(
              "video, video source, source"
            )
            .forEach(
              element => {
                add(
                  element.getAttribute(
                    "src"
                  )
                );
              }
            );

          document
            .querySelectorAll(
              'meta[property="og:image"],' +
              'meta[name="twitter:image"],' +
              'meta[property="og:video"],' +
              'meta[property="og:video:url"],' +
              'meta[name="twitter:player:stream"]'
            )
            .forEach(
              element => {
                add(
                  element.getAttribute(
                    "content"
                  )
                );
              }
            );

          return result;
        }
      );

    const all =
      [
        ...networkUrls,
        ...domUrls
      ];

    return [
      ...new Set(
        all
          .map(
            item =>
              absoluteUrl(
                url,
                item
              )
          )
          .filter(Boolean)
      )
    ];

  } finally {
    await browser.close();
  }
}

/*
 * Main extractor.
 */
async function extractMedia(
  url,
  wantedType
) {
  /*
   * 1. Is the supplied URL itself
   *    a direct media URL?
   */
  const direct =
    await verifyMedia(
      url
    );

  if (
    direct &&
    direct.type ===
      wantedType
  ) {
    return [direct];
  }

  const candidates =
    new Set();

  /*
   * 2. Normal HTML.
   */
  try {
    const response =
      await axios.get(
        url,
        {
          timeout: 10000,
          maxRedirects: 8,
          responseType: "text",

          headers: {
            "User-Agent":
              "Mozilla/5.0 GrandXBot/9.0",

            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          },

          validateStatus:
            status =>
              status >= 200 &&
              status < 400
        }
      );

    const finalUrl =
      response.request
        ?.res
        ?.responseUrl ||
      url;

    const found =
      extractHtml(
        response.data,
        finalUrl
      );

    found.forEach(
      item =>
        candidates.add(item)
    );

  } catch (error) {
    console.log(
      "HTML extraction:",
      error.message
    );
  }

  /*
   * 3. JavaScript browser.
   */
  try {
    const found =
      await browserExtract(
        url
      );

    found.forEach(
      item =>
        candidates.add(item)
    );

  } catch (error) {
    console.log(
      "Browser extraction:",
      error.message
    );
  }

  /*
   * 4. Verify candidates.
   */
  const results =
    [];

  for (
    const candidate of
      [...candidates].slice(
        0,
        40
      )
  ) {
    const verified =
      await verifyMedia(
        candidate
      );

    if (
      verified &&
      verified.type ===
        wantedType
    ) {
      results.push(
        verified
      );
    }

    if (
      results.length >= 5
    ) {
      break;
    }
  }

  return results;
}

module.exports = {
  extractMedia,
  verifyMedia
};