/* ============================================================
   Bhaktinandan Behera — Social Wall
   Comments, likes, replies, friend requests
   Backed by Firebase Realtime Database (free)
   ============================================================ */

(function () {
  "use strict";

  // ---------- Firebase setup ----------
  var CFG = window.FIREBASE_CONFIG || {};
  var OWNER_PIN = window.OWNER_PIN || "";

  function configIsReady() {
    return !!(CFG.databaseURL && CFG.databaseURL.indexOf("PASTE_") === -1);
  }

  var db = null;
  var firebaseReady = configIsReady() && typeof firebase !== "undefined";
  if (firebaseReady) {
    try {
      var app = firebase.initializeApp(CFG, "bhaktinandan-social");
      db = firebase.database(app);
    } catch (e) {
      db = null;
    }
  }

  // ---------- Settings ----------
  var DICEBEAR_BASE = "https://api.dicebear.com/9.x";
  var VISITOR_STYLES = [
    { id: "adventurer", label: "Adventurer" },
    { id: "lorelei",    label: "Lorelei" },
    { id: "micah",      label: "Micah" },
    { id: "open-peeps", label: "Open Peeps" },
    { id: "fun-emoji",  label: "Fun Emoji" },
    { id: "pixel-art",  label: "Pixel Art" },
  ];

  var IDENTITY_KEY = "bhaktinandan-visitor-identity";
  var OWNER_KEY = "bhaktinandan-owner";

  // ---------- State ----------
  var me = null;                 // { id, name, avatar }
  var isOwner = false;
  var commentsCache = {};
  var friendsCache = {};
  var requestsCache = {};
  var pendingAction = null;      // action to run after identity is set
  var identityChosenStyle = VISITOR_STYLES[0].id;

  // ---------- DOM refs ----------
  function $(id) { return document.getElementById(id); }

  var setupBanner = $("social-setup-banner");
  var visitorChip = $("visitor-chip");
  var identityBtn = $("identity-btn");
  var friendActionWrap = $("friend-action-wrap");
  var friendRequestBtn = $("friend-request-btn");
  var friendRequestStatus = $("friend-request-status");
  var friendsGrid = $("friends-grid");
  var friendsCount = $("friends-count");
  var commentForm = $("comment-form");
  var commentInput = $("comment-input");
  var commentsList = $("comments-list");
  var identityModal = $("identity-modal");
  var visitorNameInput = $("visitor-name");
  var visitorAvatarPreview = $("visitor-avatar-preview");
  var visitorStylesEl = $("visitor-avatar-styles");
  var identitySaveBtn = $("identity-save-btn");
  var ownerModal = $("owner-modal");
  var ownerPinInput = $("owner-pin");
  var ownerPanel = $("owner-panel");
  var pendingList = $("pending-list");
  var ownerLoginBtn = $("owner-login-btn");
  var toastEl = $("toast");

  // ---------- Helpers ----------
  function showToast(message, duration) {
    toastEl.textContent = message;
    toastEl.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toastEl.classList.add("hidden"); }, duration || 2600);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function avatarUrl(style, seed) {
    return DICEBEAR_BASE + "/" + style + "/svg?seed=" + encodeURIComponent(seed) + "&backgroundColor=b6e3f4&backgroundType=solid,gradientLinear";
  }

  function timeAgo(at) {
    if (!at) return "";
    var s = Math.floor((Date.now() - at) / 1000);
    if (s < 45) return "just now";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    var d = Math.floor(h / 24);
    if (d < 7) return d + "d ago";
    return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }

  function ref(path) { return db.ref(path); }

  // ---------- Identity (visitor profile stored on this device) ----------
  function loadIdentity() {
    try {
      var saved = JSON.parse(localStorage.getItem(IDENTITY_KEY) || "null");
      if (saved && saved.id) {
        me = saved;
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function saveIdentity() {
    try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(me)); } catch (e) { /* ignore */ }
  }

  function renderVisitorChip() {
    if (me) {
      visitorChip.classList.remove("hidden");
      visitorChip.innerHTML =
        '<img src="' + escapeHtml(me.avatar) + '" alt="" />' +
        "<span>" + escapeHtml(me.name) + "</span>";
      identityBtn.textContent = "✏️ Change name";
    } else {
      visitorChip.classList.add("hidden");
      identityBtn.textContent = "👤 Set your name";
    }
  }

  function openIdentityModal() {
    visitorNameInput.value = me ? me.name : "";
    buildVisitorStyleButtons();
    updateAvatarPreview();
    updateIdentitySaveState();
    identityModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    setTimeout(function () { visitorNameInput.focus(); }, 50);
  }

  function closeIdentityModal() {
    identityModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function updateIdentitySaveState() {
    identitySaveBtn.disabled = !visitorNameInput.value.trim();
  }

  function updateAvatarPreview() {
    var name = visitorNameInput.value.trim() || "Guest";
    visitorAvatarPreview.src = avatarUrl(identityChosenStyle, name);
  }

  function buildVisitorStyleButtons() {
    visitorStylesEl.innerHTML = "";
    VISITOR_STYLES.forEach(function (style) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "avatar-style" + (style.id === identityChosenStyle ? " active" : "");
      btn.dataset.style = style.id;
      btn.innerHTML =
        '<img src="' + avatarUrl(style.id, "Guest") + '" alt="' + style.label + '" loading="lazy" />' +
        "<span>" + style.label + "</span>";
      btn.addEventListener("click", function () {
        identityChosenStyle = style.id;
        visitorStylesEl.querySelectorAll(".avatar-style").forEach(function (b) {
          b.classList.toggle("active", b.dataset.style === identityChosenStyle);
        });
        updateAvatarPreview();
      });
      visitorStylesEl.appendChild(btn);
    });
  }

  function confirmIdentity(cb) {
    if (me) { cb(); return; }
    pendingAction = cb;
    openIdentityModal();
  }

  // Called when identity modal saves
  function onIdentitySaved() {
    var name = visitorNameInput.value.trim().slice(0, 30);
    if (!name) return;
    if (!me) {
      me = {
        id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: name,
        avatar: avatarUrl(identityChosenStyle, name)
      };
    } else {
      me.name = name;
      me.avatar = avatarUrl(identityChosenStyle, name);
    }
    saveIdentity();
    renderVisitorChip();
    closeIdentityModal();
    renderFriendAction();
    if (pendingAction) {
      var action = pendingAction;
      pendingAction = null;
      action();
    } else {
      showToast("Welcome, " + name + "! 👋");
    }
  }

  // ---------- Friend requests ----------
  function sendFriendRequest() {
    confirmIdentity(function () {
      if (!db) return;
      ref("friendRequests/" + me.id).set({
        name: me.name,
        avatar: me.avatar,
        at: Date.now()
      }).catch(function () { showToast("Could not send request. Check connection."); });
    });
  }

  function cancelFriendRequest() {
    if (!db || !me) return;
    ref("friendRequests/" + me.id).remove();
  }

  function acceptRequest(visitorId) {
    if (!db) return;
    var req = requestsCache[visitorId];
    if (!req) return;
    ref("friends/" + visitorId).set({
      name: req.name,
      avatar: req.avatar,
      at: Date.now()
    }).then(function () {
      ref("friendRequests/" + visitorId).remove();
      showToast("Friend request accepted! 🤝");
    });
  }

  function declineRequest(visitorId) {
    if (!db) return;
    ref("friendRequests/" + visitorId).remove();
    showToast("Request declined.");
  }

  function removeFriend(visitorId) {
    if (!db) return;
    ref("friends/" + visitorId).remove();
    showToast("Removed from friends.");
  }

  // Renders the friend action button (send / pending / friends)
  function renderFriendAction() {
    if (!db || !me) {
      friendActionWrap.classList.add("hidden");
      return;
    }
    friendActionWrap.classList.remove("hidden");
    var isFriend = friendsCache[me.id];
    var hasRequest = requestsCache[me.id];

    if (isFriend) {
      friendRequestBtn.textContent = "✅ Friends!";
      friendRequestBtn.disabled = true;
      friendRequestStatus.textContent = "You're on the friends list.";
    } else if (hasRequest) {
      friendRequestBtn.textContent = "⏳ Request sent";
      friendRequestBtn.disabled = true;
      friendRequestStatus.innerHTML = '<button type="button" id="cancel-request-btn" class="link-btn">Cancel request</button>';
    } else {
      friendRequestBtn.textContent = "➕ Send Friend Request";
      friendRequestBtn.disabled = false;
      friendRequestStatus.textContent = "";
    }
  }

  function renderFriends(data) {
    friendsCache = data || {};
    var ids = Object.keys(friendsCache);
    friendsCount.textContent = ids.length;

    if (!ids.length) {
      friendsGrid.innerHTML = '<p class="friends-empty">No friends yet — be the first to send a request!</p>';
    } else {
      friendsGrid.innerHTML = ids.map(function (id) {
        var f = friendsCache[id];
        return (
          '<div class="friend-item" title="' + escapeHtml(f.name) + '">' +
            '<img src="' + escapeHtml(f.avatar) + '" alt="" />' +
            "<span>" + escapeHtml(f.name) + "</span>" +
            (isOwner ? '<button type="button" class="friend-remove" data-remove-friend="' + escapeHtml(id) + '" title="Remove friend">✕</button>' : "") +
          "</div>"
        );
      }).join("");
    }
    renderFriendAction();
  }

  function renderRequests(data) {
    requestsCache = data || {};
    var ids = Object.keys(requestsCache);

    if (isOwner) {
      ownerPanel.classList.remove("hidden");
      if (!ids.length) {
        pendingList.innerHTML = '<p class="friends-empty">No pending requests.</p>';
      } else {
        pendingList.innerHTML = ids.map(function (id) {
          var r = requestsCache[id];
          return (
            '<div class="pending-item">' +
              '<img src="' + escapeHtml(r.avatar) + '" alt="" />' +
              '<div class="pending-info">' +
                "<strong>" + escapeHtml(r.name) + "</strong>" +
                "<span>" + timeAgo(r.at) + "</span>" +
              "</div>" +
              '<div class="pending-actions">' +
                '<button type="button" class="btn btn-small btn-solid" data-accept="' + escapeHtml(id) + '">Accept</button>' +
                '<button type="button" class="btn btn-small btn-outline" data-decline="' + escapeHtml(id) + '">Decline</button>' +
              "</div>" +
            "</div>"
          );
        }).join("");
      }
    }
    renderFriendAction();
  }

  // ---------- Comments ----------
  function postComment() {
    var text = commentInput.value.trim();
    if (!text) return;
    confirmIdentity(function () {
      if (!db) return;
      ref("comments").push({
        text: text.slice(0, 600),
        authorId: me.id,
        authorName: me.name,
        authorAvatar: me.avatar,
        at: Date.now(),
        likes: {},
        replies: {}
      }).catch(function () { showToast("Could not post. Check connection."); });
      commentInput.value = "";
      commentInput.style.height = "";
    });
  }

  function toggleLike(commentId) {
    confirmIdentity(function () {
      if (!db) return;
      var c = commentsCache[commentId];
      if (!c) return;
      var likes = c.likes || {};
      var path = "comments/" + commentId + "/likes/" + me.id;
      if (likes[me.id]) {
        ref(path).remove();
      } else {
        ref(path).set(true);
      }
    });
  }

  function postReply(commentId) {
    var form = $("reply-form-" + commentId);
    if (!form) return;
    var input = form.querySelector("input");
    var text = input.value.trim();
    if (!text) return;
    confirmIdentity(function () {
      if (!db) return;
      ref("comments/" + commentId + "/replies").push({
        text: text.slice(0, 300),
        authorId: me.id,
        authorName: me.name,
        authorAvatar: me.avatar,
        at: Date.now()
      }).catch(function () { showToast("Could not post reply."); });
      input.value = "";
      form.classList.add("hidden");
    });
  }

  function deleteComment(commentId) {
    if (!db) return;
    if (!confirm("Delete this comment?")) return;
    ref("comments/" + commentId).remove();
  }

  function deleteReply(commentId, replyId) {
    if (!db) return;
    if (!confirm("Delete this reply?")) return;
    ref("comments/" + commentId + "/replies/" + replyId).remove();
  }

  // ---------- Rendering comments ----------
  function renderComments(data) {
    commentsCache = data || {};
    var ids = Object.keys(commentsCache).sort(function (a, b) {
      return (commentsCache[b].at || 0) - (commentsCache[a].at || 0);
    });

    if (!ids.length) {
      commentsList.innerHTML = '<p class="comments-empty">No comments yet — start the conversation! 💬</p>';
      return;
    }

    commentsList.innerHTML = ids.map(function (id) {
      return renderComment(id, commentsCache[id]);
    }).join("");
  }

  function renderComment(id, c) {
    var likes = c.likes || {};
    var likeCount = Object.keys(likes).length;
    var liked = me && likes[me.id];
    var canDelete = (me && c.authorId === me.id) || isOwner;
    var replies = c.replies || {};
    var replyIds = Object.keys(replies).sort(function (a, b) {
      return (replies[a].at || 0) - (replies[b].at || 0);
    });

    return (
      '<div class="comment" data-comment-id="' + escapeHtml(id) + '">' +
        '<img class="comment-avatar" src="' + escapeHtml(c.authorAvatar) + '" alt="" />' +
        '<div class="comment-body">' +
          '<div class="comment-head">' +
            "<strong>" + escapeHtml(c.authorName) + "</strong>" +
            '<span class="comment-time">' + timeAgo(c.at) + "</span>" +
            (canDelete ? '<button type="button" class="comment-delete" data-delete-comment="' + escapeHtml(id) + '" title="Delete comment">🗑</button>' : "") +
          "</div>" +
          '<p class="comment-text">' + escapeHtml(c.text) + "</p>" +
          '<div class="comment-actions">' +
            '<button type="button" class="action-btn' + (liked ? " liked" : "") + '" data-like="' + escapeHtml(id) + '">❤️ ' + likeCount + "</button>" +
            '<button type="button" class="action-btn" data-reply-toggle="' + escapeHtml(id) + '">💬 Reply</button>' +
          "</div>" +
          '<form id="reply-form-' + escapeHtml(id) + '" class="reply-form hidden" data-reply-form="' + escapeHtml(id) + '">' +
            '<input type="text" maxlength="300" placeholder="Write a reply…" />' +
            '<button type="submit" class="btn btn-small btn-outline">Reply</button>' +
          "</form>" +
          (replyIds.length
            ? '<div class="replies">' + replyIds.map(function (rid) { return renderReply(id, rid, replies[rid]); }).join("") + "</div>"
            : "") +
        "</div>" +
      "</div>"
    );
  }

  function renderReply(commentId, replyId, r) {
    var canDelete = (me && r.authorId === me.id) || isOwner;
    return (
      '<div class="reply">' +
        '<img class="comment-avatar" src="' + escapeHtml(r.authorAvatar) + '" alt="" />' +
        '<div class="comment-body">' +
          '<div class="comment-head">' +
            "<strong>" + escapeHtml(r.authorName) + "</strong>" +
            '<span class="comment-time">' + timeAgo(r.at) + "</span>" +
            (canDelete ? '<button type="button" class="comment-delete" data-delete-reply="' + escapeHtml(commentId) + ':' + escapeHtml(replyId) + '" title="Delete reply">🗑</button>' : "") +
          "</div>" +
          '<p class="comment-text">' + escapeHtml(r.text) + "</p>" +
        "</div>" +
      "</div>"
    );
  }

  // ---------- Events ----------
  commentForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!db) { showToast("Database not connected yet — see README to set up Firebase."); return; }
    postComment();
  });

  commentsList.addEventListener("click", function (e) {
    var t = e.target.closest("[data-like]");
    if (t) { toggleLike(t.dataset.like); return; }

    t = e.target.closest("[data-reply-toggle]");
    if (t) {
      var form = $("reply-form-" + t.dataset.replyToggle);
      if (form) {
        var hidden = form.classList.contains("hidden");
        document.querySelectorAll(".reply-form").forEach(function (f) { f.classList.add("hidden"); });
        if (hidden) {
          form.classList.remove("hidden");
          form.querySelector("input").focus();
        }
      }
      return;
    }

    t = e.target.closest("[data-delete-comment]");
    if (t) { deleteComment(t.dataset.deleteComment); return; }

    t = e.target.closest("[data-delete-reply]");
    if (t) {
      var parts = t.dataset.deleteReply.split(":");
      deleteReply(parts[0], parts.slice(1).join(":"));
      return;
    }
  });

  commentsList.addEventListener("submit", function (e) {
    var form = e.target.closest("[data-reply-form]");
    if (!form) return;
    e.preventDefault();
    if (!db) { showToast("Database not connected yet — see README to set up Firebase."); return; }
    postReply(form.dataset.replyForm);
  });

  friendRequestBtn.addEventListener("click", function () {
    if (!db) { showToast("Database not connected yet — see README to set up Firebase."); return; }
    sendFriendRequest();
  });

  friendRequestStatus.addEventListener("click", function (e) {
    if (e.target.id === "cancel-request-btn") cancelFriendRequest();
  });

  friendsGrid.addEventListener("click", function (e) {
    var t = e.target.closest("[data-remove-friend]");
    if (t) removeFriend(t.dataset.removeFriend);
  });

  pendingList.addEventListener("click", function (e) {
    var t = e.target.closest("[data-accept]");
    if (t) { acceptRequest(t.dataset.accept); return; }
    t = e.target.closest("[data-decline]");
    if (t) declineRequest(t.dataset.decline);
  });

  identityBtn.addEventListener("click", openIdentityModal);
  visitorNameInput.addEventListener("input", function () {
    updateIdentitySaveState();
    updateAvatarPreview();
  });
  identitySaveBtn.addEventListener("click", onIdentitySaved);
  document.querySelectorAll("[data-close-identity]").forEach(function (el) {
    el.addEventListener("click", closeIdentityModal);
  });
  identityModal.addEventListener("keydown", function (e) {
    if (e.key === "Enter") onIdentitySaved();
  });

  ownerLoginBtn.addEventListener("click", function () {
    if (isOwner) {
      isOwner = false;
      localStorage.removeItem(OWNER_KEY);
      ownerPanel.classList.add("hidden");
      ownerLoginBtn.textContent = "🔑 Owner login";
      renderFriendAction();
      renderComments(commentsCache);
      renderFriends(friendsCache);
      showToast("Owner mode off.");
      return;
    }
    ownerModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    setTimeout(function () { ownerPinInput.focus(); }, 50);
  });

  function closeOwnerModal() {
    ownerModal.classList.add("hidden");
    document.body.style.overflow = "";
  }
  document.querySelectorAll("[data-close-owner]").forEach(function (el) {
    el.addEventListener("click", closeOwnerModal);
  });

  $("owner-login-confirm").addEventListener("click", function () {
    if (ownerPinInput.value === OWNER_PIN) {
      isOwner = true;
      localStorage.setItem(OWNER_KEY, "1");
      closeOwnerModal();
      ownerPinInput.value = "";
      ownerLoginBtn.textContent = "🔑 Owner: on";
      renderRequests(requestsCache);
      renderComments(commentsCache);
      renderFriends(friendsCache);
      showToast("Owner mode unlocked 🔑");
    } else {
      showToast("Wrong PIN");
      ownerPinInput.value = "";
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeIdentityModal();
      closeOwnerModal();
    }
  });

  // ---------- Realtime listeners ----------
  function startListeners() {
    if (!db) return;
    ref("comments").on("value", function (snap) { renderComments(snap.val()); });
    ref("friends").on("value", function (snap) { renderFriends(snap.val()); });
    ref("friendRequests").on("value", function (snap) { renderRequests(snap.val()); });
  }

  // ---------- Init ----------
  function init() {
    isOwner = localStorage.getItem(OWNER_KEY) === "1";
    if (isOwner) {
      ownerLoginBtn.textContent = "🔑 Owner: on";
      ownerPanel.classList.remove("hidden");
    }

    loadIdentity();
    renderVisitorChip();

    if (!db) {
      setupBanner.classList.remove("hidden");
      friendActionWrap.classList.add("hidden");
      commentsList.innerHTML =
        '<div class="setup-card">' +
          "<h3>⚙️ Almost ready!</h3>" +
          "<p>The social wall needs a free Firebase database to share comments with everyone who visits. Setup takes about 5 minutes — open <strong>README.md</strong> in this folder and follow the steps.</p>" +
        "</div>";
      return;
    }

    startListeners();
    renderFriendAction();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();