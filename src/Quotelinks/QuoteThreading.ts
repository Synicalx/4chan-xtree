import Callbacks from "../classes/Callbacks";
import type Post from "../classes/Post";
import type { PostClone } from "../classes/Post";
import RandomAccessList from "../classes/RandomAccessList";
import type Thread from "../classes/Thread";
import PostHiding from "../Filtering/PostHiding";
import Header from "../General/Header";
import { Conf, d, doc, g } from "../globals/globals";
import Main from "../main/Main";
import ReplyPruning from "../Monitoring/ReplyPruning";
import Unread from "../Monitoring/Unread";
import $ from "../platform/$";
import { dict } from "../platform/helpers";

/*
  <3 aeosynth
*/

const MAX_CLONES_PER_POST = 10;

var QuoteThreading = {
  init() {
    if (!Conf['Quote Threading'] || (g.VIEW !== 'thread')) { return; }

    doc.classList.toggle('thread-quotes', !!Conf['Thread Quotes']);

    this.controls = $.el('label',
      {innerHTML: "<input id=\"threadingControl\" name=\"Thread Quotes\" type=\"checkbox\"> Threading"});

    this.threadNewLink = $.el('span', {
      className: 'brackets-wrap threadnewlink',
      hidden: true
    }
    );
    $.extend(this.threadNewLink, {innerHTML: "<a href=\"javascript:;\">Thread New Posts</a>"});

    this.input = $('input', this.controls);
    this.input.checked = Conf['Thread Quotes'];

    $.on(this.input, 'change', this.setEnabled);
    $.on(this.input, 'change', this.rethread);
    $.on(this.threadNewLink.firstElementChild, 'click', this.rethread);
    $.on(d, '4chanXInitFinished', () => { this.ready = true; });

    Header.menu.addEntry(this.entry = {
      el:    this.controls,
      order: 99
    }
    );

    Callbacks.Thread.push({
      name: 'Quote Threading',
      cb:   this.setThread
    });

    Callbacks.Post.push({
      name: 'Quote Threading',
      cb:   this.node
    });
  },

  controls:      undefined as HTMLLabelElement | undefined,
  threadNewLink: undefined as HTMLSpanElement | undefined,
  input:         undefined as HTMLInputElement | undefined,
  entry:         undefined as any,
  ready:         false,
  thread:        undefined as Thread | undefined,
  parent:        dict() as Record<string, Post>,
  parents:       dict() as Record<string, Post[]>,
  children:      dict() as Record<string, Post[]>,
  clonesByPost:  dict() as Record<string, PostClone[]>,
  treeClones:    [] as PostClone[],
  inserted:      dict() as Record<string, boolean>,

  toggleThreading() {
    this.setThreadingState(!Conf['Thread Quotes']);
  },

  setThreadingState(enabled) {
    this.input.checked = enabled;
    this.setEnabled.call(this.input);
    this.rethread.call(this.input);
  },

  setEnabled() {
    if (this.checked) {
      $.set('Prune All Threads', false);
      const other = ReplyPruning.inputs?.enabled;
      if (other?.checked) {
        other.checked = false;
        $.event('change', null, other);
      }
    }
    $.cb.checked.call(this);
  },

  setThread() {
    QuoteThreading.thread = this;
    $.asap((() => !Conf['Thread Updater'] || $('.navLinksBot > .updatelink')), function() {
      let navLinksBot;
      if (navLinksBot = $('.navLinksBot')) { $.add(navLinksBot, [$.tn(' '), QuoteThreading.threadNewLink]); }
    });
  },

  node(this: Post) {
    if (this.isFetchedQuote || this.isClone || !this.isReply) { return; }

    const parentMap = new Map<number, Post>();
    for (var quote of this.quotes) {
      const parent = g.posts.get(quote);
      if (parent && !parent.isFetchedQuote && parent.isReply && (parent.ID < this.ID)) {
        parentMap.set(parent.ID, parent);
      }
    }

    if (!parentMap.size) return;

    const sortedParents = [...parentMap.values()].sort((a, b) => a.ID - b.ID);

    // Prune any quoted post that is already an ancestor of another quoted post in this set.
    const ancestorIDs = new Set<number>();
    const visited = new Set<string>();
    for (const p of sortedParents) {
      const stack = [...(QuoteThreading.parents[p.fullID] || [])];
      while (stack.length) {
        const anc = stack.pop()!;
        if (visited.has(anc.fullID)) continue;
        visited.add(anc.fullID);
        ancestorIDs.add(anc.ID);
        if (QuoteThreading.parents[anc.fullID]) {
          stack.push(...QuoteThreading.parents[anc.fullID]);
        }
      }
    }

    const branchParents = sortedParents.filter(p => !ancestorIDs.has(p.ID));
    if (!branchParents.length) return;

    QuoteThreading.parents[this.fullID] = branchParents;
    QuoteThreading.parent[this.fullID]  = branchParents[branchParents.length - 1];
  },

  descendants(post: Post): Post[] {
    let children;
    let posts = [post];
    if (children = (post.treeChildren || QuoteThreading.children[post.fullID])) {
      for (var child of children) {
        posts = posts.concat(QuoteThreading.descendants(child));
      }
    }
    return posts;
  },

  getDescendantCount(post: Post): number {
    const children = post.treeChildren || (!post.isClone ? QuoteThreading.children[post.fullID] : undefined);
    if (!children || !children.length) return 0;
    let count = 0;
    for (const child of children) {
      count += 1 + QuoteThreading.getDescendantCount(child);
    }
    return count;
  },

  updateStubCount(post: Post) {
    const stub = post.nodes.stub;
    if (!stub) return;
    const a = $('a.show-reply-button', stub);
    if (!a) return;

    let idSpan = $('.stub-id', a);
    if (Conf['Quote Threading'] && Conf['Thread Quotes']) {
      if (!idSpan) {
        idSpan = $.el('span', { className: 'stub-id', textContent: ` No.${post.ID}` });
        const nameSpan = $('.stub-name', a);
        if (nameSpan) {
          $.after(nameSpan, idSpan);
        } else {
          $.add(a, idSpan);
        }
      }
      const count = QuoteThreading.getDescendantCount(post);
      let repliesSpan = $('.stub-replies', a);
      if (count > 0) {
        const text = `(+${count} repl${count === 1 ? 'y' : 'ies'})`;
        if (!repliesSpan) {
          repliesSpan = $.el('span', { className: 'stub-replies', textContent: text });
          const reasonsSpan = $('.stub-reasons', a);
          if (reasonsSpan) {
            $.before(reasonsSpan, repliesSpan);
          } else {
            $.add(a, repliesSpan);
          }
        } else {
          repliesSpan.textContent = text;
        }
      } else if (repliesSpan) {
        $.rm(repliesSpan);
      }
    } else {
      if (idSpan) $.rm(idSpan);
      const repliesSpan = $('.stub-replies', a);
      if (repliesSpan) $.rm(repliesSpan);
    }
  },

  collapseFromBranch(post: Post) {
    if (!post.isHidden) {
      PostHiding.hide(post, true, false, 'Hidden manually');
      if (!post.isClone) {
        PostHiding.saveHiddenState(post, true, true, true, false);
      }
    }
    if (post.nodes.root.getBoundingClientRect().top < 0) {
      Header.scrollToIfNeeded(post.nodes.root, false);
    }
  },

  createTreeClone(post: Post): PostClone {
    const origin = (post as PostClone).origin || post;
    const clone = origin.addClone(origin, false);
    clone.isTreeClone = true;
    $.addClass(clone.nodes.root, 'treeClone');
    Main.callbackNodes('Post', [clone]);
    const list = QuoteThreading.clonesByPost[origin.fullID] || (QuoteThreading.clonesByPost[origin.fullID] = []);
    list.push(clone);
    QuoteThreading.treeClones.push(clone);
    return clone;
  },

  cloneSubtree(source: Post, targetParent: Post) {
    const children = source.treeChildren;
    if (!children || !children.length) return;
    for (const child of children) {
      const originChild = (child as PostClone).origin || child;
      const existingClones = QuoteThreading.clonesByPost[originChild.fullID] || [];
      if (existingClones.length >= MAX_CLONES_PER_POST) continue;
      const childClone = QuoteThreading.createTreeClone(originChild);
      QuoteThreading.insertIntoContainer(childClone, targetParent, false);
      QuoteThreading.cloneSubtree(child, childClone);
    }
  },

  insertIntoContainer(childInstance: Post, parentInstance: Post, isPrimary: boolean) {
    let x;
    const children = parentInstance.treeChildren || (parentInstance.treeChildren = []);
    if (isPrimary && !parentInstance.isClone) {
      QuoteThreading.children[parentInstance.fullID] = children;
    }
    childInstance.treeParent = parentInstance;

    let threadContainer = parentInstance.nodes.threadContainer;
    if (!threadContainer) {
      threadContainer = $.el('div', { className: 'threadContainer' });
      const branchLink = $.el('a', {
        className: 'threadBranchLink',
        href: 'javascript:;',
        title: 'Collapse branch'
      });
      $.on(branchLink, 'click', (e) => {
        e.preventDefault();
        QuoteThreading.collapseFromBranch(parentInstance);
      });
      $.add(threadContainer, branchLink);
    }

    const nodes = [childInstance.nodes.root];
    if (childInstance.nodes.threadContainer) { nodes.push(childInstance.nodes.threadContainer); }

    let i = children.length;
    for (let j = children.length - 1; j >= 0; j--) {
      const child = children[j];
      if (child.ID >= childInstance.ID) { i--; }
    }

    if (i !== children.length) {
      const next = children[i];
      if (isPrimary) {
        const { order } = Unread;
        const descendants = QuoteThreading.descendants(childInstance);
        for (x of descendants) {
          if (order[next.ID] && order[x.ID]) {
            order.before(order[next.ID], order[x.ID]);
          }
        }
      }
      children.splice(i, 0, childInstance);
      $.before(next.nodes.root, nodes);
    } else {
      if (isPrimary) {
        const { order } = Unread;
        const descendants = QuoteThreading.descendants(childInstance);
        let prev2;
        let prev = parentInstance;
        while ((prev2 = prev.treeChildren || QuoteThreading.children[prev.fullID]) && prev2.length) {
          prev = prev2[prev2.length - 1];
        }
        for (let k = descendants.length - 1; k >= 0; k--) {
          x = descendants[k];
          if (order[prev.ID] && order[x.ID]) {
            order.after(order[prev.ID], order[x.ID]);
          }
        }
      }
      children.push(childInstance);
      $.add(threadContainer, nodes);
    }

    if (!parentInstance.nodes.threadContainer) {
      parentInstance.nodes.threadContainer = threadContainer;
      $.addClass(parentInstance.nodes.root, 'threadOP');
      if (parentInstance.isHidden) {
        threadContainer.hidden = true;
      }
      $.after(parentInstance.nodes.root, threadContainer);
    }

    let anc: Post | undefined = parentInstance;
    while (anc) {
      if (anc.isHidden && anc.nodes.stub) {
        QuoteThreading.updateStubCount(anc);
      }
      anc = anc.treeParent;
    }
  },

  insert(post: Post, force = false) {
    let parent: Post;
    if (!(
      Conf['Thread Quotes'] &&
      (parent = QuoteThreading.parent[post.fullID]) &&
      !QuoteThreading.inserted[post.fullID]
    )) { return false; }

    const descendants = QuoteThreading.descendants(post);
    if (!force && QuoteThreading.ready && !Unread.posts.has(parent.ID)) {
      if ((function() { for (var x of descendants) { if (Unread.posts.has(x.ID)) { return true; } } })()) {
        QuoteThreading.threadNewLink.hidden = false;
        return false;
      }
    }

    QuoteThreading.insertIntoContainer(post, parent, true);

    // Gather additional parent instances (clones of primary parent, plus secondary parents and their clones)
    const extraParentInstances: Post[] = [];
    const primaryClones = QuoteThreading.clonesByPost[parent.fullID];
    if (primaryClones?.length) {
      extraParentInstances.push(...primaryClones);
    }
    const allParents = QuoteThreading.parents[post.fullID] || [parent];
    for (const secParent of allParents) {
      if (secParent === parent) continue;
      if (QuoteThreading.inserted[secParent.fullID] || !QuoteThreading.parent[secParent.fullID]) {
        extraParentInstances.push(secParent);
      }
      const secClones = QuoteThreading.clonesByPost[secParent.fullID];
      if (secClones?.length) {
        extraParentInstances.push(...secClones);
      }
    }

    for (const targetParent of extraParentInstances) {
      const existingClones = QuoteThreading.clonesByPost[post.fullID] || [];
      if (existingClones.length >= MAX_CLONES_PER_POST) break;
      const clone = QuoteThreading.createTreeClone(post);
      QuoteThreading.insertIntoContainer(clone, targetParent, false);
      QuoteThreading.cloneSubtree(post, clone);
    }

    QuoteThreading.inserted[post.fullID] = true;
    return true;
  },

  rethread() {
    if (!QuoteThreading.ready) { return; }
    const {thread} = QuoteThreading;
    const {posts} = thread;

    doc.classList.toggle('thread-quotes', !!Conf['Thread Quotes']);
    QuoteThreading.threadNewLink.hidden = true;

    if (Conf['Thread Quotes']) {
      posts.forEach(post => {
        QuoteThreading.insert(post, true);
        if (post.isHidden) {
          if (post.nodes.threadContainer) {
            post.nodes.threadContainer.hidden = true;
          }
          QuoteThreading.updateStubCount(post);
        }
      });
    } else {
      for (const clone of QuoteThreading.treeClones) {
        if (clone.nodes.threadContainer) {
          $.rm(clone.nodes.threadContainer);
          delete clone.nodes.threadContainer;
        }
        $.rm(clone.nodes.root);
        const idx = clone.origin.clones.indexOf(clone);
        if (idx !== -1) {
          clone.origin.rmClone(idx);
        }
      }
      QuoteThreading.treeClones = [];
      QuoteThreading.clonesByPost = dict();

      const nodes = [];
      Unread.order = new RandomAccessList();
      QuoteThreading.inserted = dict();
      posts.forEach(function(post) {
        if (post.isFetchedQuote) { return; }
        Unread.order.push(post);
        if (post.isReply) { nodes.push(post.nodes.root); }
        delete post.treeChildren;
        delete post.treeParent;
        if (QuoteThreading.children[post.fullID]) {
          delete QuoteThreading.children[post.fullID];
        }
        if (post.nodes.threadContainer) {
          $.rmClass(post.nodes.root, 'threadOP');
          $.rm(post.nodes.threadContainer);
          delete post.nodes.threadContainer;
        }
        if (post.isHidden && post.nodes.stub) {
          QuoteThreading.updateStubCount(post);
        }
      });
      $.add(thread.nodes.root, nodes);
    }

    Unread.position = Unread.order.first;
    Unread.updatePosition();
    Unread.setLine(true);
    Unread.read();
    Unread.update();
  },
};
export default QuoteThreading;
