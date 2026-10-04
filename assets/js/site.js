/* =============================================================
   site.js — turns the entries in content.js into markup

   You should not need to edit this file to add a project or a post.
   It does two things:

   1. Fills every list container on a page:
        <div class="grid-projects" data-list="projects"></div>
        <div class="post-list" data-list="posts" data-featured data-limit="3"></div>
      data-featured keeps only entries marked featured: true.
      data-limit caps how many are shown.

   2. On a project or post page, works out which entry the page is
      (from its filename) and fills the placeholders in it:
        <h1 data-field="title"></h1>
        <span data-field="date"></span>
        <span data-field="readtime"></span>
        <span class="tags" data-field="tags"></span>
        <span data-field="next"></span>
      …plus the browser tab title and the meta description.

      A placeholder with no matching entry is left exactly as it is,
      which is what keeps the template pages readable on their own.

   Loaded from <head>, after content.js and before main.js, so the
   cards exist by the time main.js sets up the scroll reveals.
   ============================================================= */
(function () {
  'use strict';

  var data = window.SITE_CONTENT || {};
  var suffix = data.titleSuffix || '';

  /* Path back to the site root, read off this script's own src, so one
     set of data works from the root and from projects/ and posts/. */
  var mySrc = (document.currentScript && document.currentScript.getAttribute('src')) || '';
  var BASE = mySrc.replace(/assets\/js\/site\.js.*$/, '');

  /* postsComingSoon in content.js: every post keeps its slug, date and
     tags but shows "Coming soon" in place of its title and text */
  var COMING_SOON = 'Coming soon';
  var posts = (data.posts || []).map(function (item) {
    if (!data.postsComingSoon) return item;
    return { slug: item.slug, date: item.date, tags: item.tags, featured: item.featured, title: item.title + ' — ' + COMING_SOON };
  });

  var COLLECTIONS = {
    projects: { items: data.projects || [], dir: 'projects/', nextLabel: 'Next project' },
    posts:    { items: posts,               dir: 'posts/',    nextLabel: 'Next post' }
  };

  /* ------------------------------------------------------- helpers */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  function hrefFor(collection, item) {
    return BASE + COLLECTIONS[collection].dir + item.slug;
  }

  function fillTags(node, tags) {
    node.textContent = '';
    each(tags || [], function (t) { node.appendChild(el('span', 'tag', t)); });
  }

  /* ------------------------------------- which entry is this page? */

  var here = (function () {
    /* the .html is optional: the deployed site serves extensionless URLs */
    var m = /\/(projects|posts)\/([^\/?#]+?)(?:\.html?)?$/i.exec(location.pathname);
    if (!m) return null;

    var collection = m[1].toLowerCase();
    var slug = decodeURIComponent(m[2]).toLowerCase();
    var items = COLLECTIONS[collection].items;

    for (var i = 0; i < items.length; i++) {
      if (String(items[i].slug).toLowerCase() === slug) {
        return { collection: collection, item: items[i], index: i };
      }
    }
    return null;
  })();

  /* ------------------------------ tab title + description, in <head> */

  if (here) {
    document.title = here.item.title + suffix;

    var description = here.item.description || here.item.summary;
    if (description) {
      var meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
  }

  /* --------------------------------------------------- list rendering */

  function projectCard(item) {
    var card = el('a', 'panel project-card reveal');
    card.href = hrefFor('projects', item);

    var thumb = el('div', 'thumb');
    if (item.image) {
      var img = document.createElement('img');
      img.src = BASE + item.image;
      img.alt = item.imageAlt || item.title || '';
      thumb.appendChild(img);
    } else {
      thumb.appendChild(el('span', 'placeholder-tag', 'Image 16:10'));
    }
    card.appendChild(thumb);

    var body = el('div', 'card-body');
    body.appendChild(el('h3', null, item.title || ''));
    if (item.summary) body.appendChild(el('p', null, item.summary));

    var tags = el('div', 'tags');
    fillTags(tags, item.tags);
    body.appendChild(tags);

    var meta = el('div', 'card-meta');
    meta.appendChild(el('span', null, item.date || ''));
    meta.appendChild(el('span', null, 'Take a look →'));
    body.appendChild(meta);

    card.appendChild(body);
    return card;
  }

  function postRow(item) {
    var row = el('a', 'post-row reveal');
    row.href = hrefFor('posts', item);

    row.appendChild(el('span', 'post-date', item.date || ''));

    var main = el('div', 'post-main');
    main.appendChild(el('h3', null, item.title || ''));
    if (item.summary) main.appendChild(el('p', null, item.summary));
    row.appendChild(main);

    var tags = el('div', 'tags');
    fillTags(tags, item.tags);
    row.appendChild(tags);

    return row;
  }

  function renderLists() {
    each(document.querySelectorAll('[data-list]'), function (node) {
      var name = node.getAttribute('data-list');
      var collection = COLLECTIONS[name];
      if (!collection) return;

      var items = collection.items.slice();

      if (node.hasAttribute('data-featured')) {
        items = items.filter(function (item) { return item.featured; });
      }

      var limit = parseInt(node.getAttribute('data-limit'), 10);
      if (limit > 0) items = items.slice(0, limit);

      node.textContent = '';
      each(items, function (item) {
        node.appendChild(name === 'projects' ? projectCard(item) : postRow(item));
      });
    });
  }

  /* ------------------------------------- project / post page fields */

  function fillNext(node) {
    var collection = COLLECTIONS[here.collection];
    /* wrap around to the first entry so the link is never a dead end */
    var next = collection.items[here.index + 1] || collection.items[0];

    node.textContent = '';
    if (!next || next === here.item) return;

    var link = el('a', 'link-more');
    link.href = hrefFor(here.collection, next);
    link.appendChild(document.createTextNode(collection.nextLabel + ' '));
    link.appendChild(el('span', null, '→'));
    node.appendChild(link);
  }

  function fillFields() {
    if (!here) return;

    var item = here.item;
    var text = {
      title: item.title,
      date: item.date,
      summary: item.summary,
      readtime: item.readTime
    };

    each(document.querySelectorAll('[data-field]'), function (node) {
      var field = (node.getAttribute('data-field') || '').toLowerCase();

      if (field === 'tags') { fillTags(node, item.tags); return; }
      if (field === 'next') { fillNext(node); return; }
      if (!(field in text)) return;

      if (text[field]) node.textContent = text[field];
      /* an optional field with nothing to show leaves no empty slot */
      else if (field === 'readtime' || field === 'summary') node.remove();
    });

    if (data.postsComingSoon && here.collection === 'posts') {
      each(document.querySelectorAll('.prose'), function (node) {
        node.textContent = '';
        node.appendChild(el('p', 'lede', COMING_SOON + '.'));
      });
    }
  }

  /* ------------------------------------------------------------ go */

  function start() {
    renderLists();
    fillFields();

    /* the cards are born with class="reveal", so they start invisible until
       something observes them — main.js normally does, this covers the case
       where it has already been past */
    if (typeof window.siteInitReveals === 'function') window.siteInitReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
