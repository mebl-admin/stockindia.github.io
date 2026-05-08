(function () {
  var BLOG_DATA_PATH = "documents/blogs.json";

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-blog-page");
    if (!page) {
      return;
    }

    loadPosts()
      .then(function (posts) {
        if (page === "listing") {
          renderListingPage(posts);
        }
        if (page === "detail") {
          renderDetailPage(posts);
        }
      })
      .catch(function (error) {
        console.error("Unable to load blog content.", error);
        if (page === "listing") {
          renderListingError();
        }
        if (page === "detail") {
          renderDetailError("We could not load this story right now. Please try again in a moment.");
        }
      });
  });

  function loadPosts() {
    return fetch(BLOG_DATA_PATH, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Blog data request failed.");
        }
        return response.json();
      })
      .then(function (data) {
        var posts = Array.isArray(data.posts) ? data.posts.slice() : [];
        return posts
          .map(function (post) {
            var searchableSections = Array.isArray(post.sections)
              ? post.sections.map(function (section) {
                  return [section.heading || "", (section.paragraphs || []).join(" ")].join(" ");
                }).join(" ")
              : "";

            return {
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt,
              category: post.category,
              author: post.author || "STOK Editorial",
              publishDate: post.publishDate,
              readTime: post.readTime || "4 min read",
              image: post.image || "",
              imageAlt: post.imageAlt || post.title,
              tags: Array.isArray(post.tags) ? post.tags : [],
              featured: Boolean(post.featured),
              intro: post.intro || "",
              pullQuote: post.pullQuote || "",
              sections: Array.isArray(post.sections) ? post.sections : [],
              seoTitle: post.seoTitle || "",
              seoDescription: post.seoDescription || "",
              searchableText: [
                post.title,
                post.excerpt,
                post.category,
                post.author,
                post.intro,
                (post.tags || []).join(" "),
                searchableSections
              ].join(" ").toLowerCase()
            };
          })
          .sort(function (a, b) {
            return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
          });
      });
  }

  function renderListingPage(posts) {
    var searchInput = document.getElementById("blog-search");
    var countElement = document.getElementById("blog-count");
    var resultsElement = document.getElementById("blog-results");
    var emptyElement = document.getElementById("blog-empty");
    var featuredElement = document.getElementById("featured-blog");
    var featuredSection = document.getElementById("featured-section");
    var featuredPost = posts.find(function (post) { return post.featured; }) || posts[0];

    if (!posts.length) {
      if (countElement) {
        countElement.textContent = "No stories published yet.";
      }
      if (emptyElement) {
        emptyElement.hidden = false;
        emptyElement.querySelector(".blog-empty-title").textContent = "No stories published yet.";
        emptyElement.querySelector(".blog-empty-copy").textContent = "Add structured content in documents/blogs.json to populate this collection.";
      }
      if (featuredSection) {
        featuredSection.hidden = true;
      }
      return;
    }

    function applyFilter() {
      var query = (searchInput.value || "").trim().toLowerCase();
      var matches = posts.filter(function (post) {
        return !query || post.searchableText.indexOf(query) !== -1;
      });
      var showFeatured = !query && featuredPost;
      var visiblePosts = showFeatured
        ? matches.filter(function (post) { return post.slug !== featuredPost.slug; })
        : matches.slice();

      if (featuredSection) {
        featuredSection.hidden = !showFeatured;
      }
      if (featuredElement && showFeatured) {
        featuredElement.innerHTML = "";
        featuredElement.appendChild(createFeaturedCard(featuredPost));
      }

      resultsElement.innerHTML = "";
      visiblePosts.forEach(function (post, index) {
        resultsElement.appendChild(createPostCard(post, index));
      });

      if (countElement) {
        countElement.textContent = matches.length === 1 ? "1 story found" : matches.length + " stories found";
      }
      if (emptyElement) {
        emptyElement.hidden = matches.length !== 0;
      }
    }

    searchInput.addEventListener("input", applyFilter);
    applyFilter();
  }

  function renderListingError() {
    var countElement = document.getElementById("blog-count");
    var emptyElement = document.getElementById("blog-empty");
    var featuredSection = document.getElementById("featured-section");
    if (countElement) {
      countElement.textContent = "Unable to load stories.";
    }
    if (featuredSection) {
      featuredSection.hidden = true;
    }
    if (emptyElement) {
      emptyElement.hidden = false;
      emptyElement.querySelector(".blog-empty-title").textContent = "Unable to load stories.";
      emptyElement.querySelector(".blog-empty-copy").textContent = "Please check documents/blogs.json and try again.";
    }
  }

  function renderDetailPage(posts) {
    var slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) {
      renderDetailError("No story was selected. Open a post from the blog collection to read it here.");
      return;
    }

    var post = posts.find(function (item) { return item.slug === slug; });
    if (!post) {
      renderDetailError("This story could not be found. It may have been removed or the link may be incomplete.");
      return;
    }

    var stateElement = document.getElementById("blog-detail-state");
    var contentElement = document.getElementById("blog-detail-content");
    stateElement.hidden = true;
    contentElement.hidden = false;

    text("blog-breadcrumb-current", post.title);
    text("blog-detail-category", post.category);
    text("blog-detail-title", post.title);
    text("blog-detail-excerpt", post.excerpt);
    text("blog-detail-date", formatDate(post.publishDate));
    text("blog-detail-readtime", post.readTime);
    text("blog-detail-author", post.author);
    text("blog-detail-intro", post.intro);
    text("blog-sidebar-category", post.category);
    text("blog-sidebar-date", formatDate(post.publishDate));
    text("blog-sidebar-readtime", post.readTime);

    var mediaElement = document.getElementById("blog-detail-media");
    mediaElement.innerHTML = "";
    mediaElement.appendChild(createMedia(post, "blog-detail-media-card"));

    var quoteElement = document.getElementById("blog-detail-quote");
    if (post.pullQuote) {
      quoteElement.hidden = false;
      quoteElement.textContent = post.pullQuote;
    } else {
      quoteElement.hidden = true;
    }

    var sectionsElement = document.getElementById("blog-detail-sections");
    sectionsElement.innerHTML = "";
    post.sections.forEach(function (section) {
      var block = document.createElement("section");
      block.className = "blog-prose-section";

      if (section.heading) {
        var heading = document.createElement("h2");
        heading.className = "blog-prose-heading";
        heading.textContent = section.heading;
        block.appendChild(heading);
      }

      (section.paragraphs || []).forEach(function (paragraph) {
        var paragraphElement = document.createElement("p");
        paragraphElement.className = "blog-prose-paragraph";
        paragraphElement.textContent = paragraph;
        block.appendChild(paragraphElement);
      });

      sectionsElement.appendChild(block);
    });

    var tagsElement = document.getElementById("blog-detail-tags");
    tagsElement.innerHTML = "";
    post.tags.forEach(function (tag) {
      var tagElement = document.createElement("span");
      tagElement.className = "blog-tag";
      tagElement.textContent = tag;
      tagsElement.appendChild(tagElement);
    });

    var relatedElement = document.getElementById("blog-related-posts");
    relatedElement.innerHTML = "";
    getRelatedPosts(posts, post).forEach(function (relatedPost, index) {
      relatedElement.appendChild(createPostCard(relatedPost, index));
    });

    updateDocumentMeta(post);
    updateStructuredData(post);
  }

  function renderDetailError(message) {
    var stateElement = document.getElementById("blog-detail-state");
    var contentElement = document.getElementById("blog-detail-content");
    if (contentElement) {
      contentElement.hidden = true;
    }
    if (stateElement) {
      stateElement.hidden = false;
      stateElement.textContent = message;
    }
  }

  function createFeaturedCard(post) {
    var link = document.createElement("a");
    link.className = "blog-featured-card";
    link.href = detailHref(post.slug);

    var copy = document.createElement("div");
    copy.className = "blog-featured-copy";

    var kicker = document.createElement("span");
    kicker.className = "blog-featured-kicker";
    kicker.textContent = "Featured Story";

    var category = document.createElement("div");
    category.className = "blog-pill blog-pill-inline";
    category.textContent = post.category;

    var title = document.createElement("h2");
    title.className = "blog-featured-title";
    title.textContent = post.title;

    var excerpt = document.createElement("p");
    excerpt.className = "blog-featured-excerpt";
    excerpt.textContent = post.excerpt;

    var meta = createMetaRow(post, "blog-meta-row");
    var cta = document.createElement("span");
    cta.className = "blog-cta-inline";
    cta.textContent = "Read story";

    copy.appendChild(kicker);
    copy.appendChild(category);
    copy.appendChild(title);
    copy.appendChild(excerpt);
    copy.appendChild(meta);
    copy.appendChild(cta);

    link.appendChild(copy);
    link.appendChild(createMedia(post, "blog-featured-media"));
    return link;
  }

  function createPostCard(post, index) {
    var article = document.createElement("article");
    article.className = "blog-card";
    article.style.animationDelay = Math.min(index, 5) * 0.08 + "s";

    var link = document.createElement("a");
    link.className = "blog-card-link";
    link.href = detailHref(post.slug);

    link.appendChild(createMedia(post, "blog-card-media"));

    var body = document.createElement("div");
    body.className = "blog-card-body";

    var category = document.createElement("div");
    category.className = "blog-pill blog-pill-inline";
    category.textContent = post.category;

    var title = document.createElement("h3");
    title.className = "blog-card-title";
    title.textContent = post.title;

    var excerpt = document.createElement("p");
    excerpt.className = "blog-card-excerpt";
    excerpt.textContent = post.excerpt;

    var footer = document.createElement("div");
    footer.className = "blog-card-footer";
    footer.appendChild(createMetaRow(post, "blog-meta-row blog-meta-row-small"));

    var cta = document.createElement("span");
    cta.className = "blog-text-link";
    cta.textContent = "Read more";
    footer.appendChild(cta);

    body.appendChild(category);
    body.appendChild(title);
    body.appendChild(excerpt);
    body.appendChild(footer);
    link.appendChild(body);
    article.appendChild(link);

    return article;
  }

  function createMedia(post, className) {
    var wrapper = document.createElement("div");
    wrapper.className = "blog-media " + className;

    var image = document.createElement("img");
    image.className = "blog-media-image";
    image.src = "images/blogs/" + post.image;
    image.alt = post.imageAlt || post.title;
    image.loading = "lazy";

    var fallback = document.createElement("div");
    fallback.className = "blog-image-fallback";
    fallback.innerHTML = "<span>STOK Journal</span><strong>" + escapeHtml(post.category) + "</strong>";

    image.addEventListener("load", function () {
      wrapper.classList.remove("is-fallback");
    });
    image.addEventListener("error", function () {
      wrapper.classList.add("is-fallback");
      image.remove();
    });

    wrapper.classList.add("is-fallback");
    wrapper.appendChild(image);
    wrapper.appendChild(fallback);
    return wrapper;
  }

  function createMetaRow(post, className) {
    var row = document.createElement("div");
    row.className = className;
    row.appendChild(metaText(formatDate(post.publishDate)));
    row.appendChild(metaDot());
    row.appendChild(metaText(post.readTime));
    return row;
  }

  function metaText(value) {
    var element = document.createElement("span");
    element.textContent = value;
    return element;
  }

  function metaDot() {
    var dot = document.createElement("span");
    dot.className = "blog-meta-dot";
    return dot;
  }

  function getRelatedPosts(posts, currentPost) {
    var related = posts
      .filter(function (post) { return post.slug !== currentPost.slug; })
      .map(function (post) {
        var sharedTags = post.tags.filter(function (tag) {
          return currentPost.tags.indexOf(tag) !== -1;
        }).length;
        return {
          post: post,
          score: sharedTags + (post.category === currentPost.category ? 2 : 0)
        };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 2)
      .map(function (item) { return item.post; });

    if (related.length < 2) {
      posts.forEach(function (post) {
        if (post.slug !== currentPost.slug && related.length < 2 && !related.some(function (item) { return item.slug === post.slug; })) {
          related.push(post);
        }
      });
    }

    return related;
  }

  function updateDocumentMeta(post) {
    var title = post.seoTitle || post.title + " | STOK Journal";
    var description = post.seoDescription || post.excerpt;
    var absoluteUrl = new URL(detailHref(post.slug), window.location.origin + "/").href;
    var absoluteImage = new URL("images/blogs/" + post.image, window.location.origin + "/").href;

    document.title = title;
    updateMeta("#meta-description", "content", description);
    updateMeta("#meta-og-title", "content", title);
    updateMeta("#meta-og-description", "content", description);
    updateMeta("#meta-og-image", "content", absoluteImage);
    updateMeta("#meta-og-url", "content", absoluteUrl);
    updateMeta("#meta-twitter-title", "content", title);
    updateMeta("#meta-twitter-description", "content", description);
    updateMeta("#meta-twitter-image", "content", absoluteImage);

    var canonical = document.getElementById("canonical-link");
    if (canonical) {
      canonical.setAttribute("href", absoluteUrl);
    }
  }

  function updateStructuredData(post) {
    var schemaElement = document.getElementById("blog-article-schema");
    if (!schemaElement) {
      return;
    }

    var articleUrl = new URL(detailHref(post.slug), window.location.origin + "/").href;
    var imageUrl = new URL("images/blogs/" + post.image, window.location.origin + "/").href;
    schemaElement.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": post.title,
      "description": post.seoDescription || post.excerpt,
      "image": [imageUrl],
      "author": {
        "@type": "Organization",
        "name": post.author
      },
      "publisher": {
        "@type": "Organization",
        "name": "STOK Beer India",
        "logo": {
          "@type": "ImageObject",
          "url": "https://stokindia.com/images/stok-logo-chill.svg"
        }
      },
      "datePublished": post.publishDate,
      "dateModified": post.publishDate,
      "mainEntityOfPage": articleUrl
    });
  }

  function updateMeta(selector, attribute, value) {
    var element = document.querySelector(selector);
    if (element) {
      element.setAttribute(attribute, value);
    }
  }

  function detailHref(slug) {
    return "blog-detail.html?slug=" + encodeURIComponent(slug);
  }

  function formatDate(dateValue) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date(dateValue));
  }

  function text(id, value) {
    var element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
