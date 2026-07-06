;(function (window) {
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch]
    })
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;')
  }

  function sitePath(path) {
    if (!path) return '/'
    if (/^(https?:)?\/\//.test(path) || path.charAt(0) === '#') return path
    return '/' + String(path).replace(/^\/+/, '')
  }

  function fetchPosts() {
    return fetch('/posts.json').then(function (r) { return r.json() }).then(normalizeData)
  }

  function normalizeData(data) {
    if (Array.isArray(data)) return { posts: data, realms: {} }
    return {
      posts: data && Array.isArray(data.posts) ? data.posts : [],
      realms: data && data.realms ? data.realms : {}
    }
  }

  function postList(data) {
    return normalizeData(data).posts
  }

  function rankSort(a, b) {
    var ar = Number(a.rank || 0)
    var br = Number(b.rank || 0)
    if (br !== ar) return br - ar
    return String(b.date || '').localeCompare(String(a.date || ''))
  }

  function hasCategory(post, name) {
    return post.categories && post.categories.some(function (c) { return c === name })
  }

  function pathIncludes(post, part) {
    return post.path && post.path.indexOf(part) !== -1
  }

  function toList(value) {
    if (Array.isArray(value)) return value
    return value ? [value] : []
  }

  function realmPosts(posts, realm, fallbackCategory, fallbackPath) {
    var fallbackCategories = toList(fallbackCategory)
    var fallbackPaths = toList(fallbackPath)
    return posts.filter(function (post) {
      return post.realm === realm
        || fallbackCategories.some(function (category) { return hasCategory(post, category) })
        || fallbackPaths.some(function (path) { return pathIncludes(post, path) })
    })
  }

  // Top 2 by rank
  function homePosts(list) {
    return list.slice().sort(rankSort).slice(0, 2)
  }

  function renderSticky(posts, cardsId, sectionId) {
    posts = postList(posts)
    var stickyEl = document.getElementById(cardsId)
    var sectionEl = document.getElementById(sectionId)
    var stickies = posts.filter(function (post) {
      return Number(post.sticky || 0) > 0
    }).sort(function (a, b) {
      return Number(b.sticky || 0) - Number(a.sticky || 0)
    })

    if (!stickyEl) return
    if (!stickies.length) {
      if (sectionEl) sectionEl.style.display = 'none'
      return
    }

    stickyEl.innerHTML = stickies.map(function (post) {
      var cover = post.cover
        ? '<div class="sticky-cover" style="background-image:url(' + escapeAttr(post.cover) + ')"></div>'
        : ''
      var desc = post.description ? '<div class="sticky-desc">' + escapeHtml(post.description) + '</div>' : ''
      return '<a class="sticky-card" href="' + escapeAttr(sitePath(post.path)) + '">' + cover
        + '<div class="sticky-info"><div class="sticky-title">' + escapeHtml(post.title) + '</div>' + desc + '</div></a>'
    }).join('')
  }

  function homeCard(post, type) {
    var cls = type === 'code' ? 'code-card' : 'heart-card'
    var icon = type === 'code' ? 'fas fa-cube' : 'fas fa-feather-alt'
    var cover = post.cover
      ? '<div class="card-cover-img" style="background-image:url(' + escapeAttr(post.cover) + ')"></div>'
      : '<div class="card-cover-img card-cover-placeholder"><i class="' + icon + '"></i></div>'
    var desc = post.description ? '<p class="card-desc">' + escapeHtml(post.description) + '</p>' : ''
    var cats = post.categories && post.categories.length
      ? '<span class="card-divider">|</span>' + post.categories.map(function (category, index, all) {
        return '<span class="meta-cat">' + escapeHtml(category) + '</span>'
          + (index < all.length - 1 ? ' <span class="card-divider">|</span> ' : '')
      }).join('')
      : ''

    return '<a class="realm-card ' + cls + '" href="' + escapeAttr(sitePath(post.path)) + '">'
      + cover
      + '<div class="card-body">'
      + '<h3 class="card-title">' + escapeHtml(post.title) + '</h3>'
      + desc
      + '<div class="card-meta"><i class="far fa-calendar-alt"></i> <time>' + escapeHtml(post.date) + '</time>' + cats + '</div>'
      + '</div></a>'
  }

  function renderHomeRealm(posts, options) {
    posts = postList(posts)
    var el = document.getElementById(options.containerId)
    if (!el) return

    var list = realmPosts(posts, options.realm, options.fallbackCategory, options.fallbackPath)
    var selected = homePosts(list)
    el.innerHTML = selected.length
      ? selected.map(function (post) { return homeCard(post, options.type) }).join('')
      : '<div class="empty-state">暂无文章</div>'
  }

  function realmPageCard(post, options) {
    var cover = post.cover
      ? '<div class="cover" style="background-image:url(' + escapeAttr(post.cover) + ')"></div>'
      : '<div class="cover placeholder"><i class="' + escapeAttr(options.placeholderIcon) + '"></i></div>'
    var desc = post.description ? '<p class="desc">' + escapeHtml(post.description) + '</p>' : ''
    var tags = (post.tags || []).slice(0, 3).map(function (tag) {
      return '<span class="tag">' + escapeHtml(tag) + '</span>'
    }).join('')

    return '<a class="article-card" href="' + escapeAttr(sitePath(post.path)) + '">' + cover
      + '<div class="content"><h2>' + escapeHtml(post.title) + '</h2>' + desc
      + '<div class="meta"><i class="far fa-calendar-alt"></i><time>' + escapeHtml(post.date) + '</time>' + tags + '</div></div></a>'
  }

  // Category tab based realm page
  function renderManagedRealmPage(data, options) {
    var normalized = normalizeData(data)
    var posts = normalized.posts
    var realms = normalized.realms
    var realmConfig = realms[options.realm] || {}
    var catOrder = realmConfig.categories || []

    var base = realmPosts(posts, options.realm, options.fallbackCategory, options.fallbackPath)
    var listEl = document.getElementById(options.listId)
    var tabEl = document.getElementById(options.tabId)
    var sentinelEl = document.getElementById(options.sentinelId)

    if (!listEl) return

    // Use configured category order; fall back to all categories found in posts
    var allCategories = catOrder.length ? catOrder : (function () {
      var map = {}
      base.forEach(function (post) {
        (post.categories || []).forEach(function (c) { if (c) map[c] = true })
      })
      return Object.keys(map).sort(function (a, b) { return a.localeCompare(b, 'zh-CN') })
    })()

    var activeCategory = allCategories[0] || ''

    function catPosts(cat) {
      return base.filter(function (post) {
        return post.categories && post.categories.indexOf(cat) !== -1
      })
    }

    var state = {
      visible: Number(options.pageSize || 12)
    }

    function currentList() {
      return catPosts(activeCategory).sort(rankSort)
    }

    function renderTabs() {
      if (!tabEl || allCategories.length <= 1) {
        if (tabEl) tabEl.style.display = 'none'
        return
      }
      tabEl.style.display = ''
      tabEl.innerHTML = allCategories.map(function (cat) {
        var count = catPosts(cat).length
        var active = cat === activeCategory ? 'true' : 'false'
        return '<button class="cat-tab" type="button" data-cat="' + escapeAttr(cat) + '" aria-pressed="' + active + '">' + escapeHtml(cat) + ' <span class="cat-count">' + count + '</span></button>'
      }).join('')
    }

    function render() {
      var filtered = currentList()
      var visible = filtered.slice(0, state.visible)
      listEl.innerHTML = visible.length
        ? visible.map(function (post) { return realmPageCard(post, options) }).join('')
        : '<div class="empty">暂无匹配文章</div>'
      if (sentinelEl) {
        sentinelEl.hidden = visible.length >= filtered.length
      }
    }

    // Tab click
    if (tabEl) {
      tabEl.addEventListener('click', function (event) {
        var target = event.target.closest('[data-cat]')
        if (!target) return
        activeCategory = target.getAttribute('data-cat')
        state.visible = Number(options.pageSize || 12)
        renderTabs()
        render()
      })
    }

    // Infinite scroll
    function loadNextPage() {
      var filtered = currentList()
      if (state.visible >= filtered.length) return
      state.visible += Number(options.pageSize || 12)
      render()
    }

    if (sentinelEl && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting })) loadNextPage()
      }, { rootMargin: '240px 0px' })
      observer.observe(sentinelEl)
    } else {
      window.addEventListener('scroll', function () {
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 260) {
          loadNextPage()
        }
      }, { passive: true })
    }

    renderTabs()
    render()
  }

  window.RealmPosts = {
    fetch: fetchPosts,
    renderSticky: renderSticky,
    renderHomeRealm: renderHomeRealm,
    renderManagedRealmPage: renderManagedRealmPage
  }
})(window)
