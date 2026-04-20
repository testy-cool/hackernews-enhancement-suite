/*
* Hacker News Enhancement Suite (HNES)
* Chris James / etcet.net / chris@etcet.net
*
* Thanks to both Wayne Larson and jarques for their code
*
* HN+ for Chrome v1.5 - https://github.com/jarquesp/Hacker-News--
*   by @jarques
*
* hckrnews.com extension - http://hckrnews.com/about.html
*   by Wayne Larson (wvl)
*
* Thanks to Samuel Stern for the inline replying
*
* Under MIT license, see LICENSE
*/

var CommentTracker = {
  init: function() {
    var page_info = CommentTracker.getInfo();
    HN.getLocalStorage(page_info.id, function(response) {
      var data = response.data;
      var prev_last_id = CommentTracker.process(data, page_info);
      CommentTracker.highlightNewComments(prev_last_id);
    });
  },

  highlightNewComments: function(last_id) {
    var comments = document.querySelectorAll('.hnes-comment');

    for (var i = 0; i < comments.length; i++) {
      var id = comments[i].getAttribute('id');
      var comment = HN.hnComments.nodeMap[id];

      if (id > last_id) {
        comment.el.classList.remove('hnes-new-parent')
        comment.el.classList.add('hnes-new')
        comment = comment.parent;
        while (comment && comment.level > 0) {
          if (!comment.el.classList.contains('hnes-new')) {
            comment.el.classList.add('hnes-new-parent');
          }
          comment = comment.parent;
        }
      }
    }
  },

  getInfo: function() {
    var comment_info_as = document.querySelectorAll('.subtext a');
    var comment_info_el = comment_info_as[comment_info_as.length - 1];

    // if there is no 'discuss' or 'n comment(s)' link it's some other kind of page (e.g. profile)
    if (!comment_info_el || comment_info_el.length == 0) {
      return {"id": window.location.pathname + window.location.search,
              "num": 0,
              "last_comment_id": CommentTracker.getLastCommentId()
              }
    }

    var page_id = comment_info_el.href.match(/id=(\d+)/);
    if (page_id.length) {
      page_id = Number(page_id[1]);
    }
    else {
      page_id = window.location.search.match(/id=(\d+)/);
      console.error('NO PAGEID', page_id);
    }

    var comment_info_text = comment_info_el.textContent;
    var comment_num = comment_info_text.split(" ")[0];
    if (comment_num) {
      comment_num = Number(comment_num);
    }

    var last_id = CommentTracker.getLastCommentId();

    return {"id": page_id, "num": comment_num, "last_comment_id": last_id}
  },

  getLastCommentId: function() {
    var ids = new Array();
    var comments = document.querySelectorAll('.hnes-comment');

    for (var i = 0; i < comments.length; i++) {
      var id = comments[i].getAttribute('id');
      ids.push(Number(id));
    }

    return ids.sort(function(a,b){return b-a})[0];
  },

  process: function(data, request) {
    var new_info = {
      id: request.id,
      expire: new Date().getTime() + 432000000
    }
    var info = data ? JSON.parse(data) : new_info;

    if (request.num) { info.num = request.num; }

    var last_comment_id = info.last_comment_id;
    if (request.last_comment_id)
      info.last_comment_id = request.last_comment_id;

    // store info
    HN.setLocalStorage(request.id, JSON.stringify(info));

    return last_comment_id;
  },

  checkIndexPage: function() {
    document.querySelectorAll('.comments').forEach(function(el) {
      var href = el.getAttribute('href');
      if (href) {
        var id = href.match(/id=(\d+)/);
        if(id){
            id = Number(id[1]);
        }
        else{
            //For some reason, the link we are processing is not to an HN comment section
            //I have observed this happening on dead links, which seem to grab the URL from the "web" link
            return;
        }
        HN.getLocalStorage(id, function(response) {
          if (response.data) {
            var data = JSON.parse(response.data);
            var num = Number(el.textContent);

            var diff = num - data.num;
            if (diff > 0) {
              var newcomm = document.createElement('span');
              newcomm.classList.add('newcomments');
              newcomm.title = 'New Comments';
              newcomm.textContent = diff + ' / ';
              var totalcomm = document.createElement('span');
              totalcomm.textContent = el.textContent;
              totalcomm.classList.add('totalcomments');
              totalcomm.title = 'Total Comments';
              el.textContent = '';
              el.appendChild(newcomm);
              el.appendChild(totalcomm);
            }
          }
        });
      }
    });
  }
}

var unvoteImg = chrome.runtime.getURL("images/unvote.gif");

class HNComments {
  constructor(storyId) {
    var injector = document.createElement('div');
    injector.innerHTML = `
      <template id="hnes-comment-tmpl">
          <div id="" class="hnes-comment" data-hnes-level="">
              <header>
                  <!--<span class="voter"><a href="#" class="upvote"></a><a href="#" class="downvote"></a></span>-->
                  <span class="voteblock">
                    <a href="#" class="upvoter votearrow upvote" title="Upvote"></a>
                    <a href="#" class="downvoter votearrow rotate180 downvote" title="Downvote"></a>
                  </span>
                  <a class="unvoter unvote" title="Unvote"></a>
                  <a class="collapser" title="Toggle collapse"></a>
                  <span class="score"></span>
                  <span class="author default">
                    <a href="" title="User profile"></a>
                    <span class="hnes-user-score-cont noscore" title="User score">(<span class="hnes-user-score"></span>)</span>
                    <span class="hnes-tag-cont">
                      <img class="hnes-tag" title="Tag user">
                      <span class="hnes-tagText" title="User tag"></span>
                      <input type="text" class="hnes-tagEdit" placeholder="">
                    </span>
                  </span>
                  <!--<span class="age"></span>-->
                  <a class="age permalink"></a>
                  <span class="reply-count"></span>
                  <span class="on-story nostory">on <a href=""></a></span>
              </header>
              <section class="body">
                  <div class="text">
                  </div>
                  <footer>
                      <a class="reply">reply</a>
                      <!--<a class="permalink">permalink</a>-->
                      <a class="parent">parent</a>
                  </footer>
              </section>
              <section class="replies"></div>
          </div>
      </template>
      `
    this.commentTemplate = injector.firstElementChild;
    this.storyId = storyId;
  }

  getNodeMap() {
    return this.nodeMap;
  }

  extractCommentParts(commentEl) {
    const parts = [];
    if (!commentEl) return parts;

    const container = commentEl.firstElementChild;
    if (!container) return parts;

    const p = document.createElement('p');

    let n = container.firstChild;
    while (n && !(n.nodeName == 'P' || n.nodeName == 'SPAN' || n.nodeName == 'DIV')) {
      p.appendChild(n.cloneNode(true));
      n = n.nextSibling;
    }
    parts.push(p);

    while (n && n.nodeName != 'DIV') {
      parts.push(n.cloneNode(true));
      n = n.nextSibling;
    }
    return parts;
  }

  markupToNodeList(commentTree) {
    if (!commentTree) return;

    var commentTables = commentTree.querySelectorAll('tr.athing table');
    // pages like /bestcomments don't have sub-tables
    if (!commentTables.length) {
      commentTables = commentTree.querySelectorAll('tr.athing')
    }
    if (!commentTables) return;

    const nodeList = new Array(commentTables.length + 1);

    let nodeIndex = 1,
        deleted = 0;

    nodeList[0] = { id: 'root', level: 0, children: [] };

    // record the OP so we can color their name orange
    const original_poster_el = document.querySelector('.subtext .hnuser'),
          original_poster = original_poster_el ? original_poster_el.textContent : '';
    if (original_poster_el) {
      original_poster_el.classList.add('original_poster');
    }

    for (let i = 0; i < commentTables.length; i++) {
      const
        t = commentTables[i],
        id = t.parentElement.parentElement.id || t.id,
        upVoteEl = document.getElementById('up_' + id),
        upVoteUrl = upVoteEl ? upVoteEl.href : '',
        downVoteEl = document.getElementById('down_' + id),
        downVoteUrl = downVoteEl ? downVoteEl.href : '',
        unVoteEl = document.getElementById('un_' + id),
        unVoteUrl = unVoteEl ? unVoteEl.href : '',
        isUpVoted = upVoteEl && upVoteEl.classList.contains('nosee'),
        isDownVoted = downVoteEl && downVoteEl.classList.contains('nosee'),
        replyEl = t.querySelector('.reply a'),
        replyUrl = replyEl ? replyEl.href : '',
        ageEl = t.querySelector('.age a'),
        age = ageEl ? ageEl.textContent : '',
        permalinkUrl = ageEl ? ageEl.href : '',
        userEl = t.querySelector('a.hnuser'),
        username = userEl ? userEl.textContent : '',
        userUrl = userEl ? userEl.href : '',
        commentEl = t.querySelector('div.comment'),
        isDeleted  = !(commentEl && commentEl.firstElementChild),
        textParts = isDeleted ? [] : this.extractCommentParts(commentEl),
        imgEl = t.querySelector('img'),
        level = (imgEl && (Math.floor(imgEl.getAttribute('width') / 40))) + 1,
        parentLinkEl = t.querySelector('.par a'),
        parentLinkUrl = parentLinkEl ? parentLinkEl.href : '',
        storyLinkEl = t.querySelector('.storyon a'),
        storyLinkUrl = storyLinkEl ? storyLinkEl.href : '',
        storyLinkText = storyLinkEl ? storyLinkEl.textContent : '',
        userFontEl = userEl ? userEl.querySelector('font') : '',
        userColor = userFontEl ? userFontEl.getAttribute('color') : '',
        isNoob = userColor == "#3c963c",
        isOP = username == original_poster,
        commentSpanEl = commentEl.querySelector('span'),
        commentColor = commentSpanEl ? commentSpanEl.classList[0] : 'c00',
        isDead = t.querySelector('span.comhead').textContent.includes(' [dead] '),
        scoreEl = t.querySelector('span.score'),
        score = scoreEl ? scoreEl.textContent : '';

      nodeList[nodeIndex++] = {
        id,
        level,
        upVoteUrl,
        downVoteUrl,
        unVoteUrl,
        isUpVoted,
        isDownVoted,
        replyUrl,
        age,
        username,
        userUrl,
        isDeleted,
        textParts,
        permalinkUrl,
        children: [],
        isCollapsed: false,
        isDirty: false,
        parentLinkUrl,
        storyLinkUrl,
        storyLinkText,
        isNoob,
        isOP,
        commentColor,
        isDead,
        score,
      }
    };
    return nodeList;
  }

  nodeListToTree(nodeList) {
    const s = [], m = { root: nodeList[0] };
    for (let i = 0, j = 1, data = nodeList; j < data.length && data[j]; i++, j++) {
      const p = data[i], c = data[j];
      if (c.level > p.level) s.push(p.id);
      for (let x = 0; x < p.level - c.level; x++) s.pop();
      c.parent = m[s[s.length - 1]] || data[0];
      m[c.parent.id].children.push(c);
      m[c.id] = c;
    }
    return m;
  }

  renderComment(c, into) {
    const
      kids = c.children,
      oddOrEven = c.level % 2 ? 'odd' : 'even',
      clone = document.importNode(this.commentTemplate.content, true),
      commentEl = clone.firstElementChild,
      upvoterEl = commentEl.querySelector('.upvoter'),
      downvoterEl = commentEl.querySelector('.downvoter'),
      unvoterEl = commentEl.querySelector('.unvoter'),
      parentEl = commentEl.querySelector('.parent'),
      authorEl = commentEl.querySelector('.author a'),
      userscoreEl = commentEl.querySelector('.hnes-user-score'),
      tagImageEl = commentEl.querySelector('.hnes-tag'),
      tagTextEl = commentEl.querySelector('.hnes-tagText'),
      voteblockEl = commentEl.querySelector('.voteblock');

    c.el = commentEl;
    commentEl.classList.add('comtr');

    tagImageEl.src = chrome.runtime.getURL('/images/tag.svg');

    commentEl.id = c.id;
    commentEl.classList.add(`level-${oddOrEven}`);
    commentEl.querySelector('.age').textContent = c.age;
    if (c.descCount > 0) {
      commentEl.querySelector('.reply-count').textContent = `(${c.descCount} repl${c.descCount == 1 ? 'y' : 'ies'})`;
    }
    if (c.replyUrl) {
      commentEl.querySelector('.reply').href = c.replyUrl;
    } else {
      commentEl.querySelector('.reply').classList.add('noreply');
    }
    commentEl.querySelector('.permalink').href = c.permalinkUrl;
    authorEl.textContent = c.username;
    authorEl.setAttribute('href', 'user?id=' + c.username);

    if (c.isCollapsed) commentEl.classList.add('collapsed');

    if (c.level == 1) {
      parentEl.parentNode.removeChild(parentEl);
    }
    else {
      if (c.parentLinkUrl) {
        parentEl.href = c.parentLinkUrl;
        commentEl.querySelector('.reply-count').classList.add('noreply');
      } else {
        parentEl.href = `#${c.parent.id}`;
      }
    }

    if (c.isNoob) {
      authorEl.classList.add('new_user');
    } else if (c.isOP) {
      authorEl.classList.add('original_poster');
    }

    commentEl.querySelector('a.upvote').href = c.upVoteUrl;
    commentEl.querySelector('a.downvote').href = c.downVoteUrl;
    commentEl.querySelector('a.unvote').href = c.unVoteUrl;

    // hide upvotes or downvotes if there's no url in original (i.e. not logged in or not enough karma to downvote)
    if (!c.upVoteUrl) { upvoterEl.classList.add('voted') }
    if (!c.downVoteUrl) { 
      downvoterEl.classList.add('voted')
      upvoterEl.classList.add('nodownvote')
    }
  
    if (c.isUpVoted || c.isDownVoted) {
      upvoterEl.classList.add('voted')
      downvoterEl.classList.add('voted')
    }
    if (c.unVoteUrl) {
      voteblockEl.classList.add('voted');
      unvoterEl.classList.add('voted')
      unvoterEl.style.backgroundImage = 'url(' + unvoteImg + ')'
    }

    if (c.storyLinkUrl) {
      commentEl.querySelector('.on-story').classList.remove('nostory');
      commentEl.querySelector('.on-story a').href = c.storyLinkUrl;
      commentEl.querySelector('.on-story a').textContent = c.storyLinkText;
    }

    if (c.commentColor) {
      commentEl.classList.add(c.commentColor);
    }

    if (c.isDead) {
      authorEl.classList.add('dead');
    }
    
    if (c.score) {
      commentEl.querySelector('.score').textContent = c.score + " by";
      commentEl.querySelector('.score').classList.add('visible');
    }

    var textContainer = commentEl.querySelector('.text');
    for (let parts = c.textParts, i = 0; i < parts.length; i++) {
      textContainer.appendChild(parts[i]);
    }
    textContainer.classList.add('commtext');

    commentEl.querySelector('.collapser').addEventListener('click', e => {
      e.preventDefault();
      this.collapse(c);
    }, true);

    // ajax upvotes and increments user-specific upvote data
    commentEl.querySelector('a.upvote').addEventListener('click', e => {
      e.preventDefault();
      var httpRequest = new XMLHttpRequest();
      httpRequest.onload = function(e) {
        // after upvoting, retrieve new unvote link from response
        var regex_str = "vote\\?id=" + commentEl.id + "&amp;how=un.*?'";
        var regex = new RegExp(regex_str)
        var unVoteUrl = httpRequest.responseText.match(regex)[0].slice(0, -1);
        var parser = new DOMParser;
        var dom = parser.parseFromString(
            '<!doctype html><body>' + unVoteUrl,
            'text/html');
        var decodedString = dom.body.textContent;
        c.unVoteUrl = decodedString;
        commentEl.querySelector('a.unvote').href = c.unVoteUrl;

        HN.upvoteUserData(authorEl.textContent, 1);
        upvoterEl.classList.add('voted');
        downvoterEl.classList.add('voted');
        voteblockEl.classList.add('voted');
        unvoterEl.classList.add('voted');
        unvoterEl.style.backgroundImage = 'url(' + unvoteImg + ')'
      };
      httpRequest.open('GET', c.upVoteUrl, true);
      httpRequest.send();
    }, true);

    // ajax unvote
    commentEl.querySelector('a.unvote').addEventListener('click', e => {
      e.preventDefault();
      var httpRequest = new XMLHttpRequest();
      httpRequest.onload = function(e) {
        HN.upvoteUserData(authorEl.textContent, -1);
        // only show up/down vote if we receive urls (for logged out users or low karma)
        if (c.upVoteUrl) upvoterEl.classList.remove('voted');
        if (c.downVoteUrl) downvoterEl.classList.remove('voted');
        unvoterEl.classList.remove('voted');
        voteblockEl.classList.remove('voted');
      };
      var unvote_link = c.unVoteUrl;
      httpRequest.open('GET', unvote_link, true);
      httpRequest.send();
    }, true);
    
    this.renderComments(kids, commentEl.querySelector('.replies'))
    into.appendChild(clone);
  }

  renderComments(comments, into) {
    for (let i = 0; i < comments.length; i++) {
      this.renderComment(comments[i], into);
    }
  }

  collapse(c) {
    c.isCollapsed = !c.isCollapsed;
    c.isDirty = true;
    c.el.classList.toggle('collapsed', c.isCollapsed);
    this.storeMeta();
  }

  getMeta() {
    const toStore = {};
    preorder(this.nodeMap.root, n => {
      if (n.isDirty) toStore[n.id] = { 'isCollapsed': n.isCollapsed };
    });
    return toStore;
  }

  storeMeta(items) {
    chrome.storage.local.set(this.getMeta());
  }

  loadMeta(nodeMap, callback) {
    const keys = [];
    preorder(nodeMap.root, n => {
      keys.push(n.id);
    });
    chrome.storage.local.get(keys, items => {
      callback(items);
    })
  }

  prepare(nodeMap, callback) {
    this.loadMeta(nodeMap, meta => {
      const visit = (n) => {
        let acc = 0;
        for (let i = 0; i < n.children.length; i++) {
          acc += visit(n.children[i], acc);
        }
        const res = acc + n.children.length;
        n.descCount = res;
        n.isCollapsed = (meta[n.id] && meta[n.id].isCollapsed);
        return res;
      };
      visit(nodeMap.root);
      callback(nodeMap);
    });
  }

  apply() {
    var commentTree = document.querySelector('#hnmain table.comment-tree');
    var itemList = document.querySelector('#hnmain table.itemlist');
    var threadList = document.querySelector('#hnmain table.comments-table');
    var threadList;
    if (!commentTree && !itemList && !threadList) {
      console.warn('unrecognized markup detected, no commentTree, itemList, or threadList');
      return;
    } else if (itemList) {
      commentTree = itemList;
    } else if (threadList) {
      commentTree = threadList;
    }

    const nodeMap = this.nodeListToTree(this.markupToNodeList(commentTree));

    this.prepare(nodeMap, nodeMap => {
      this.nodeMap = nodeMap;
      const commentsContainer = document.createElement('div');
      commentsContainer.id = 'hnes-comments';

      this.renderComments(this.nodeMap.root.children, commentsContainer);
      commentTree.parentNode.replaceChild(commentsContainer, commentTree);
      if (itemList) {
        commentsContainer.classList.add('nolevels')
      } else {
        // highlight new comments on threaded pages
        CommentTracker.init();
      }
      // load and show user tags and point totals
      HN.addInfoToUsers();
      var loading_comments = document.getElementById('loading_comments');
      if (loading_comments) {
        loading_comments.classList.add('hidden');
      }
    });
  }
}

function preorder(n, visit, skip) {
  var die;
  if (!n) return;
  if (!skip) die = visit(n);
  if (die) return;
  for (var i = 0; i < n.children.length; i++) {
    preorder(n.children[i], visit);
  }
}

var HN = {
    init: function() {

        HN.initElements();
        HN.removeNumbers();

        if (/*window.location.pathname != '/submit' &&*/
            window.location.pathname != '/changepw') {
          HN.rewriteNavigation();
        }

        //if user is logged in
        var logout_elem = Array.from(document.querySelectorAll('.pagetop a')).find(function(a) {
          return a.textContent.includes('logout');
        });
        if (logout_elem)
          HN.rewriteUserNav(logout_elem.parentElement);

        var pathname = window.location.pathname;
        //More link - can be post index, threads, comments, etc
        //threads is like "etcet's comments"
        //comment listings are like "New Comments"
        //add comment after logging in is "Hacker News | Add Comment"
        var track_comments = true;
        if (pathname == "/x") {
          track_comments = false;
          var title = document.title;
          var words = title.split(" ");
          if (words[1] == "Comments") {
            //normal comments - fallthrough
          }
          else if (words[1] == "comments") {
            //paginated comments, anything other than first page of comments
            //"more comments | Hacker News"
            if (words[0] == "more")
              pathname = "/more";
            //"user's comments | Hacker News"
            else
              pathname = "/threads";
          }
          else if (words[0] == "Edit") {
            pathname = "/edit";
          }
          else if (title == "Hacker News | Confirm") {
            pathname = "/confirm";
          }
          else if (title == "Hacker News | Add Comment") {
            pathname = "/reply";
          }
          else if (HN.isLoginPage()) {
            pathname = "/login";
          }
          else {
            pathname = "/news";
            //postlist
          }
        }

        var postPagesRE = /^(?:\/|\/news|\/newest|\/best|\/active|\/classic|\/submitted|\/saved|\/jobs|\/noobstories|\/ask|\/news2|\/over|\/show|\/shownew|\/hidden|\/upvoted)$/;
        if (postPagesRE.test(pathname)) {
          HN.doPostsList();

          function remove_first_tr() {
            var firstTr = document.querySelector('#content td table tbody tr');
            if (firstTr) firstTr.remove();
          }
          if (pathname == '/jobs') {
            document.body.id = "jobs-body";
          }
          if (pathname == '/show' || pathname == '/jobs') {
            remove_first_tr();
            var blurbRow = document.querySelector('#content td table tbody tr:not(.athing)');
            var blurb = blurbRow ? blurbRow.querySelector('td:last-child') : null;
            var blurbHtml = blurb ? blurb.innerHTML : '';
            if (blurbRow) blurbRow.remove();
            var blurbP = document.createElement('p');
            blurbP.classList.add('blurb');
            blurbP.innerHTML = blurbHtml;
            var contentTable = document.querySelector('#content table');
            if (contentTable) contentTable.before(blurbP);
          }
        }
        else if (pathname == '/edit') {
          document.body.id = "edit-body";
          var editTd = document.querySelector("tr:nth-child(3) td td:first-child");
          if (editTd) editTd.remove();
        }
        else if (pathname == '/item' ||
                 pathname == "/more" ||
                 pathname == "/bestcomments" ||
                 pathname == "/noobcomments" ||
                 pathname == "/newcomments") {

          var morelink = document.querySelector('.morelink');
          if (morelink) {
            var morelink_href = morelink.href;
            document.getElementById('content').after(morelink);
          }

          let storyIdResults = /id=(\w+)/.exec(window.location.search)
          let storyId = false;
          if (storyIdResults) {
            storyId = /id=(\w+)/.exec(window.location.search)[1] ;
          }
          HN.hnComments = new HNComments(storyId);
          HN.doCommentsList(pathname, track_comments);
        }
        else if (pathname == '/favorites' ||
                 pathname == '/upvoted') {
          document.querySelectorAll("td[colspan='2']").forEach(function(el) { el.style.display = 'none'; });
          document.querySelectorAll(".votelinks").forEach(function(el) { el.style.display = 'none'; });
          document.querySelectorAll(".ind").forEach(function(el) { el.style.display = 'none'; });
        }
        else if (pathname == '/threads') {
          document.body.id = "threads-body";

          //create new table and try to emulate /item
          var trs = Array.from(document.querySelectorAll('body > center > table > tbody > tr'));
          var comments = trs.slice(2, -1);
          var newtable = document.createElement('table');
          var newtbody = document.createElement('tbody');
          comments.forEach(function(c) { newtbody.appendChild(c); });
          newtable.appendChild(newtbody);
          var threadTd = trs[1].querySelector('td');
          if (threadTd) threadTd.appendChild(newtable);

          var morelink = document.querySelector('.morelink');
          if (morelink) {
            var morelink_href = morelink.href;
            if (threadTd) threadTd.appendChild(morelink);
          }

          HN.hnComments = new HNComments(0);
          HN.doCommentsList(pathname, track_comments);
        }
        else if (pathname == '/user') {
          HN.doUserProfile();
        }
        else if (pathname == '/newslogin' ||
                 pathname == '/login') {
          HN.doLogin();
        }
        else if ((pathname == '/reply') && HN.isLoginPage()) {
          HN.doLogin(); // reply when not logged in
        }
        else if ((pathname == '/submit') && HN.isLoginPage()) {
          HN.doLogin(); // submit when not logged in
        }
        else if (pathname == '/newpoll') {
          HN.doPoll();
        }
        else {
          //make sure More link is in correct place
          document.querySelectorAll('.title').forEach(function(el) {
            if (el.textContent.includes('More') && el.previousElementSibling) {
              el.previousElementSibling.setAttribute('colspan', '1');
            }
          });
        }
    },

    doPoll: function() {
      document.body.id = 'poll-body';
    },

    isLoginPage: function() {
      return Array.from(document.querySelectorAll('b')).some(function(el) {
        return el.textContent === 'Login';
      });
    },

    isLoggedIn: function() {
      var links = document.querySelectorAll('.pagetop a');
      return Array.from(links).some(function(a) {
        return a.textContent.toLowerCase() === 'logout';
      });
    },

    initElements: function() {
      var rows = document.querySelectorAll('body > center > table > tbody > tr');
      var header = rows[0];
      if (!header) return;

      var headerTd = header.querySelector('td');
      if (headerTd && headerTd.getAttribute('bgcolor') === '#000000') {
        // mourning mode
        var mourningRow = header;
        header = rows[1];
        mourningRow.remove();
        document.body.classList.add('mourning');
      }
      header.id = 'header';

      // Re-query rows after potential removal
      var freshRows = document.querySelectorAll('body > center > table > tbody > tr');
      var contentIndex = 2;
      if (freshRows[1] && freshRows[1].querySelector('.pagetop')) {
        contentIndex++;
      }

      if (freshRows[contentIndex]) {
        freshRows[contentIndex].id = 'content';
      }

      // Remove empty tr between header and content
      if (freshRows[contentIndex - 1]) {
        freshRows[contentIndex - 1].remove();
      }

      var headerTableTd = document.querySelector('#header table td');
      if (headerTableTd) headerTableTd.removeAttribute('style');

      var lastTitle = document.querySelector('tr:last-child .title');
      if (lastTitle) lastTitle.id = 'more';

      document.querySelectorAll('tr[style="height:7px"]').forEach(function(el) { el.remove(); });
      document.querySelectorAll('tr[style="height:2px"]').forEach(function(el) { el.remove(); });

      var yclinks = document.querySelector('.yclinks');
      if (yclinks) {
        var centerEl = yclinks.closest('center');
        if (centerEl) centerEl.style.width = '100%';
      }

      var search_domain = "hn.algolia.com";
      HN.setSearchInput(document.querySelector('input[name="q"]'), search_domain);

      var icon = document.querySelector('img[src="y18.gif"]');
      if (icon) {
        if (icon.parentElement) icon.parentElement.href = 'http://news.ycombinator.com/';
        icon.title = 'Hacker News';
      }
    },

    injectCSS: function() {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = 'news.css';
      document.head.appendChild(link);
    },

    getLocalStorage: function(key, callback) {
      chrome.runtime.sendMessage({
        method: "getLocalStorage",
        key: key
      }, callback);
    },

    setLocalStorage: function(key, value) {
      chrome.runtime.sendMessage(
        { method: "setLocalStorage",
          key: key,
          value: value },
        function(response) {
        });
    },

    getUserData: function(usernames, callback) {
      chrome.runtime.sendMessage({
        method: "getUserData",
        usernames: usernames
      }, callback);
    },

    doLogin: function() {
      document.body.id = 'login-body';
      document.title = "Login | Hacker News";

      HN.injectCSS();

      // save and remove (to be re-added later) any rogue messages outside of any tag (e.g. "Bad login.")
      var messageText = '';
      Array.from(document.body.childNodes).forEach(function(node) {
        if (node.nodeType === 3) {
          messageText += node.textContent;
          node.remove();
        }
      });
      var message = messageText.trim();

      var recover_password_link = document.querySelector('body > a');
      if (recover_password_link)
        recover_password_link.remove();

      // remove login header, submit button (will be re-added later)
      var firstB = document.querySelector('body > b');
      if (firstB) firstB.remove();
      var submitBtn = document.querySelector('form input[type="submit"]');
      var buttonHtml = submitBtn.outerHTML;
      submitBtn.remove();

      var headerHtml = '<tr id="header"><td bgcolor="#ff6600"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding:2px"><tbody><tr><td><a href="http://ycombinator.com"><img src="y18.gif" width="18" height="18" style="border:1px #ffffff solid;"></a></td><td><span class="pagetop" id="top-navigation"><span class="nav-links"><span><a href="/news" class="top" title="Top stories">top</a>|</span><span><a href="/newest" class="new" title="Newest stories">new</a>|</span><span><a href="/best" class="best" title="Best stories">best</a></span></div></span></span></td></tr></tbody></table></td></tr>';

      // wrap content into a table
      var loginForm = document.querySelector('body > form');
      loginForm.id = 'login-form';

      // build: <center><table><tbody><tr id="header">...</tr><tr id="content"><td><form...></td></tr></tbody></table></center>
      var contentTd = document.createElement('td');
      contentTd.appendChild(loginForm);

      var contentTr = document.createElement('tr');
      contentTr.id = 'content';
      contentTr.appendChild(contentTd);

      var tbody = document.createElement('tbody');
      tbody.innerHTML = headerHtml;
      tbody.appendChild(contentTr);

      var table = document.createElement('table');
      table.setAttribute('border', '0');
      table.setAttribute('cellpadding', '0');
      table.setAttribute('cellspacing', '0');
      table.setAttribute('width', '85%');
      table.appendChild(tbody);

      var center = document.createElement('center');
      center.appendChild(table);

      document.body.appendChild(center);

      // add submit button row after last row of login-form
      var loginFormLastRow = document.querySelector('#login-form tr:last-child');
      var buttonRow = document.createElement('tr');
      buttonRow.innerHTML = '<td></td><td>' + buttonHtml + '</td>';
      loginFormLastRow.parentNode.insertBefore(buttonRow, loginFormLastRow.nextSibling);

      // add h1 before login-form
      var h1 = document.createElement('h1');
      h1.textContent = 'Login';
      loginForm.parentNode.insertBefore(h1, loginForm);

      if (recover_password_link)
        loginForm.parentNode.insertBefore(recover_password_link, loginForm);

      // re-add rogue messages previously removed
      if (message) {
        var msgP = document.createElement('p');
        msgP.id = 'login-msg';
        msgP.textContent = message;
        var contentH1 = document.querySelector('tr#content > td:first-child > h1');
        contentH1.parentNode.insertBefore(msgP, contentH1);
      }

      // register?
      var hasCreateAccount = Array.from(document.querySelectorAll('b')).some(function(el) {
        return el.textContent === 'Create Account';
      });
      if (hasCreateAccount) {
        HN.doCreateAccount();
      }
    },

    doCreateAccount: function() {
      // first check if doLogin() has already built a login prompt,
      // then check if there is another form present (e.g. Create Account)
      if (document.body.id !== 'login-body') return;
      if (!document.querySelector('body > form')) return;

      // save and remove title/form
      var bodyB = document.querySelector('body > b');
      if (bodyB) bodyB.remove();
      var registerForm = document.querySelector('body > form');
      registerForm.id = 'register-form';
      var formContent = registerForm.outerHTML;
      registerForm.remove();

      // rebuild title/form inside the existing table
      var contentTdLast = document.querySelector('tr#content > td:last-child');
      contentTdLast.insertAdjacentHTML('beforeend', formContent);

      var regForm = document.getElementById('register-form');
      var regSubmitBtn = regForm.querySelector('input[type="submit"]');
      var buttonHtml = regSubmitBtn.outerHTML;
      regSubmitBtn.remove();

      var regLastRow = regForm.querySelector('tr:last-child');
      var buttonRow = document.createElement('tr');
      buttonRow.innerHTML = '<td></td><td>' + buttonHtml + '</td>';
      regLastRow.parentNode.insertBefore(buttonRow, regLastRow.nextSibling);

      var h1 = document.createElement('h1');
      h1.textContent = 'Create Account';
      regForm.parentNode.insertBefore(h1, regForm);
    },

    doPostsList: function() {
      document.body.id = 'index-body';

      HN.init_keys();

      //HN.removeUpvotes();
      //with upvotes, the 'more' link needs to be shifted 1 more col
      HN.moveMoreLink();
      HN.formatScore();
      HN.formatURL();
      HN.showGithubStars();

      //check for new comments
      CommentTracker.checkIndexPage();
      //heat map points
      HN.getAndRateStories();
      //enable highlighting of clicked links
      HN.enableLinkHighlighting();

      HN.replaceVoteButtons(true);
    },

    doCommentsList: function(pathname, track_comments) {

      //add classes to comment page header (OP post) and the table containing all the comments
      var comments;

      let itemIdResults = /id=(\w+)/.exec(window.location.search)
      var itemId = false;
      if (itemIdResults) {
        itemId = /id=(\w+)/.exec(window.location.search)[1] ;
      }
      var below_header = document.getElementById('content').querySelectorAll('table');

      var loadingP = document.createElement('p');
      loadingP.id = 'loading_comments';
      loadingP.textContent = 'Loading comments';
      if (below_header[1]) {
        below_header[1].parentNode.insertBefore(loadingP, below_header[1]);
      }

      if (pathname == "/item") {
        document.body.id = "item-body";
        below_header[0].classList.add('item-header');

        comments = below_header[1];
        comments.classList.add('comments-table');

        var poll = document.querySelector('.item-header table');
        if (poll)
          HN.graphPoll(poll);

        //linkify self-post text
        var selfPostRow = document.querySelector('.item-header tr:nth-child(3)');
        if (selfPostRow) {
          selfPostRow.classList.add('self-post-text');
          linkifyElement(selfPostRow);
        }

        //fix spacing issue #86
        document.querySelectorAll(".item-header td").forEach(function(td) { td.removeAttribute('colspan'); });

        //fixes issue #121 (indent on individual comment pages)
        document.querySelectorAll(".item-header td[class='ind']").forEach(function(td) { td.remove(); });

        // move reply button to new line.
        var submitBtn = document.querySelector(".item-header input[type='submit']");
        if (submitBtn) submitBtn.style.display = "block";

        var more = document.querySelector('.morelink');
        //recursively load more pages on closed thread
        if (more) {
          HN.loadMoreLink(more);
        } else {
          HN.doAfterCommentsLoad();
        }
      }
      else {// if (pathname == "/threads") {
        document.body.id = "threads-body";
        comments = below_header[0];
        comments.classList.add('comment-tree');
        HN.doAfterCommentsLoad();
      }

      //do not want to track comments on 'more' pages
      //TODO: infinite scroll and tracking on 'more' pages
      //if (track_comments) {
      //  CommentTracker.init();
      //}
    },

    doUserProfile: function() {
      document.querySelector('#content > td').id = 'user-profile';

      var options = document.querySelectorAll('tr > td[valign="top"]');
      var user = options[0];
      var created = options[1];
      var karma = options[2];
      var about = options[3];

      if (options.length === 4) {
        //other user pages
        var submittedLink = document.querySelector('#user-profile a[href^="submitted"]');
        if (submittedLink) submittedLink.parentElement.id = 'others-profile-submitted';
        linkifyElement(about.nextElementSibling);
      }
      else {
        //your user page
        document.getElementById('user-profile').classList.add('your-profile');
        var email = options[4];
        var showdead = options[5];
        var noprocrast = options[6];
        var maxvisit = options[7];
        var minaway = options[8];
        var delay;
        var hasTopcolor = Array.from(options).some(function(td) {
          return td.textContent.indexOf('topcolor:') !== -1;
        });
        if (hasTopcolor) {
          var topcolor = options[9];
          topcolor.classList.add('select-option');
          var topcolorSpan = document.createElement('span');
          topcolorSpan.textContent = 'Default: ff6600';
          topcolor.nextElementSibling.appendChild(topcolorSpan);
          delay = options[10];
        }
        else {
          delay = options[11];
        }

        //fix spacing
        email.classList.add('select-option');
        showdead.classList.add('select-option');
        noprocrast.classList.add('select-option');
        maxvisit.classList.add('select-option');
        minaway.classList.add('select-option');
        delay.classList.add('select-option');
        var changePwLink = document.querySelector('#user-profile a[href="changepw"]');
        if (changePwLink) changePwLink.parentElement.id = 'your-profile-change-password';

        var current_karma = parseInt(karma.nextElementSibling.textContent);
        var karma_for_flag = 21;
        var karma_for_polls = 201;
        var karma_for_downvotes = 501;
        var can_flag_msg;
        var can_create_polls_msg;
        var can_downvote_msg;
        if (current_karma < karma_for_flag) {
          can_flag_msg = document.createElement('p');
          can_flag_msg.textContent = 'You need ' + (karma_for_flag - current_karma) + ' more karma until you can flag posts.';
        }
        else {
          can_flag_msg = document.createElement('p');
          can_flag_msg.textContent = 'You can flag posts.';
        }
        if (current_karma < karma_for_polls) {
          can_create_polls_msg = document.createElement('p');
          can_create_polls_msg.textContent = 'You need ' + (karma_for_polls - current_karma) + ' more karma until you can create a poll.';
        }
        else {
          can_create_polls_msg = document.createElement('p');
          can_create_polls_msg.innerHTML = 'You can <a href="//news.ycombinator.com/newpoll">create a poll</a>.';
        }
        if (current_karma < karma_for_downvotes) {
          can_downvote_msg = document.createElement('p');
          can_downvote_msg.textContent = 'You need ' + (karma_for_downvotes - current_karma) + ' more karma until you can downvote comments.';
        }
        else {
          can_downvote_msg = document.createElement('p');
          can_downvote_msg.textContent = 'You can downvote comments.';
        }
        var karmaNext = karma.nextElementSibling;
        karmaNext.appendChild(can_flag_msg);
        karmaNext.appendChild(can_create_polls_msg);
        karmaNext.appendChild(can_downvote_msg);

        var aboutNext = about.nextElementSibling;
        var about_help = aboutNext.querySelector('a[href="formatdoc"]');
        about_help.addEventListener('click', function(e) {
          e.preventDefault();
          var input_help = aboutNext.querySelector('.input-help');
          if (input_help) {
            input_help.remove();
          }
          else {
            aboutNext.appendChild(HN.getFormattingHelp(false));
          }
        });

        var dead_explanation = document.createElement('p');
        dead_explanation.textContent = 'Showdead allows you to see all the submissions and comments that have been killed by the editors.';
        var showdeadNext = showdead.nextElementSibling;
        var showdeadSpan = document.createElement('span');
        showdeadSpan.textContent = 'Default: no';
        showdeadNext.appendChild(showdeadSpan);
        showdeadNext.appendChild(dead_explanation);

        var noprocrast_explanation = document.createElement('p');
        noprocrast_explanation.textContent = 'Noprocast is a way to prevent yourself from spending too much time on Hacker News. If you turn it on you\'ll only be allowed to visit the site for maxvisit minutes at a time, with gaps of minaway minutes in between.';
        var noprocastNext = noprocrast.nextElementSibling;
        var noprocastSpan = document.createElement('span');
        noprocastSpan.textContent = 'Default: no';
        noprocastNext.appendChild(noprocastSpan);
        noprocastNext.appendChild(noprocrast_explanation);

        var maxvisitSpan = document.createElement('span');
        maxvisitSpan.textContent = 'Default: 20';
        maxvisit.nextElementSibling.appendChild(maxvisitSpan);

        var minawaySpan = document.createElement('span');
        minawaySpan.textContent = 'Default: 180';
        minaway.nextElementSibling.appendChild(minawaySpan);

        var delay_explanation = document.createElement('p');
        delay_explanation.textContent = 'Delay allows you to delay the public posting of comments you make for delay minutes.';
        var delayNext = delay.nextElementSibling;
        var delaySpan = document.createElement('span');
        delaySpan.textContent = 'Default: 0';
        delayNext.appendChild(delaySpan);
        delayNext.appendChild(delay_explanation);

        //redirect to profile page after updating, instead of /x page
        document.querySelector('input[value="update"]').addEventListener('click', function() {
          HN.setLocalStorage('update_profile', window.location.href);
        });
      }
    },

    getFormattingHelp: function(links_work) {
      var help = '<p>Blank lines separate paragraphs.</p>' +
                 '<p>Text after a blank line that is indented by two or more spaces is reproduced verbatim (this is intended for code).</p>' +
                 '<p>Text surrounded by asterisks is italicized, if the character after the first asterisk isn\'t whitespace.</p>';
      if (links_work)
        help += '<p>Urls become links.</p>';

      var div = document.createElement('div');
      div.classList.add('input-help');
      div.innerHTML = help;
      return div;
    },

    prettyPrintDaysAgo: function(days) {
      //copied from http://stackoverflow.com/a/8942982
      var str = '';
      var values = {
        ' year': 365,
        ' month': 30,
        ' day': 1
      };

      for (var x in values) {
        var amount = Math.floor(days / values[x]);

        if (amount >= 1) {
          str += amount + x + (amount > 1 ? 's' : '');
          if (x != ' day') {
            str += ' ';
          }
          days -= amount * values[x];
        }
      }

      return str;
    },

    graphPoll: function(poll) {
      var poll_max_width = 500;
      var totalscore = 0;
      var poll_scores = poll.querySelectorAll('.default');
      poll_scores.forEach(function(el) {
        var score = Number(el.textContent.split(' ')[0]);
        totalscore += score;
      });
      poll_scores.forEach(function(el) {
        var score = Number(el.textContent.split(' ')[0]);
        if (score > 0) {
          var width = Math.max(1, score / totalscore * poll_max_width);
          var tr = document.createElement('tr');
          var td1 = document.createElement('td');
          var td2 = document.createElement('td');
          var div = document.createElement('div');
          div.classList.add('poll-graph');
          div.style.width = width + 'px';
          td2.appendChild(div);
          tr.appendChild(td1);
          tr.appendChild(td2);
          el.parentElement.after(tr);
        }
      });
    },

    loadMoreLink: function(elem) {
      if (!elem) {
        HN.doAfterCommentsLoad();
        return;
      }

      var loading_comments = document.getElementById('loading_comments')
      if (loading_comments) {
        loading_comments.textContent += '.';
      }

      var moreurl = elem.getAttribute('href') || elem.href;
      fetch(moreurl).then(function(r) { return r.text(); }).then(function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var rows = doc.querySelectorAll('center > table > tbody > tr:nth-child(3) > td > table > tbody > tr');
        var commentsBody = document.querySelector(".comments-table > tbody");
        rows.forEach(function(row) {
          commentsBody.appendChild(document.adoptNode(row));
        });
        var oldMorelink = document.querySelector(".morelink");
        if (oldMorelink) oldMorelink.remove();
        var morelink = document.querySelector('.title a[rel="nofollow"]');
        if (morelink && morelink.textContent.indexOf('More') !== -1) {
          HN.loadMoreLink(morelink);
        } else {
          HN.doAfterCommentsLoad();
        }
      });
    },

    doAfterCommentsLoad: function() {
      HN.hnComments.apply();
      var loading_comments = document.getElementById("loading_comments");
      if (loading_comments) {
        loading_comments.textContent = "Rendering comments...";
      }
    },

    replaceVoteButtons: function(isPostList) {
      document.querySelectorAll('img[src$="grayarrow.gif"]').forEach(function(img) {
        var div = document.createElement('div');
        div.className = 'up-arrow';
        img.replaceWith(div);
      });
      document.querySelectorAll('img[src$="graydown.gif"]').forEach(function(img) {
        var div = document.createElement('div');
        div.className = 'down-arrow last-arrow';
        img.replaceWith(div);
      });

      if (isPostList) {
        document.querySelectorAll('div.up-arrow').forEach(function(el) {
          el.classList.add('postlist-arrow');
        });
      } else {
        // any up-arrows that don't have a down arrow next to them, add the last-arrow class
        // as well, which will give a bit extra margin before the show/hide link
        document.querySelectorAll('div.up-arrow').forEach(function(el) {
          var center = el.closest('center');
          if (center && center.querySelectorAll('a').length == 1) {
            el.classList.add('last-arrow');
          }
        });
      }
    },

    addInfoToUsers: function() {
      var author_els = document.querySelectorAll('.author a');
      var usernames = Array.from(author_els).map( x => x.textContent );

      HN.getUserData(usernames, response => {
        if (!response) return;
        var userData = response.data;
        for (var i = 0; i < author_els.length; i++) {
          var author_el = author_els[i],
              name = usernames[i],
              userInfo = userData[name];

          if (userInfo) {
            if (typeof userInfo === "number") {
              //Convert the legacy format.
              //  Upvotes used to be saved in localStorage as (for example) etcet: '1', but are now etcet: '{"votes": 1}'.
              //  This change in format was made so that tag information can be saved in the same location;
              //  i.e. it will soon be saved as etcet: '{"votes": 1, "tag": "Creator of HNES"}'.
              //
              //  The conversion only needs to be done here, since this executes on page load,
              //  which means that whatever username you see will have undergone the conversion to the new format.
              userInfo = {'votes': userInfo};
              HN.setLocalStorage(name, JSON.stringify(userInfo));
              console.log('Converted legacy format for user', name);
            }
            else {
              var info;
              try {
                info = JSON.parse(userInfo);
              }
              catch (e) {
                info = {}
              }
              // display user tag and score
              if (info.tag) HN.displayUserTag(author_el, info.tag || '');
              if (info.votes) HN.displayUserScore(author_el, info.votes);
            }
          }
        };
      });


      document.addEventListener('click', function(e) {
        if (e.target.matches('.hnes-tag, .hnes-tagText')) {
          HN.editUserTag(e);
        }
      });

      document.addEventListener('keyup', function(e) {
        if (e.target.matches('.hnes-tagEdit')) {
          var code = e.keyCode || e.which,
              parent = e.target.parentElement,
              gp = parent.parentElement;

          if (code === 13) { // Enter
            var author = gp.querySelector('a').textContent,
                tagEdit = parent.querySelector('.hnes-tagEdit');
            HN.setUserTag(author, tagEdit.value);
            parent.classList.remove('edit');
          }
          if (code === 27) { // Escape
            var tagText = parent.querySelector('.hnes-tagText'),
                tagEdit = parent.querySelector('.hnes-tagEdit');
            tagEdit.value = tagText.textContent;
            parent.classList.remove('edit');
          }
        }
      });
    },

    upvoteUserData: function(author, value) { // Adds value to the user's upvote count, saves and displays it.
      HN.getLocalStorage(author, function(response) {
        var userInfo = {},
        new_upvote_total = value;

        if (response.data) {
          userInfo = JSON.parse(response.data);
        }

        if (userInfo.votes) { // If we already have up/downvoted this user before.
          new_upvote_total += userInfo.votes;
        }
        userInfo.votes = new_upvote_total;
        if (new_upvote_total === 0) {
          delete userInfo.votes;
        }
        HN.setLocalStorage(author, JSON.stringify(userInfo));
        HN.showNewUserScore(author, new_upvote_total); // Set the upvote count
      });
    },

    showNewUserScore: function(author, value) {
      document.querySelectorAll('.author').forEach(function(author_el) {
        if (author_el.textContent.indexOf(author) === -1) return;
        var score_el = author_el.querySelector('.hnes-user-score');
        if (!score_el) return;
        if (value !== 0) {
          score_el.textContent = value;
          score_el.parentElement.classList.remove('noscore');
        } else {
          score_el.parentElement.classList.add('noscore');
        }
      });
    },

    displayUserScore: function(el, upvotes) {
      userscoreEl = el.parentElement.querySelector('.hnes-user-score');
      userscoreEl.textContent = upvotes;
      userscoreEl.parentElement.classList.remove('noscore');
    },

    displayUserTag: function(el, tag) {
      if (tag) {
        el.parentElement.querySelector('.hnes-tagText').textContent = tag;
        el.parentElement.querySelector('.hnes-tagEdit').value = tag;
      }
    },

    editUserTag: function(e) {
      var parent = e.target.parentElement,
          tagEdit = parent.querySelector('.hnes-tagEdit'),
          tagText = parent.querySelector('.hnes-tagText');
      parent.classList.add('edit');
      tagEdit.focus();
    },

    setUserTag: function(author, tag) {
      HN.getLocalStorage(author, function(response) {
        var userInfo = {};

        if (response.data)
          userInfo = JSON.parse(response.data);

        if (tag !== '')
          userInfo.tag = tag;
        else
          delete userInfo.tag;

        HN.setLocalStorage(author, JSON.stringify(userInfo));
      });

      document.querySelectorAll('.author').forEach(function(el) {
        if (el.textContent.indexOf(author) === -1) return;
        var tagText = el.parentElement.querySelector('.hnes-tagText'),
            tagEdit = el.parentElement.querySelector('.hnes-tagEdit');
        if (!tagText || !tagEdit) return;

        // Change it all to the new value:
        tagText.textContent = tag;
        tagEdit.value = tag;
      });
    },

    removeNumbers: function() {
      document.querySelectorAll('td[align="right"]').forEach(function(el) { el.remove(); });
    },

    formatScore: function() {
      document.querySelectorAll('.subtext').forEach(function(subtext){
        var scoreSpan = subtext.querySelector('span');
        var as = subtext.querySelectorAll('a');
        var by = as[0];
        var at = as[1];
        var comments;

        var score;
        if (!scoreSpan || scoreSpan.classList.contains('hnuser') ||
            !scoreSpan.textContent.includes('point')) {
          score = document.createElement('span');
          score.textContent = '0';
        } else {
          score = scoreSpan;
          score.textContent = parseInt(score.textContent);
        }
        score.classList.add('score');
        score.title = 'Points';

        var lastA = as[as.length - 1];
        if (lastA && lastA.textContent !== 'web') {
          comments = lastA;
        } else {
          comments = document.createElement('a');
          comments.textContent = '-';
        }

        var comments_link = at ? at.getAttribute('href') : '';

        if (comments.textContent === 'discuss' || /ago$/.test(comments.textContent)) {
          var newComments = document.createElement('a');
          newComments.textContent = '0';
          newComments.href = comments.getAttribute('href') || '';
          comments = newComments;
        } else if (comments.textContent === 'comments') {
          var newComments = document.createElement('a');
          newComments.textContent = '?';
          newComments.href = comments.getAttribute('href') || '';
          comments = newComments;
        } else if (comments.textContent === '') {
          score.textContent = '';
        } else {
          comments.textContent = parseInt(comments.textContent) || '-';
        }

        if (comments_link) comments.setAttribute('href', comments_link);
        comments.classList.add('comments');
        comments.title = 'Comments';

        var by_el;
        if (!by) {
          by_el = document.createElement('span');
        } else {
          by_el = document.createElement('span');
          by_el.classList.add('submitter');
          by_el.textContent = 'by ';
          by.title = 'View profile';
          by_el.appendChild(by);
        }

        var score_td = document.createElement('td');
        score_td.appendChild(score);
        var comments_td = document.createElement('td');
        comments_td.appendChild(comments);

        var prevRow = subtext.parentElement.previousElementSibling;
        prevRow.prepend(score_td);
        prevRow.prepend(comments_td);
        var titleEl = prevRow.querySelector('.title');
        if (titleEl) titleEl.appendChild(by_el);

        // Remove spacer row after subtext
        var nextRow = subtext.parentElement.nextElementSibling;
        if (nextRow) nextRow.remove();
        subtext.parentElement.remove();

        // Build hnes-actions span
        var actions = document.createElement('span');
        actions.classList.add('hnes-actions');
        var actionSels = [
          'a[href^=flag]', 'a[href^=vouch]',
          'a[href^="https://hn.algolia.com/?query="]',
          'a[href^=hide]',
          'a[href^="https://www.google.com/search?q="]'
        ];
        actionSels.forEach(function(sel) {
          var el = subtext.querySelector(sel);
          if (el) actions.appendChild(el);
        });
        by_el.after(actions);

        // Build hnes-age span
        var ageSpan = document.createElement('span');
        ageSpan.classList.add('hnes-age');
        ageSpan.textContent = at ? at.textContent : '';
        by_el.after(ageSpan);
      });
    },

    highlightCommentsLink: function(e) {
      this.classList.toggle('hover-comments-score');
      if (this.nextElementSibling)
        this.nextElementSibling.classList.toggle('hover-comments-score');
    },
    highlightScoreLink: function(e) {
      this.classList.toggle('hover-comments-score');
      if (this.previousElementSibling)
        this.previousElementSibling.classList.toggle('hover-comments-score');
    },

    formatURL: function() {
        document.querySelectorAll('.comhead').forEach(function(el) {
          var text = el.textContent;
          var url_el = document.createElement('span');
          url_el.textContent = text.substring(2, text.length - 1);
          var left_paren = document.createElement('span');
          left_paren.className = 'paren';
          left_paren.textContent = '(';
          var right_paren = document.createElement('span');
          right_paren.className = 'paren';
          right_paren.textContent = ')';
          el.textContent = '';
          el.appendChild(left_paren);
          el.appendChild(url_el);
          el.appendChild(right_paren);
        });
    },

    showGithubStars: function() {
      chrome.runtime.sendMessage(
        { method: 'getLocalStorage', key: 'hnes_show_github_stars' },
        function(response) {
          if (response && response.data === 'false') return;
          HN._fetchAndDisplayStars();
        }
      );
    },

    _fetchAndDisplayStars: function() {
      var ghLinks = {};
      var ghPattern = /^https?:\/\/github\.com\/([^\/]+\/[^\/]+)\/?/;

      document.querySelectorAll('.title a:not(.comments)').forEach(function(el) {
        var href = el.getAttribute('href');
        if (!href) return;
        var match = ghPattern.exec(href);
        if (match) {
          var repo = match[1].replace(/\.git$/, '');
          ghLinks[repo] = ghLinks[repo] || [];
          ghLinks[repo].push(el);
        }
      });

      var repos = Object.keys(ghLinks);
      if (repos.length === 0) return;

      chrome.runtime.sendMessage(
        { method: 'fetchGithubStars', repos: repos },
        function(response) {
          if (!response || !response.data) return;
          for (var repo in response.data) {
            var stars = response.data[repo];
            var els = ghLinks[repo];
            if (!els) continue;
            for (var i = 0; i < els.length; i++) {
              var badge = document.createElement('a');
              badge.className = 'hnes-gh-stars';
              badge.href = 'https://github.com/' + repo;
              badge.target = '_blank';
              badge.title = stars.toLocaleString() + ' stars on GitHub';
              badge.innerHTML = '<svg class="hnes-gh-icon" viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg> ' + HN._formatStarCount(stars);
              els[i].closest('td').querySelector('.comhead').after(badge);
            }
          }
        }
      );
    },

    _formatStarCount: function(n) {
      if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      return String(n);
    },

    moveMoreLink: function() {
      var more = document.getElementById('more');
      if (more && more.previousElementSibling) {
        more.previousElementSibling.setAttribute('colspan', '3');
      }
    },
    removeUpvotes: function() {
      var titles = document.querySelectorAll('.title');
      var titleArr = Array.prototype.slice.call(titles);
      var hasMore = titleArr.length > 0 && titleArr[titleArr.length - 1].id === 'more';
      var toProcess = hasMore ? titleArr.slice(0, -1) : titleArr;
      toProcess.forEach(function(el) {
        var parent = el.parentNode;
        Array.prototype.slice.call(parent.children).forEach(function(child) {
          if (child !== el) child.remove();
        });
      });
    },

    rewriteUserNav: function(pagetop) {

      var user_links = document.createElement('span');
      user_links.classList.add('nav-links');
      var as = pagetop.querySelectorAll('a');
      var user_profile = as[0];
      var logout = as[1];
      var user_name = user_profile.textContent;

      var user_drop = document.createElement('span');
      var user_drop_a = document.createElement('a');
      user_drop_a.textContent = user_name;
      user_drop_a.href = '#';
      user_drop.appendChild(user_drop_a);
      user_drop.title = 'Toggle user links';
      user_drop.id = 'my-more-link';
      user_drop.classList.add('more-arrow');

      logout.remove();
      // Keep a hidden user link so HACKERSMACKER can find the logged-in user
      // via its '.pagetop a[href^=user]' selector
      user_profile.style.display = 'none';
      var score_str = pagetop.textContent;
      var regex = /\(([^)]+)\)/;
      var matches = regex.exec(score_str);
      var score = matches ? matches[1] : '0';

      var score_elem = document.createElement('span');
      score_elem.appendChild(document.createTextNode('|'));
      var karma_span = document.createElement('span');
      karma_span.textContent = score;
      karma_span.id = 'my-karma';
      karma_span.title = 'Your karma';
      score_elem.appendChild(karma_span);

      user_links.appendChild(score_elem);
      pagetop.replaceChildren();
      user_links.insertBefore(user_drop, user_links.firstChild);
      pagetop.appendChild(user_links);
      // Re-append hidden user link for HACKERSMACKER compat
      pagetop.appendChild(user_profile);

      var hidden_div = document.createElement('div');
      hidden_div.id = 'user-hidden';
      hidden_div.classList.add('nav-drop-down');
      var user_pages = [ ['profile', '/user', 'Your profile and settings'],
                         ['comments', '/threads', 'Your comments and replies'],
                         ['submitted', '/submitted', "Stories you've submitted"],
                         ['upvoted', '/upvoted', "Stories you've voted for"],
                         ['favorites', '/favorites', "Stories you've favorited"]
                       ];
      var new_active = false;
      for (var i in user_pages) {
        var link_text = user_pages[i][0];
        var link_href = user_pages[i][1];
        var link_title = user_pages[i][2];
        var link = document.createElement('a');
        link.textContent = link_text;
        link.href = link_href + '?id=' + user_name;
        link.title = link_title;

        if (window.location.pathname == link_href) {
          new_active = link.cloneNode(true);
          new_active.classList.add('nav-active-link');
          new_active.classList.add('new-active-link');
        }

        hidden_div.appendChild(link);
      }
      if (new_active) {
        if (window.location.pathname != '/upvoted' || window.location.pathname != '/favorites') {
          var user_id = window.location.search.match(/id=(\w+)/)[1];
          if (user_id == user_name)
            user_id = 'Your';
          else
            user_id = user_id + "'s";
          new_active.textContent = user_id + " " + new_active.textContent;
        }
        var nav_links = document.querySelector('#top-navigation .nav-links');
        var active_span = document.createElement('span');
        active_span.appendChild(document.createTextNode('|'));
        active_span.appendChild(new_active);
        nav_links.appendChild(active_span);
      }

      logout.id = 'user-logout';
      logout.title = 'Logout';
      hidden_div.appendChild(logout);
      user_links.appendChild(hidden_div);

      var user_drop_toggle = function() {
        user_drop.querySelector('a').classList.toggle('active');
        hidden_div.style.display = hidden_div.style.display === 'none' ? 'block' : 'none';
      };
      user_drop.addEventListener('click', user_drop_toggle);
      hidden_div.addEventListener('click', user_drop_toggle);
      hidden_div.style.display = 'none';

      // HNES settings dropdown
      var hnes_drop = document.createElement('span');
      var hnes_drop_a = document.createElement('a');
      hnes_drop_a.textContent = 'HNES';
      hnes_drop_a.href = '#';
      hnes_drop.appendChild(hnes_drop_a);
      hnes_drop.title = 'HNES settings';
      hnes_drop.id = 'hnes-settings-link';
      hnes_drop.classList.add('more-arrow');

      var hnes_div = document.createElement('div');
      hnes_div.id = 'hnes-settings';
      hnes_div.classList.add('nav-drop-down');

      // GitHub stars toggle
      var ghToggle = document.createElement('a');
      ghToggle.href = '#';
      ghToggle.classList.add('hnes-gh-toggle');
      chrome.runtime.sendMessage(
        { method: 'getLocalStorage', key: 'hnes_show_github_stars' },
        function(response) {
          var enabled = !(response && response.data === 'false');
          ghToggle.textContent = enabled ? '\u2605 GitHub stars' : '\u2606 GitHub stars';
          if (!enabled) ghToggle.classList.add('hnes-gh-toggle-off');
          else ghToggle.classList.remove('hnes-gh-toggle-off');
        }
      );
      ghToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        chrome.runtime.sendMessage(
          { method: 'getLocalStorage', key: 'hnes_show_github_stars' },
          function(response) {
            var wasEnabled = !(response && response.data === 'false');
            var newVal = wasEnabled ? 'false' : 'true';
            chrome.runtime.sendMessage(
              { method: 'setLocalStorage', key: 'hnes_show_github_stars', value: newVal },
              function() {
                ghToggle.textContent = wasEnabled ? '\u2606 GitHub stars' : '\u2605 GitHub stars';
                if (wasEnabled) ghToggle.classList.add('hnes-gh-toggle-off');
                else ghToggle.classList.remove('hnes-gh-toggle-off');
                if (!wasEnabled) {
                  HN._fetchAndDisplayStars();
                } else {
                  document.querySelectorAll('.hnes-gh-stars').forEach(function(el) { el.remove(); });
                }
              }
            );
          }
        );
      });
      hnes_div.appendChild(ghToggle);

      var hnes_sep = document.createElement('span');
      hnes_sep.textContent = '|';
      var hnes_wrapper = document.createElement('span');
      hnes_wrapper.id = 'hnes-wrapper';
      hnes_wrapper.appendChild(hnes_drop);
      hnes_wrapper.appendChild(hnes_div);
      user_links.insertBefore(hnes_sep, user_links.firstChild);
      user_links.insertBefore(hnes_wrapper, user_links.firstChild);

      var hnes_toggle = function() {
        hnes_drop.querySelector('a').classList.toggle('active');
        hnes_div.style.display = hnes_div.style.display === 'none' ? 'block' : 'none';
      };
      hnes_drop.addEventListener('click', hnes_toggle);
      hnes_div.addEventListener('click', hnes_toggle);
      hnes_div.style.display = 'none';

      HN.setTopColor();
    },
    rewriteNavigation: function() {
        var topselElem = document.querySelector('.topsel');
        var navigation = document.querySelector('td:nth-child(2) .pagetop');
        if (!navigation) return;
        navigation.id = 'top-navigation';

        var visible_pages = [ ['top', '/news', 'Top stories'],
                              ['new', '/newest', 'Newest stories'],
                              ['best', '/best', 'Best stories'],
                              ['submit', '/submit', 'Submit a story'],
                            ];

        var hidden_pages = [ ['show', '/show', 'Show HN'],
                             ['shownew', '/shownew', 'New Show HN posts'],
                             ['classic', '/classic', 'Only count votes from accounts older than one year'],
                             ['active', '/active', 'Active stories'],
                             ['ask', '/ask', 'Ask Hacker News'],
                             ['jobs', '/jobs', 'Sponsored job postings'],
                             ['bestcomments', '/bestcomments', 'Best comments'],
                             ['newcomments', '/newcomments', 'New comments'],
                             ['noobstories', '/noobstories', 'Stories by new users'],
                             ['noobcomments', '/noobcomments', 'Comments by new users']
                           ];

        var topsel;
        if (!topselElem) {
          topsel = document.createElement('span');
          topsel.classList.add('nav-links');
          navigation.appendChild(topsel);
        }
        else {
          topsel = topselElem;
          topsel.classList.remove('topsel');
          topsel.classList.add('nav-links');
          topsel.replaceChildren();
        }
        for (var i in visible_pages) {
          var link_text = visible_pages[i][0];
          var link_href = visible_pages[i][1];

          var span = document.createElement('span');
          var new_link = document.createElement('a');
          new_link.href = link_href;
          new_link.textContent = link_text;
          new_link.classList.add(link_text);
          new_link.title = visible_pages[i][2];

          if (window.location.pathname == link_href)
            new_link.classList.add('nav-active-link');

          span.appendChild(new_link);
          span.appendChild(document.createTextNode('|'));
          topsel.appendChild(span);
        }
        if (window.location.pathname == '/') {
          var topLink = document.querySelector('.top');
          if (topLink) topLink.classList.add('nav-active-link');
        }

        var more_link = document.createElement('span');
        var more_link_a = document.createElement('a');
        more_link_a.textContent = 'more';
        more_link_a.href = '#';
        more_link.appendChild(more_link_a);
        more_link.title = 'Toggle more links';
        more_link.id = 'nav-more-link';
        more_link.classList.add('more-arrow');

        var hidden_div = document.createElement('div');
        hidden_div.id = 'nav-others';
        hidden_div.classList.add('nav-drop-down');

        var new_active = false;
        for (var i in hidden_pages) {
          var link_text = hidden_pages[i][0];
          var link_href = hidden_pages[i][1];

          var new_link = document.createElement('a');
          new_link.href = link_href;
          new_link.title = hidden_pages[i][2];
          new_link.textContent = link_text;
          new_link.classList.add(link_text);

          if (window.location.pathname == link_href) {
            new_active = new_link.cloneNode(true);
            new_active.classList.add('nav-active-link');
            new_active.classList.add('new-active-link');
          }

          hidden_div.appendChild(new_link);
        }

        topsel.appendChild(more_link);
        topsel.appendChild(hidden_div);

        if (new_active) {
          var active_span = document.createElement('span');
          active_span.appendChild(document.createTextNode('|'));
          active_span.appendChild(new_active);
          topsel.appendChild(active_span);
        }

        navigation.replaceChildren();
        navigation.appendChild(topsel);

        var toggle_more_link = function() {
          more_link.querySelector('a').classList.toggle('active');
          hidden_div.style.display = hidden_div.style.display === 'none' ? 'block' : 'none';
        };
        more_link.addEventListener('click', toggle_more_link);
        hidden_div.addEventListener('click', toggle_more_link);

        hidden_div.style.left = more_link.offsetLeft + 'px';
        hidden_div.style.display = 'none';
    },

    toggleMoreNavLinks: function(e) {
      var others = document.getElementById('nav-others');
      if (others) {
        others.style.display = others.style.display === 'none' ? 'block' : 'none';
      }
    },

    setTopColor: function(){
      var topcolor = document.getElementById("header").children[0].getAttribute("bgcolor");
      if(topcolor.toLowerCase() != '#ff6600') {
        document.getElementById('header').style.backgroundColor = topcolor;
        document.querySelectorAll('.nav-drop-down').forEach(function(el) {
          el.style.backgroundColor = topcolor;
        });
        // Inject a style rule for the hover state
        var styleId = 'hnes-topcolor-style';
        var existing = document.getElementById(styleId);
        if (existing) existing.remove();
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = '.nav-drop-down a:hover { background-color: ' + topcolor + ' !important; }';
        document.head.appendChild(style);
      }
    },

    setSearchInput: function(el, domain) {
      if (!el) return;
      var text = "Search on " + domain;
      el.value = text;
      el.addEventListener('focus', function(){
        HN.searchInputFocused = true;
        if (el.value == text) {
          el.value = "";
        }
      });
      el.addEventListener('blur', function(){
        HN.searchInputFocused = false;
        if (el.value == "") {
          el.value = text;
        }
      });
    },

    searchInputFocused: false,

    init_keys: function(){
        var j = 74, // Next Item
            k = 75, // Previous Item
            o = 79, // Open Story
            p = 80, // View Comments
            h = 72, // Open Help
            l = 76, // New tab
            c = 67, // Comments in new tab
            b = 66, // Open comments and link in new tab
            shiftKey = 16; // allow modifier
        document.addEventListener('keydown', function(e){
          //Keyboard shortcuts disabled when search focused
          if (!HN.searchInputFocused && !e.ctrlKey) {
            if (e.which == j) {
              HN.next_story();
            } else if (e.which == k) {
              HN.previous_story();
            } else if (e.which == l) {
              HN.open_story_in_new_tab();
            } else if (e.which == o) {
              HN.open_story_in_current_tab();
            } else if (e.which == p) {
              HN.open_comments_in_current_tab();
            } else if (e.which == c) {
              HN.open_comments_in_new_tab();
            } else if (e.which == h) {
              //HN.open_help();
            } else if (e.which == b) {
              HN.open_comments_in_new_tab();
              HN.open_story_in_new_tab();
            }
          }
        })
    },

    open_story_in_current_tab: function() {
      HN.open_story(false);
    },
    open_story_in_new_tab: function() {
      HN.open_story(true);
    },
    open_comments_in_current_tab: function() {
      HN.view_comments(false);
    },
    open_comments_in_new_tab: function() {
      HN.view_comments(true);
    },

    next_story: function() {
      HN.next_or_prev_story(true);
    },
    previous_story: function() {
      HN.next_or_prev_story(false);
    },

    next_or_prev_story: function(next){
      if (!document.querySelector('.on_story')) {
        if (next)
          document.querySelector('#content tr').classList.add("on_story");
      } else {
        var current = document.querySelector('.on_story');
        var next_lem;
        if (next)
          next_lem = current.nextElementSibling;
        else
          next_lem = current.previousElementSibling;
        if (next_lem) {
          next_lem.classList.add("on_story");
          window.scrollTo({ top: next_lem.getBoundingClientRect().top + window.scrollY - 10, behavior: 'smooth' });
          current.classList.remove("on_story");
        }
      }
    },

    open_story: function(new_tab){
      var onStory = document.querySelector('.on_story');
      if (onStory) {
        var story = onStory.querySelector('.title .titleline > a');
        if (new_tab) {
          onStory.querySelector('.title').classList.add("link-highlight");
          window.open(story.href);
        }
        else
          window.location = story.href;
      }
    },

    view_comments: function(new_tab){
      var onStory = document.querySelector('.on_story');
      if (onStory) {
        var comments = onStory.querySelector('.comments');
        if (comments) {
          if (new_tab)
            window.open(comments.href);
          else
            window.location = comments.href;
        }
      }
    },

    getAndRateStories: function() {
      var NO_HEAT = 50;
      var MILD    = 75;
      var MEDIUM  = 99;
      document.querySelectorAll('.score').forEach(function(el){
        var score = el.innerHTML;

        score = score.replace(/[a-z]/g, '');

        if (score < NO_HEAT) {
          el.classList.add('no-heat');
        } else if (score < MILD) {
          el.classList.add('mild');
        } else if (score < MEDIUM) {
          el.classList.add('medium');
        } else {
          el.classList.add('hot');
        };
      });
    },

    enableLinkHighlighting: function() {
      document.querySelectorAll('.title a:link').forEach(function(a) {
        a.addEventListener('click', function() {
          this.closest('td').classList.add('link-highlight');
        });
      });
    }
}


//show new comment count on hckrnews.com
if (window.location.host == "hckrnews.com") {
  document.querySelectorAll('ul.entries li').forEach(function(li) {
    var liId = li.getAttribute('id');
    chrome.runtime.sendMessage(
      {method: "getLocalStorage", key: Number(liId)},
      function(response) {
        if (response.data != undefined) {
          var data = JSON.parse(response.data);
          var id = data.id;
          var num = data.num ? data.num : 0;
          var el = document.getElementById(String(id));
          if (!el) return;
          var commentsLink = el.querySelector('.comments');
          if (!commentsLink) return;
          var now = Number(commentsLink.textContent);
          var unread = Math.max(now - num, 0);
          var prepend = unread == 0
            ? "" + unread + " / "
            : "<span>" + unread + "</span> / ";
          commentsLink.insertAdjacentHTML('afterbegin', prepend);
        }
      }
    );
  });
}
else {
  HN.init();

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(function(){
    if ("Unknown or expired link." == document.body.innerHTML) {
      HN.setLocalStorage('expired', true);
      window.location.replace("/");
      return;
    }
    else {
      HN.getLocalStorage('expired', function(response) {
        if (response.data != undefined) {
          var expired = JSON.parse(response.data);
          if (expired) {
            var alertP = document.createElement('p');
            alertP.id = 'alert';
            alertP.innerHTML =
              'You reached an <a href="//news.ycombinator.com/' +
              'item?id=17705" title="what?">expired page</a>' +
              ' and have been redirected back to the front page.';
            var header = document.getElementById('header');
            if (header) header.after(alertP);
            HN.setLocalStorage('expired', false);
          }
        }
      });
    }

    if (window.location.pathname == "/x") {
      HN.getLocalStorage('update_profile', function(response) {
        if (response.data != undefined && response.data != "false") {
          HN.setLocalStorage('update_profile', false);
          window.location.replace(response.data);
        }
      });
    }

    document.body.style.visibility = 'visible';
  });
}
