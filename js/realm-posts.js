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

  function fetchPosts() {
    return fetch('/posts.json').then(function (r) { return r.json() })
  }

  function rankSort(a, b, key) {
    var ar = Number(a[key] || 0)
    var br = Number(b[key] || 0)
    if (br !== ar) return br - ar
    return String(b.date || '').localeCompare(String(a.date || ''))
  }

  function hasCategory(post, name) {
    return post.categories && post.categories.some(function (c) { return c === name })
  }

  function pathIncludes(post, part) {
    return post.path && post.path.indexOf(part) !== -1
  }

  function realmPosts(posts, realm, fallbackCategory, fallbackPath) {
    return posts.filter(function (post) {
      return post.realm === realm || hasCategory(post, fallbackCategory) || pathIncludes(post, fallbackPath)
    })
  }

  function homePosts(list) {
    var ranked = list.filter(function (post) {
      return Number(post.home_rank || 0) > 0
    }).sort(function (a, b) {
      return rankSort(a, b, 'home_rank')
    })

    if (ranked.length) return ranked.slice(0, 2)
    return list.slice().sort(function (a, b) { return rankSort(a, b, 'realm_rank') }).slice(0, 2)
  }

  function renderSticky(posts, cardsId, sectionId) {
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
      return '<a class="sticky-card" href="' + escapeAttr(post.path) + '">' + cover
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

    return '<a class="realm-card ' + cls + '" href="' + escapeAttr(post.path) + '">'
      + cover
      + '<div class="card-body">'
      + '<h3 class="card-title">' + escapeHtml(post.title) + '</h3>'
      + desc
      + '<div class="card-meta"><i class="far fa-calendar-alt"></i> <time>' + escapeHtml(post.date) + '</time>' + cats + '</div>'
      + '</div></a>'
  }

  function renderHomeRealm(posts, options) {
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

    return '<a class="article-card" href="' + escapeAttr(post.path) + '">' + cover
      + '<div class="content"><h2>' + escapeHtml(post.title) + '</h2>' + desc
      + '<div class="meta"><i class="far fa-calendar-alt"></i><time>' + escapeHtml(post.date) + '</time>' + tags + '</div></div></a>'
  }

  function renderRealmPage(posts, options) {
    var countEl = document.getElementById(options.countId)
    var listEl = document.getElementById(options.listId)
    if (!listEl) return

    var list = realmPosts(posts, options.realm, options.fallbackCategory, options.fallbackPath)
      .sort(function (a, b) { return rankSort(a, b, 'realm_rank') })

    if (countEl) countEl.textContent = list.length
    listEl.innerHTML = list.length
      ? list.map(function (post) { return realmPageCard(post, options) }).join('')
      : '<div class="empty">暂无文章</div>'
  }

  window.RealmPosts = {
    fetch: fetchPosts,
    renderSticky: renderSticky,
    renderHomeRealm: renderHomeRealm,
    renderRealmPage: renderRealmPage
  }
})(window)
