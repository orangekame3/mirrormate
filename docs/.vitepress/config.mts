import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
    title: "Mirror Mate",
    description: "Self-hosted personalized AI in a mirror",
    base: "/mirrormate/",

    head: [
      ["link", { rel: "icon", href: "/mirrormate/favicon.ico" }],
    ],

    ignoreDeadLinks: [/localhost/],

    themeConfig: {
      logo: "/logo.png",

      nav: [
        { text: "Guide", link: "/guide/getting-started" },
        { text: "Config", link: "/config/providers" },
        { text: "GitHub", link: "https://github.com/orangekame3/mirrormate" },
      ],

      sidebar: {
        "/guide/": [
          {
            text: "Introduction",
            items: [
              { text: "Getting Started", link: "/guide/getting-started" },
              { text: "Architecture", link: "/guide/architecture" },
              { text: "Docker Setup", link: "/guide/docker" },
            ],
          },
          {
            text: "Features",
            items: [
              { text: "Memory System", link: "/guide/memory" },
              { text: "Animation States", link: "/guide/animation" },
              { text: "Discord Integration", link: "/guide/discord" },
            ],
          },
        ],
        "/config/": [
          {
            text: "Configuration",
            items: [
              { text: "Providers (LLM & TTS)", link: "/config/providers" },
              { text: "Features", link: "/config/features" },
              { text: "Character", link: "/config/character" },
              { text: "Plugins", link: "/config/plugins" },
              { text: "Rules & Modules", link: "/config/rules" },
              { text: "Tools", link: "/config/tools" },
            ],
          },
        ],
      },

      socialLinks: [
        { icon: "github", link: "https://github.com/orangekame3/mirrormate" },
      ],

      footer: {
        message: "Released under the MIT License.",
        copyright: "Copyright © 2024-2025 orangekame3",
      },

      search: {
        provider: "local",
      },
    },

    mermaid: {
      theme: "neutral",
    },
  })
);
