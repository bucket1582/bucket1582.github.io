module.exports = function (eleventyConfig) {
    eleventyConfig.setBrowserSyncConfig({
      files: './public/static/**/*.scss',
    });
    eleventyConfig.addPassthroughCopy("src/img");
  
    return {
      dir: {
        input: 'src',
        output: 'public',
      },
    };
  };