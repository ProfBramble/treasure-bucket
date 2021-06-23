require(`dotenv`).config({
  path: `.env`,
})

const shouldAnalyseBundle = process.env.ANALYSE_BUNDLE

module.exports = {
  siteMetadata: {
    siteTitleAlt: `ProfBramble -- Blog`,
    siteTitle: `treasure-bucket`,
    siteImage: `./static/android-chrome-192x192`,
    author: `ProfBramble`
  },
  plugins: [
    {
      resolve: `@lekoarts/gatsby-theme-minimal-blog`,
      // See the theme's README for all available options

      options: {
        navigation: [
          {
            title: `Blog`,
            slug: `/treasure-bucket/blog`,
          },
          {
            title: `About`,
            slug: `/treasure-bucket/about`,
          },
        ],
        externalLinks: [
          {
            name: `知乎`,
            url: `https://www.zhihu.com/people/prof-bramble`,
          },
          {
            name: `掘金`,
            url: `https://juejin.cn/user/3491704661881629`,
          },
        ],
        feedTitle: 'ProfBramble -- Blog'
      },
    },
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: process.env.GOOGLE_ANALYTICS_ID,
      },
    },
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `minimal-blog - @lekoarts/gatsby-theme-minimal-blog`,
        short_name: `ProfBramble -- Blog`,
        description: `总结,积累,分享,传播知识 ~ 不积跬步,无以至千里.不积小流,无以成江海.`,
        start_url: `/`,
        background_color: `#fff`,
        theme_color: `#1890FF`,
        display: `standalone`,
        icons: [
          {
            src: `/android-chrome-192x192.png`,
            sizes: `192x192`,
            type: `image/png`,
          },
          {
            src: `/android-chrome-512x512.png`,
            sizes: `512x512`,
            type: `image/png`,
          },
        ],
      },
    },
    `gatsby-plugin-offline`,
    `gatsby-plugin-gatsby-cloud`,
    `gatsby-plugin-netlify`,
    shouldAnalyseBundle && {
      resolve: `gatsby-plugin-webpack-bundle-analyser-v2`,
      options: {
        analyzerMode: `static`,
        reportFilename: `_bundle.html`,
        openAnalyzer: false,
      },
    },
  ].filter(Boolean),
}
