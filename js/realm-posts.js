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
    return fetch('/posts.json').then(function (r) { return r.json() })
  }

  function rankSort(a, b, key) {
    var ar = Number(a[key] || 0)
    var br = Number(b[key] || 0)
    if (br !== ar) return br - ar
    return String(b.date || '').localeCompare(String(a.date || ''))
  }

  function dateSort(a, b) {
    return String(b.date || '').localeCompare(String(a.date || ''))
  }

  function titleSort(a, b) {
    return String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN')
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

  function uniqueValues(posts, key) {
    var map = {}
    posts.forEach(function (post) {
      ;(post[key] || []).forEach(function (item) {
        if (item) map[item] = true
      })
    })
    return Object.keys(map).sort(function (a, b) { return a.localeCompare(b, 'zh-CN') })
  }

  function postMatchesFilter(post, filter) {
    if (!filter || filter === 'all') return true
    return (post.categories || []).indexOf(filter) !== -1 || (post.tags || []).indexOf(filter) !== -1
  }

  function sortPosts(posts, mode) {
    var list = posts.slice()
    if (mode === 'date') return list.sort(dateSort)
    if (mode === 'title') return list.sort(titleSort)
    return list.sort(function (a, b) { return rankSort(a, b, 'realm_rank') })
  }

  function renderFilters(container, filters, active) {
    if (!container) return
    container.innerHTML = ['all'].concat(filters).map(function (filter) {
      var label = filter === 'all' ? '全部' : filter
      var pressed = filter === active ? 'true' : 'false'
      return '<button class="filter-chip" type="button" data-filter="' + escapeAttr(filter) + '" aria-pressed="' + pressed + '">' + escapeHtml(label) + '</button>'
    }).join('')
  }

  function renderManagedRealmPage(posts, options) {
    var state = {
      filter: 'all',
      sort: 'rank',
      visible: Number(options.pageSize || 12)
    }

    var base = realmPosts(posts, options.realm, options.fallbackCategory, options.fallbackPath)
    var listEl = document.getElementById(options.listId)
    var countEl = document.getElementById(options.countId)
    var countEls = (options.countIds || []).map(function (id) { return document.getElementById(id) }).filter(Boolean)
    var shownEl = document.getElementById(options.shownId)
    var filterEl = document.getElementById(options.filterId)
    var sortEl = document.getElementById(options.sortId)
    var sentinelEl = document.getElementById(options.sentinelId)

    if (!listEl) return

    renderFilters(filterEl, uniqueValues(base, options.filterSource || 'tags'), state.filter)

    function currentList() {
      return sortPosts(base.filter(function (post) {
        return postMatchesFilter(post, state.filter)
      }), state.sort)
    }

    function render() {
      var filtered = currentList()
      var visible = filtered.slice(0, state.visible)
      if (countEl) countEl.textContent = filtered.length
      countEls.forEach(function (el) { el.textContent = filtered.length })
      if (shownEl) shownEl.textContent = visible.length
      listEl.innerHTML = visible.length
        ? visible.map(function (post) { return realmPageCard(post, options) }).join('')
        : '<div class="empty">暂无匹配文章</div>'
      if (sentinelEl) {
        sentinelEl.hidden = visible.length >= filtered.length
      }
    }

    if (filterEl) {
      filterEl.addEventListener('click', function (event) {
        var target = event.target.closest('[data-filter]')
        if (!target) return
        state.filter = target.getAttribute('data-filter')
        state.visible = Number(options.pageSize || 12)
        renderFilters(filterEl, uniqueValues(base, options.filterSource || 'tags'), state.filter)
        render()
      })
    }

    if (sortEl) {
      sortEl.addEventListener('change', function () {
        state.sort = sortEl.value
        state.visible = Number(options.pageSize || 12)
        render()
      })
    }

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

    render()
  }

  window.RealmPosts = {
    fetch: fetchPosts,
    renderSticky: renderSticky,
    renderHomeRealm: renderHomeRealm,
    renderRealmPage: renderRealmPage,
    renderManagedRealmPage: renderManagedRealmPage
  }
})(window)
