/* =============================================================
   content.js — THE ONLY FILE YOU EDIT TO ADD A PROJECT OR POST

   Everything about a project or a post lives in one entry here:
   the card on the home page, the card on projects.html / blog.html,
   and the title, date and tags at the top of its own page.
   Edit it once, it changes everywhere.

   ---------------------------------------------------------------
   TO ADD A PROJECT
     1. Copy projects/project-template.html to projects/my-thing.html
        and write the body of the page.
     2. Add an entry to `projects` below with slug: 'my-thing'
        (the slug is the filename without .html).

   TO ADD A POST
     1. Copy posts/post-template.html to posts/my-post.html
        and write the body of the page.
     2. Add an entry to `posts` below with slug: 'my-post'.

   ---------------------------------------------------------------
   FIELDS (projects and posts share most of them)

     slug      required. The page's filename without .html, so
               slug: 'praxis' means projects/praxis.html, which is
               served live as /projects/praxis.
     title     shown on the card, as the page's <h1>, and in the
               browser tab.
     summary   one or two sentences. Shown on the card and, unless
               `description` is set, used as the page's
               <meta name="description">.
     description
               optional. A longer line for search results and link
               previews, when the card summary is too short for that.
     date      free text, shown exactly as written.
     tags      array of short strings. Shown on the card and under
               the page's title.
     featured  true puts it in the short list on the home page.
     image     projects only — path from the site root.
     imageAlt  projects only — describes the image for screen readers.
     readTime  posts only — e.g. '5 min read'. Leave out to hide it.

   The order of the entries below is the order they appear on the
   page. Newest first; to reorder, move an entry.
   ============================================================= */

window.SITE_CONTENT = {

  /* appended to the tab title of every project and post page */
  titleSuffix: ' — GabrielCaribé.com',

  /* TEMPORARY: true shows every post as "Coming soon" (cards and the
     post pages themselves): the title gets " — Coming soon" appended,
     the summary and body are hidden. Set to false to put the real
     summaries and post bodies back. A post with public: true is
     always shown in full. */
  postsComingSoon: true,

  /* ------------------------------------------------------ projects */
  projects: [

    {
      slug: 'Drone',
      title: 'Drone from Scratch',
      summary: 'Teaching myself robotics through building a quadcopter - components, CAD, and software done from scratch.',
      date: 'Sept. 2026',
      tags: ['Python', 'OnShape', 'Control Systems'],
      image: 'assets/img/dronev4.png',
      imageAlt: 'Drone from Scratch project',
      featured: true
    },

    {
      slug: 'praxis',
      title: 'Praxis',
      summary: 'An iPhone app that helps you create a schedule to accomplish your goals and stick to them.',
      date: 'July 2026',
      tags: ['TypeScript', 'APIs', 'Marketing'],
      image: 'assets/img/praxis.png',
      imageAlt: 'Praxis App',
      featured: true
    },

    {
      slug: 'CAN-RGX9',
      title: 'Cristar - CAN-RGX 9',
      summary: 'Shooting lasers and floating around in 0g.',
      date: 'Dec. 2025 - Sept. 2026',
      tags: ['Electrical Engineering', 'Physics Research'],
      image: 'assets/img/0g.jpg',
      imageAlt: 'Cristar CAN-RGX 9 experiment in zero gravity',
      featured: true
    }

  ],

  /* --------------------------------------------------------- posts */
  posts: [

    {
      slug: 'eat-frogs',
      title: 'How I Eat Frogs Everyday',
      summary: 'Coming soon.',
      date: 'October 04, 2026',
      tags: ['Productivity'],
      featured: true
    },

    {
      slug: 'blue-ocean-company',
      title: 'How to Build a Blue Ocean Company',
      summary: 'Summary of the frameworks presented in Blue Ocean Strategy by W. Chan Kim and Renée Maes.',
      date: 'August 03, 2026',
      tags: ['Business'],
      featured: true,
      public: true
    },

    {
      slug: 'zero-to-one',
      title: 'How to Build the Future: Going From 0 to 1',
      summary: 'Notes on Zero to One by Peter Thiel.',
      date: 'August 12, 2026',
      tags: ['Business'],
      featured: true
    },

    {
      slug: 'app-store-guide',
      title: 'App Store Submissions Guide',
      summary: 'How to get your app approved for the app store quickly and seamlessly.',
      description: 'A practical guide to navigating the App Store submission process, covering common pitfalls and approval requirements.',
      date: 'July 20, 2026',
      tags: ['App Development'],
      readTime: '5 min read',
      featured: true
    }

  ]
};
