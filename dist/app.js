function initApp (config) {
  function escapeHtml (string) {
    var entityMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': '&quot;',
      "'": '&#39;',
      "/": '&#x2F;'
    };
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  function createEl () {
    return document.createElement('DIV');
  }

  function createAppEl (data) {
    var el = createEl();
    el.appendChild(createProfileEl(data.user));
    el.appendChild(createPostFormEl(data.user));
    el.appendChild(createFeedEl(data.feed, data.user));
    return el;
  }
  
  function createProfileEl (user) {
    var el = createEl();
    el.innerHTML = config.profileTemplate;
    el.querySelector('.js-profile-image').src = config.avatarUrl+user.id+'?'+Math.random();
    el.querySelector('.js-profile-title').innerHTML = 'Profile of '+(user.username || config.defaultUsername);
    el.querySelector('.js-profile-username').value = user.username || config.defaultUsername;
    el.querySelector('.js-profile-sign-out-button').onclick = function () {
      event.preventDefault();
      Horizon.clearAuthTokens();
      window.location.replace('?');
    };
    el.querySelector('.js-profile-form').onsubmit = function (event) {
      event.preventDefault();
      var usernameEl = el.querySelector('.js-profile-username');
      upsertUser(user, usernameEl.value);
      usernameEl.value = '';
    };
    return el;
  }
  
  function createSignInEl () {
    var el = createEl();
    el.innerHTML = config.signInTemplate;
    el.querySelector('.js-sign-in-button').onclick = function (event) {
      event.preventDefault();
      horizon.authEndpoint('github').subscribe((endpoint) => {
        window.location.replace(endpoint);
      });
    };
    return el;
  }
  
  function createPostFormEl (user) {
    var el = createEl();
    el.innerHTML = config.postFormTemplate;
    el.querySelector('.js-post-form').onsubmit = function (event) {
      event.preventDefault();
      var bodyEl = el.querySelector('.js-post-form-body');
      upsertPost({
        username: user.username,
        userId: user.id,
        body: bodyEl.value
      });
      bodyEl.value = '';
    };
    return el;
  }
  
  function createPostEl (post, user) {
    var el = createEl();
    el.innerHTML = config.postTemplate;
    el.querySelector('.js-post-username').innerHTML = post.username || config.defaultUsername;
    el.querySelector('.js-post-body').innerHTML = escapeHtml(post.body);
    el.querySelector('.js-post-user-image').src = post.userId ? config.avatarUrl+post.userId: config.defaultUserImage;
    el.querySelector('.js-post-add-button').onclick = function (event) {
      event.preventDefault();
      var formPlaceholderEl = el.querySelector('.js-post-comment-form');
      formPlaceholderEl.innerHTML = '';
      formPlaceholderEl.appendChild(createCommentFormEl(post, user));
    };
    if (post.comments) {
      var commentsEl = el.querySelector('.js-post-comments');
      post.comments.forEach(function (comment) {
        commentsEl.appendChild(createCommentEl(comment));
      });
    }
    return el;
  }
  
  function createCommentFormEl (post, user) {
    var el = createEl();
    el.innerHTML = config.commentFormTemplate;
    el.querySelector('.js-comment-form').onsubmit = function (event) {
      event.preventDefault();
      var bodyEl = el.querySelector('.js-comment-body');
      addComment(post, {
        username: user.username,
        userId: user.id,
        body: bodyEl.value,
      });
      bodyEl.value = '';
    };
    return el;
  }
  
  function createCommentEl (comment) {
    var el = createEl();
    el.innerHTML = config.commentTemplate;
    el.querySelector('.js-comment-user').innerHTML = comment.username || config.defaultUsername;
    el.querySelector('.js-comment-body').innerHTML = escapeHtml(comment.body);
    el.querySelector('.js-comment-user-image').src = comment.userId ? config.avatarUrl+comment.userId: config.defaultUserImage;
    return el;
  }
  
  function createFeedEl (posts, user) {
    var el = createEl();
    posts.forEach(function (post) {
      el.appendChild(createPostEl(post, user));
    });
    return el;
  }
  
  function upsertPost (post) {
    post.updateAt = new Date();
    horizon('posts').upsert(post);
  }
  
  function upsertUser (user, username) {
    user.username = username;
    horizon('users').upsert(user);
  }
  
  function addComment (post, comment) {
    post.comments = post.comments || [];
    post.comments.push(comment);
    horizon('posts').replace(post);
  }

  // init horizon
  var horizon = Horizon();
  // Wait when Horizon status = ready
  horizon.onReady(function () {
    // Currently we are not Signed In
    if (!horizon.hasAuthToken()) {
      config.rootEl.appendChild(createSignInEl());
    } else { // We are Signed In 
      // Aggregate several queries
      horizon.aggregate({
        user: horizon.currentUser(),
        feed: horizon('posts').order('updateAt', 'descending').limit(100)
      }).watch().subscribe(function (data) {
        console.log(data);
        config.rootEl.innerHTML = '';
        config.rootEl.appendChild(createAppEl(data));
      });
    }
  });
  horizon.connect();
}
