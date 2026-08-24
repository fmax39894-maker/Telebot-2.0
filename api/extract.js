const {
  extractMedia
} = require("./extract-media");

module.exports =
  async function handler(
    req,
    res
  ) {

    if (
      req.method !==
      "GET"
    ) {
      return res
        .status(405)
        .json({
          ok: false,
          error:
            "Method not allowed"
        });
    }

    const url =
      req.query?.url;

    const type =
      req.query?.type;

    if (
      !url ||
      ![
        "image",
        "video"
      ].includes(type)
    ) {
      return res
        .status(400)
        .json({
          ok: false,

          usage:
            "/api/extract?type=image&url=https%3A%2F%2Fexample.com"
        });
    }

    try {
      const results =
        await extractMedia(
          url,
          type
        );

      return res
        .status(200)
        .json({
          ok: true,
          type,
          count:
            results.length,
          results
        });

    } catch (error) {
      console.error(
        "Extractor error:",
        error
      );

      return res
        .status(200)
        .json({
          ok: false,
          error:
            error.message
        });
    }
  };