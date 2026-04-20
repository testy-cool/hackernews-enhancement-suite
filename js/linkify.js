/**
 * Vanilla JS replacement for jQuery linkify plugin.
 * Walks text nodes in a container and converts URLs to links.
 */
function linkifyElement(container) {
  var noProtocolUrl =
    /(^|[\s(])(www\..+?\..+?)([.,;!?:)]*(?=\s|$))/g;
  var httpOrMailtoUrl =
    /(^|[\s(])((?:https?:\/\/|mailto:)\S+?)([.,;!?:)]*(?=\s|$))/g;

  var walker = document.createTreeWalker(
    container, NodeFilter.SHOW_TEXT, null
  );
  var textNodes = [];
  var node;
  while ((node = walker.nextNode())) {
    if (node.parentElement &&
        /^(a|button|textarea|script|style)$/i.test(
          node.parentElement.tagName)) {
      continue;
    }
    if (node.nodeValue.length > 1 && /\S/.test(node.nodeValue)) {
      textNodes.push(node);
    }
  }

  for (var i = 0; i < textNodes.length; i++) {
    var tn = textNodes[i];
    var html = tn.nodeValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    var replaced = html
      .replace(noProtocolUrl, '$1<a href="http://$2">$2</a>$3')
      .replace(httpOrMailtoUrl, '$1<a href="$2">$2</a>$3');

    if (replaced !== html) {
      var span = document.createElement('span');
      span.innerHTML = replaced;
      while (span.firstChild) {
        tn.parentNode.insertBefore(span.firstChild, tn);
      }
      tn.remove();
    }
  }
}
